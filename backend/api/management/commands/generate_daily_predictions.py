# backend/api/management/commands/generate_daily_predictions.py

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from api.models import Stock, Prediction # Import your models

import pandas as pd
import numpy as np
import datetime
import joblib # For loading the ML model

# --- Data Acquisition Libraries ---
from nselib import hist_data # Using nselib directly for bulk data

# --- Feature Engineering Library ---
import pandas_ta as ta # pip install pandas_ta

# --- Configuration for Prediction ---
# These should ideally match the parameters used when you trained your model
PREDICTION_HORIZON_DAYS = 1 # Predict 1 day ahead (tomorrow's movement)
UP_THRESHOLD = 0.005 # Define what constitutes an "UP" movement (e.g., > 0.5% gain)
LOOKBACK_DAYS_FOR_FEATURES = 250 # Minimum historical days needed to calculate all indicators

TRAINED_MODEL_FILE = "stock_prediction_model.joblib" # Path to your trained model file
# IMPORTANT: Adjust this path if your model file is not in the same directory as manage.py
# e.g., os.path.join(settings.BASE_DIR, 'stock_prediction_model.joblib') if it's in project root
# For simplicity, let's assume it's in the project root for now.

# --- Feature Engineering Function (copied from stock_predictor.py) ---
def create_features_for_prediction(df_stock):
    """
    Calculates technical indicators and lagged features for a single stock DataFrame.
    Assumes df_stock has 'open', 'high', 'low', 'close', 'volume' columns and 'Date' as index.
    This function should be identical to the one used during model training.
    """
    if df_stock is None or df_stock.empty:
        return None

    df = df_stock.copy()
    
    # Ensure correct column names for pandas_ta
    df.rename(columns={'OPEN': 'open', 'HIGH': 'high', 'LOW': 'low', 'CLOSE': 'close', 'VOLUME': 'volume'}, inplace=True)

    # Momentum Indicators
    df.ta.rsi(append=True, length=14)
    df.ta.macd(append=True, fast=12, slow=26, signal=9)
    df.ta.stoch(append=True, k=14, d=3)

    # Trend Indicators
    df.ta.sma(length=20, append=True)
    df.ta.sma(length=50, append=True)
    df.ta.sma(length=200, append=True)
    df.ta.ema(length=20, append=True)
    df.ta.ema(length=50, append=True)

    # Volatility Indicators
    df.ta.bbands(append=True, length=20, std=2)
    df.ta.atr(append=True, length=14)

    # Volume Indicators
    df.ta.ad(append=True)
    df.ta.obv(append=True)

    # Lagged Price Features (Example: 1, 3, 5 days ago close)
    for lag in [1, 3, 5]:
        df[f'Close_lag{lag}'] = df['close'].shift(lag)
        df[f'Volume_lag{lag}'] = df['volume'].shift(lag)

    # Daily Returns
    df['Daily_Return'] = df['close'].pct_change()
    for lag in [1, 2]:
        df[f'Daily_Return_lag{lag}'] = df['Daily_Return'].shift(lag)

    # Volatility (e.g., 10-day rolling standard deviation of returns)
    df['Volatility_10d'] = df['Daily_Return'].rolling(window=10).std()

    # Calendar Features
    df['DayOfWeek'] = df.index.dayofweek
    df['DayOfMonth'] = df.index.day
    df['Month'] = df.index.month
    df['Year'] = df.index.year

    # Drop original OHLCV if pandas_ta created lowercase versions (to avoid duplicates)
    df.drop(columns=['open', 'high', 'low', 'close', 'volume'], errors='ignore', inplace=True)
    df.rename(columns={'OPEN': 'Open', 'HIGH': 'High', 'LOW': 'Low', 'CLOSE': 'Close', 'VOLUME': 'Volume'}, inplace=True)

    # Drop rows with NaN values that result from indicator calculations
    df.dropna(inplace=True)
    
    return df

class Command(BaseCommand):
    help = 'Generates and stores daily stock predictions using a pre-trained ML model.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting daily stock prediction generation..."))

        # --- 1. Load the Trained ML Model ---
        try:
            loaded_model = joblib.load(TRAINED_MODEL_FILE)
            self.stdout.write(f"Successfully loaded ML model from {TRAINED_MODEL_FILE}")
        except FileNotFoundError:
            raise CommandError(f"Error: Trained model file not found at {TRAINED_MODEL_FILE}. Please ensure the model is trained and saved correctly.")
        except Exception as e:
            raise CommandError(f"Error loading ML model: {e}")

        # Get the expected feature names from the trained model (crucial for prediction)
        # This assumes your model was trained with a DataFrame, so it has feature_names_in_
        if not hasattr(loaded_model, 'feature_names_in_'):
            raise CommandError("Trained model does not have 'feature_names_in_'. Ensure it was trained with a Pandas DataFrame.")
        model_feature_columns = loaded_model.feature_names_in_

        # --- 2. Get the list of all active stocks from your Django database ---
        try:
            all_stocks = Stock.objects.all()
            target_symbols = [stock.security_id for stock in all_stocks]
            self.stdout.write(f"Fetched {len(target_symbols)} stock symbols from database.")
        except Exception as e:
            raise CommandError(f"Error fetching stock symbols from database: {e}")

        # --- 3. Define Dates for Prediction ---
        today_date = datetime.date.today()
        prediction_date = today_date + datetime.timedelta(days=PREDICTION_HORIZON_DAYS) # Predict for tomorrow

        # Check if a prediction for tomorrow already exists to avoid duplicates
        existing_predictions_count = Prediction.objects.filter(prediction_date=prediction_date).count()
        if existing_predictions_count > 0:
            self.stdout.write(self.style.WARNING(f"Predictions for {prediction_date} already exist ({existing_predictions_count} records). Skipping generation."))
            return

        # --- 4. Loop through stocks, fetch latest data, prepare features, and predict ---
        predictions_to_save = []
        
        # Use ThreadPoolExecutor for parallel data fetching and feature preparation
        MAX_WORKERS_DAILY_FETCH = 5 # Adjust based on nselib rate limits and your network
        
        with ThreadPoolExecutor(max_workers=MAX_WORKERS_DAILY_FETCH) as executor:
            future_to_symbol = {}
            for stock_obj in all_stocks: # Iterate over stock objects to easily get `stock` FK
                # Fetch enough historical data to calculate all indicators for the latest day
                # We need data up to today_date, going back LOOKBACK_DAYS_FOR_FEATURES + buffer
                fetch_start_date = (today_date - datetime.timedelta(days=LOOKBACK_DAYS_FOR_FEATURES + 50)).strftime('%d-%m-%Y')
                fetch_end_date = today_date.strftime('%d-%m-%Y')
                
                future = executor.submit(hist_data.get_hist_data, stock_obj.security_id, fetch_start_date, fetch_end_date)
                future_to_symbol[future] = stock_obj

            for future in as_completed(future_to_symbol):
                stock_obj = future_to_symbol[future]
                symbol = stock_obj.security_id
                
                try:
                    df_raw_recent = future.result()
                    
                    if df_raw_recent is not None and not df_raw_recent.empty:
                        df_raw_recent['Symbol'] = symbol # Add symbol column for consistency
                        df_raw_recent.reset_index(inplace=True)
                        df_raw_recent.rename(columns={'index': 'Date'}, inplace=True)
                        df_raw_recent['Date'] = pd.to_datetime(df_raw_recent['Date'])
                        df_raw_recent.set_index('Date', inplace=True)
                        df_raw_recent.sort_index(inplace=True)

                        df_features_for_pred = create_features_for_prediction(df_raw_recent)
                        
                        if df_features_for_pred is not None and not df_features_for_pred.empty:
                            # Get the features for the very last available date (today's features)
                            latest_features_row = df_features_for_pred.iloc[[-1]]
                            
                            # Ensure column order matches training data's feature columns
                            # This is crucial for the model to work correctly
                            X_predict = latest_features_row[model_feature_columns]

                            # Make prediction
                            prediction_proba = loaded_model.predict_proba(X_predict)[:, 1][0]
                            predicted_class = loaded_model.predict(X_predict)[0]
                            
                            action = "UP" if predicted_class == 1 else "DOWN/FLAT"
                            
                            predictions_to_save.append(
                                Prediction(
                                    stock=stock_obj,
                                    prediction_date=prediction_date,
                                    predicted_movement=action,
                                    probability_up=prediction_proba,
                                    source_date=today_date
                                )
                            )
                            self.stdout.write(f"  Prepared prediction for {symbol}: {action} (Prob: {prediction_proba:.2f})")
                        else:
                            self.stdout.write(f"  Skipping {symbol}: Could not generate sufficient features for prediction on {today_date}.")
                    else:
                        self.stdout.write(f"  Skipping {symbol}: No raw data fetched for {today_date}.")
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"  Error processing {symbol} for prediction: {exc}"))

        # --- 5. Save Predictions to Database in a single transaction ---
        if predictions_to_save:
            try:
                with transaction.atomic():
                    # Use bulk_create for efficiency
                    Prediction.objects.bulk_create(predictions_to_save, ignore_conflicts=True)
                self.stdout.write(self.style.SUCCESS(f"\nSuccessfully saved {len(predictions_to_save)} predictions for {prediction_date}."))
            except Exception as e:
                raise CommandError(f"Error saving predictions to database: {e}")
        else:
            self.stdout.write(self.style.WARNING("\nNo predictions generated to save."))
