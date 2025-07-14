import pandas as pd
import numpy as np
import datetime
import requests
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import argparse # For command-line arguments

# --- Data Acquisition Libraries ---
import yfinance as yf

# --- Feature Engineering Library ---
import pandas_ta as ta

# --- Machine Learning Libraries ---
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier # <--- Reverted to XGBClassifier
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score # <--- Reverted to classification metrics
import joblib


# --- Configuration (can be moved to a separate config.py if needed) ---
class Config:
    # --- File Paths ---
    BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # Directory of this script
    LOCAL_CACHE_DIR_DAILY = os.path.join(BASE_DIR, "raw_data_cache", "daily")
    LOCAL_CACHE_DIR_INTRADAY = os.path.join(BASE_DIR, "raw_data_cache", "intraday")
    PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "processed_data")
    MODELS_DIR = os.path.join(BASE_DIR, "models")
    PREDICTIONS_DIR = os.path.join(BASE_DIR, "predictions")

    PROCESSED_DATA_FILE = os.path.join(PROCESSED_DATA_DIR, "processed_stock_features_with_target.parquet")
    TRAINED_MODEL_FILE = os.path.join(MODELS_DIR, "stock_prediction_model.joblib")

    # --- Data Collection Parameters ---
    START_DATE_HISTORICAL_DAILY = "2015-01-01" # For long-term training data
    END_DATE_HISTORICAL_DAILY = datetime.date.today().strftime('%Y-%m-%d')

    # Intraday data from yfinance is limited, e.g., '60d' for '1m' interval
    # Use a period that yfinance supports for the chosen interval
    INTRADAY_PERIOD = "60d" # Max period for '1m' interval
    INTRADAY_INTERVAL = "15m" # Example: '1m', '5m', '15m', '60m'

    # --- Stock Universe ---
    TARGET_STOCKS = ['TATAMOTORS']

    # --- ML Model Parameters ---
    PREDICTION_HORIZON_DAYS = 1 # Predict 1 day ahead (tomorrow's movement)
    UP_THRESHOLD = 0.005 # Define what constitutes an "UP" movement (e.g., > 0.5% gain)
    CLASSIFICATION_TARGET_COLUMN = 'Target' # <--- Reverted: Target for classification

    # Minimum historical bars needed to calculate all indicators.
    LOOKBACK_BARS_FOR_FEATURES = 200 

    TRAIN_END_DATE = pd.to_datetime("2024-01-01") # Example: Train on data before 2024

    # --- Concurrency ---
    MAX_WORKERS = 1 # Keep at 1 for maximum reliability with free APIs
    API_CALL_DELAY_SECONDS = 5.0 # Delay between yfinance calls

class StockPredictor:
    def __init__(self, config: Config):
        self.config = config
        self._create_directories()
        self.model = None

    def _create_directories(self):
        """Ensures all necessary directories exist."""
        os.makedirs(self.config.LOCAL_CACHE_DIR_DAILY, exist_ok=True)
        os.makedirs(self.config.LOCAL_CACHE_DIR_INTRADAY, exist_ok=True)
        os.makedirs(self.config.PROCESSED_DATA_DIR, exist_ok=True)
        os.makedirs(self.config.MODELS_DIR, exist_ok=True)
        os.makedirs(self.config.PREDICTIONS_DIR, exist_ok=True)
        print("All necessary directories ensured.")

    def _fetch_data_from_yfinance(self, symbol, period=None, interval="1d", start=None, end=None):
        """
        Fetches historical data for a single symbol using yfinance.
        Handles MultiIndex columns, standardizes to lowercase, and validates OHLCV presence.
        Uses period/interval for intraday, or start/end for daily.
        """
        yf_symbols = [f"{symbol}.NS", f"{symbol}.BO"]
        
        for yf_symbol in yf_symbols:
            try:
                # Use period and interval for intraday, or start/end for daily
                if period and interval != "1d":
                    df = yf.download(yf_symbol, period=period, interval=interval, progress=False, auto_adjust=True)
                else:
                    df = yf.download(yf_symbol, start=start, end=end, progress=False, auto_adjust=True)

                time.sleep(self.config.API_CALL_DELAY_SECONDS) # Polite delay

                if df is not None and not df.empty:
                    # Flatten MultiIndex if present (common with multiple tickers or specific yfinance versions)
                    if isinstance(df.columns, pd.MultiIndex):
                        # Assuming the structure is (Column, Ticker), take the first level (Column)
                        # and convert to lowercase. This handles cases like ('Close', 'RELIANCE.NS')
                        df.columns = [col[0].lower() for col in df.columns]
                    else:
                        # Single-level columns: rename directly to lowercase
                        df.columns = [col.lower() for col in df.columns]

                    # Standardize column names (yfinance usually returns lowercase already, but good to ensure)
                    rename_dict = {
                        'adj close': 'adj_close', # yfinance might return this
                        'open': 'open',
                        'high': 'high',
                        'low': 'low',
                        'close': 'close',
                        'volume': 'volume'
                    }
                    df.rename(columns=rename_dict, inplace=True)

                    # Drop adj_close if you don't use it
                    if 'adj_close' in df.columns:
                        df.drop(columns=['adj_close'], inplace=True)

                    # Validate required OHLCV columns
                    ohlcv_cols = ['open', 'high', 'low', 'close', 'volume']
                    missing_cols = [col for col in ohlcv_cols if col not in df.columns]
                    if missing_cols:
                        print(f"❌ Missing columns {missing_cols} for {yf_symbol}. Skipping this symbol.")
                        continue # Try next yf_symbol or return None

                    df['Symbol'] = symbol # Original symbol without .NS/.BO
                    df.index = pd.to_datetime(df.index)
                    df.sort_index(inplace=True)

                    return df

            except Exception as e:
                print(f"❌ Error fetching {yf_symbol} from yfinance: {e}")
                continue # Try next yf_symbol

        print(f"❌ No data found for {symbol} from yfinance (both .NS and .BO failed).")
        return None

    def _load_or_fetch_cached_data(self, symbol, data_type="daily"):
        """
        Attempts to load historical data from a local CSV/Parquet cache first.
        If not found or outdated, falls back to yfinance.
        """
        cache_dir = self.config.LOCAL_CACHE_DIR_DAILY if data_type == "daily" else self.config.LOCAL_CACHE_DIR_INTRADAY
        cache_file_ns = os.path.join(cache_dir, f"{symbol}.NS.parquet") # Using Parquet for efficiency
        cache_file_bo = os.path.join(cache_dir, f"{symbol}.BO.parquet")

        # Try loading from cache
        for cache_path in [cache_file_ns, cache_file_bo]:
            if os.path.exists(cache_path):
                try:
                    df = pd.read_parquet(cache_path)
                    if not df.empty:
                        df.index = pd.to_datetime(df.index) # Ensure datetime index
                        df.sort_index(inplace=True)
                        print(f"✅ Loaded {len(df)} rows for {symbol} from local {data_type} cache: {os.path.basename(cache_path)}")
                        return df
                except Exception as e:
                    print(f"❌ Error loading {symbol} from local cache {os.path.basename(cache_path)}: {e}")
                    # If cache file is corrupt, try to remove it
                    try:
                        os.remove(cache_path)
                        print(f"  Removed corrupt cache file: {cache_path}")
                    except OSError as oe:
                        print(f"  Error removing corrupt cache file: {oe}")

        # Fallback to yfinance if no local cache found or failed to load
        print(f"🔄 Local cache not found or failed for {symbol}. Falling back to yfinance for {data_type} data...")
        
        if data_type == "daily":
            df_live = self._fetch_data_from_yfinance(symbol, start=self.config.START_DATE_HISTORICAL_DAILY, end=self.config.END_DATE_HISTORICAL_DAILY, interval="1d")
        else: # Intraday
            df_live = self._fetch_data_from_yfinance(symbol, period=self.config.INTRADAY_PERIOD, interval=self.config.INTRADAY_INTERVAL)

        if df_live is not None and not df_live.empty:
            # Cache the newly fetched data
            try:
                df_live.to_parquet(cache_file_ns) # Always save as .NS for consistency if fetched live
                print(f"✅ Saved {len(df_live)} rows for {symbol} to local {data_type} cache: {os.path.basename(cache_file_ns)}")
            except Exception as e:
                print(f"❌ Error saving {symbol} to local cache: {e}")
        return df_live

    def _create_features_and_target(self, df_stock):
        """
        Calculates technical indicators, lagged features, and the target variable for a single stock DataFrame.
        Assumes df_stock has 'open', 'high', 'low', 'close', 'volume' columns and 'Date' as index.
        """
        if df_stock is None or df_stock.empty:
            print(f"  Debug: Input df_stock is None or empty for feature engineering.")
            return None

        df = df_stock.copy()
        symbol_name = df.get('Symbol', 'Unknown Symbol')

        # --- CRITICAL: Ensure OHLCV columns are numeric and drop rows with NaNs in these core columns ---
        ohlcv_cols = ['open', 'high', 'low', 'close', 'volume']
        
        # Check if all required OHLCV columns exist
        if not all(col in df.columns for col in ohlcv_cols):
            print(f"  ❌ Error: Missing one or more OHLCV columns for {symbol_name}. Required: {ohlcv_cols}. Found: {df.columns.tolist()}")
            return None

        for col in ohlcv_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        initial_rows = len(df)
        df.dropna(subset=ohlcv_cols, inplace=True)
        if len(df) < initial_rows:
            print(f"  {symbol_name}: Dropped {initial_rows - len(df)} rows due to NaN in OHLCV after numeric conversion. Remaining rows: {len(df)}")

        if df.empty: # Check if empty after dropping initial NaNs
            print(f"  Warning: DataFrame for {symbol_name} became empty after initial OHLCV NaN handling. Skipping feature creation.")
            return None

        # Fill NaN in volume with 0 after ensuring it's numeric, as 0 volume is a valid state
        if 'volume' in df.columns:
            df['volume'] = df['volume'].fillna(0)

        # If after dropping NaNs, the DataFrame becomes too short for indicators, return None
        # This minimum length depends on the longest lookback period of your indicators
        if len(df) < self.config.LOOKBACK_BARS_FOR_FEATURES + 50: # +50 as buffer
            print(f"  Warning: DataFrame for {symbol_name} became too short ({len(df)} bars, required at least {self.config.LOOKBACK_BARS_FOR_FEATURES + 50}) after initial NaN handling. Skipping feature creation.")
            return None

        # --- Debugging prints (uncomment if needed) ---
        # print(f"  DataFrame info for {symbol_name} AFTER initial NaN handling but BEFORE feature creation:")
        # df.info()
        # print(f"  DataFrame head for {symbol_name} AFTER initial NaN handling:")
        # print(df.head())
        # print(f"  DataFrame describe for {symbol_name} AFTER initial NaN handling:")
        # print(df.describe())

        # --- Technical Indicators (using pandas_ta) ---
        # Apply indicators only if the necessary columns are present and not empty
        # This is a more robust check for 'arg must be a list...' errors
        
        # Check for 'close' column for price-based indicators
        if 'close' in df.columns and not df['close'].empty:
            df.ta.rsi(append=True, length=14)
            df.ta.macd(append=True, fast=12, slow=26, signal=9)
            df.ta.stoch(append=True, k=14, d=3)
            df.ta.sma(length=20, append=True)
            df.ta.sma(length=50, append=True)
            df.ta.sma(length=200, append=True)
            df.ta.ema(length=20, append=True)
            df.ta.ema(length=50, append=True)
            df.ta.bbands(append=True, length=20, std=2)
            df.ta.atr(append=True, length=14)
        else:
            print(f"  Warning: 'close' column is missing or empty for {symbol_name}. Skipping price-based indicators.")

        # Check for 'volume' column for volume-based indicators
        if 'volume' in df.columns and not df['volume'].empty:
            df.ta.ad(append=True)
            df.ta.obv(append=True)
        else:
            print(f"  Warning: 'volume' column is missing or empty for {symbol_name}. Skipping volume indicators.")


        # --- Lagged Price Features ---
        if 'close' in df.columns and not df['close'].empty:
            for lag in [1, 3, 5]:
                df[f'Close_lag{lag}'] = df['close'].shift(lag)
        if 'volume' in df.columns and not df['volume'].empty:
            for lag in [1, 3, 5]: # Lagged volume
                df[f'Volume_lag{lag}'] = df['volume'].shift(lag)

        # --- Daily Returns ---
        if 'close' in df.columns and not df['close'].empty:
            df['Daily_Return'] = df['close'].pct_change()
            if 'Daily_Return' in df.columns and not df['Daily_Return'].empty:
                for lag in [1, 2]:
                    df[f'Daily_Return_lag{lag}'] = df['Daily_Return'].shift(lag)

        # --- Volatility (Rolling Standard Deviation of Returns) ---
        if 'Daily_Return' in df.columns and not df['Daily_Return'].empty:
            df['Volatility_10d'] = df['Daily_Return'].rolling(window=10).std()


        # --- Calendar Features ---
        df['DayOfWeek'] = df.index.dayofweek
        df['DayOfMonth'] = df.index.day
        df['Month'] = df.index.month
        df['Year'] = df.index.year

        # --- Target Variable (Classification) --- # <--- Reverted to Classification
        if 'close' in df.columns and not df['close'].empty:
            df['Future_Close'] = df['close'].shift(-self.config.PREDICTION_HORIZON_DAYS)
            df['Future_Return'] = (df['Future_Close'] - df['close']) / df['close']
            df[self.config.CLASSIFICATION_TARGET_COLUMN] = (df['Future_Return'] > self.config.UP_THRESHOLD).astype(int) # <--- Reverted target creation
        else:
            print(f"  Warning: 'close' column is missing or empty for {symbol_name}. Cannot create target variable.")
            return None # Cannot proceed without target

        # Drop rows with NaN values created by indicator calculations and future shifts
        df.dropna(subset=[self.config.CLASSIFICATION_TARGET_COLUMN], inplace=True) # <--- Adjusted target column
        df.dropna(inplace=True) # Drop any remaining NaNs from other features

        # After dropping rows, fill any remaining NaNs in all numeric columns with 0
        for col in df.select_dtypes(include=np.number).columns.tolist():
            df[col] = df[col].fillna(0)

        # Drop temporary columns used for target creation
        df.drop(columns=['Future_Close', 'Future_Return'], errors='ignore', inplace=True)

        # Drop original OHLCV columns as they are now replaced by features
        df.drop(columns=ohlcv_cols, errors='ignore', inplace=True)

        # --- Debugging prints (uncomment if needed) ---
        # print(f"  Debug: Final DataFrame for {symbol_name} after feature creation and final NaN handling. Shape: {df.shape}")
        # print(f"  Debug: Final DataFrame head for {symbol_name}:\n{df.head()}")
        # print(f"  Debug: Final DataFrame info for {symbol_name}:\n")
        # df.info()

        return df

    def run_data_collection_and_feature_engineering(self, data_type="daily"):
        """
        Runs Phase 1: Data Collection & Feature Engineering for all target stocks.
        data_type: 'daily' for long historical data (training), 'intraday' for recent intraday data.
        """
        print(f"\n--- Phase 1: Data Collection & Feature Engineering ({data_type.capitalize()}) ---")
        all_processed_stocks = []
        
        print(f"Starting bulk data collection and feature engineering for {len(self.config.TARGET_STOCKS)} stocks. Prioritizing local cache...")
        with ThreadPoolExecutor(max_workers=self.config.MAX_WORKERS) as executor:
            future_to_symbol = {
                executor.submit(self._load_or_fetch_cached_data, symbol, data_type): symbol
                for symbol in self.config.TARGET_STOCKS
            }
            
            for future in as_completed(future_to_symbol):
                symbol = future_to_symbol[future]
                try:
                    df_raw = future.result()
                    if df_raw is not None and not df_raw.empty:
                        print(f"  Processing features for {symbol}...")
                        df_processed = self._create_features_and_target(df_raw)
                        if df_processed is not None and not df_processed.empty:
                            all_processed_stocks.append(df_processed)
                            print(f"  Successfully processed {symbol}. Total processed so far: {len(all_processed_stocks)}")
                        else:
                            print(f"  No features generated for {symbol} (likely due to insufficient data after dropna).")
                    else:
                        print(f"  Skipping {symbol} due to no raw data (neither local cache nor yfinance fallback provided data).")
                except Exception as exc:
                    import traceback
                    print(f"  {symbol} generated an exception during processing: {type(exc).__name__}: {exc}")
                    traceback.print_exc()
                    
        if all_processed_stocks:
            final_dataset = pd.concat(all_processed_stocks)
            final_dataset.sort_values(by=['Symbol', 'Date'], inplace=True)
            final_dataset['Symbol'] = final_dataset['Symbol'].astype('category')
            final_dataset.to_parquet(self.config.PROCESSED_DATA_FILE)
            print(f"\n--- All historical data with features and target saved to {self.config.PROCESSED_DATA_FILE} ---")
            print(f"Total rows in final dataset: {len(final_dataset)}")
            print(f"Memory usage: {final_dataset.memory_usage(deep=True).sum() / (1024**2):.2f} MB")
            return final_dataset
        else:
            print("\nNo data processed. Exiting.")
            return None

    def train_model(self, df_ml):
        """
        Runs Phase 2: Model Training.
        df_ml: DataFrame with features and target.
        """
        print("\n--- Phase 2: Model Training ---")
        
        if df_ml is None or df_ml.empty:
            try:
                df_ml = pd.read_parquet(self.config.PROCESSED_DATA_FILE)
                print(f"Loaded {len(df_ml)} rows for ML training from {self.config.PROCESSED_DATA_FILE}.")
            except FileNotFoundError:
                print(f"Error: {self.config.PROCESSED_DATA_FILE} not found. Please ensure Phase 1 completed successfully.")
                return False
        
        feature_columns = [col for col in df_ml.columns if col not in [self.config.CLASSIFICATION_TARGET_COLUMN, 'Symbol']] # <--- Adjusted target column
        
        # Ensure all feature columns exist after potential NaN filling
        X = df_ml[feature_columns]
        y = df_ml[self.config.CLASSIFICATION_TARGET_COLUMN] # <--- Adjusted target column

        train_mask = (df_ml.index < self.config.TRAIN_END_DATE)
        
        X_train = X[train_mask]
        y_train = y[train_mask]
        
        X_test = X[~train_mask]
        y_test = y[~train_mask]

        if X_train.empty or X_test.empty:
            print("Warning: Training or test data is empty. Cannot train model.")
            return False

        print(f"Training data size: {len(X_train)} rows")
        print(f"Test data size: {len(X_test)} rows")
        
        # For classification, print target distribution
        print(f"Target distribution in training data (0/1):\n{y_train.value_counts(normalize=True)}")
        print(f"Target distribution in test data (0/1):\n{y_test.value_counts(normalize=True)}")


        print("\nInitializing and training XGBoost Classifier...") # <--- Reverted to Classifier
        model = XGBClassifier( # <--- Reverted to XGBClassifier
            objective='binary:logistic', # <--- Objective for classification
            eval_metric='logloss', # <--- Eval metric for classification
            use_label_encoder=False,
            n_estimators=200,
            learning_rate=0.05,
            max_depth=5,
            subsample=0.7,
            colsample_bytree=0.7,
            random_state=42,
            n_jobs=-1
        )

        model.fit(X_train, y_train)
        print("XGBoost model training complete.")

        print("\nEvaluating model on the unseen historical test set...")
        y_pred_test = model.predict(X_test)
        y_pred_proba_test = model.predict_proba(X_test)[:, 1] # Probability of predicting '1' (UP)
        
        # Evaluate using classification metrics
        print("\nClassification Report on Test Data:")
        print(classification_report(y_test, y_pred_test))
        print(f"Accuracy Score: {accuracy_score(y_test, y_pred_test):.4f}")
        print(f"ROC AUC Score: {roc_auc_score(y_test, y_pred_proba_test):.4f}")

        joblib.dump(model, self.config.TRAINED_MODEL_FILE)
        print(f"\nModel saved to {self.config.TRAINED_MODEL_FILE}")
        self.model = model # Store trained model in instance
        return True

    def make_daily_predictions(self):
        """
        Runs Phase 3: Generates predictions for tomorrow's market movement (as class and probability).
        """
        print("\n--- Phase 3: Generating Predictions for Tomorrow's Market ---")

        try:
            if self.model is None: # Load model if not already loaded (e.g., if running prediction only)
                self.model = joblib.load(self.config.TRAINED_MODEL_FILE)
            print(f"Model loaded from {self.config.TRAINED_MODEL_FILE}")
        except FileNotFoundError:
            print(f"Error: Trained model not found at {self.config.TRAINED_MODEL_FILE}. Please run training first.")
            return None

        PREDICTION_DATE_STR = datetime.date.today().strftime('%Y-%m-%d')
        TOMORROW_DATE_STR = (datetime.date.today() + datetime.timedelta(days=1)).strftime('%Y-%m-%d')

        print(f"\nFetching latest data for prediction for {PREDICTION_DATE_STR} using yfinance...")
        
        daily_predictions = []
        
        with ThreadPoolExecutor(max_workers=self.config.MAX_WORKERS) as executor:
            future_to_symbol_daily = {
                executor.submit(self._fetch_data_from_yfinance, symbol, 
                                start=(datetime.datetime.strptime(PREDICTION_DATE_STR, '%Y-%m-%d') - datetime.timedelta(days=int(self.config.LOOKBACK_BARS_FOR_FEATURES * 1.8 + 50))).strftime('%Y-%m-%d'), 
                                end=PREDICTION_DATE_STR,
                                interval="1d"): symbol # Ensure daily interval for prediction
                for symbol in self.config.TARGET_STOCKS
            }

            for future_daily in as_completed(future_to_symbol_daily):
                symbol = future_to_symbol_daily[future_daily]
                try:
                    df_raw_daily = future_daily.result()
                    if df_raw_daily is not None and not df_raw_daily.empty:
                        # Filter to ensure we only process data up to today's date for prediction features
                        df_raw_daily_upto_today = df_raw_daily[df_raw_daily.index <= pd.to_datetime(PREDICTION_DATE_STR)]
                        
                        if not df_raw_daily_upto_today.empty:
                            df_features_daily = self._create_features_and_target(df_raw_daily_upto_today)
                            
                            if df_features_daily is not None and not df_features_daily.empty:
                                # Get the features for the very last available date (today's features)
                                # Drop the classification target column as it's not available for unseen data
                                latest_features_for_symbol = df_features_daily.iloc[[-1]].drop(columns=[self.config.CLASSIFICATION_TARGET_COLUMN], errors='ignore')
                                
                                # Ensure column order matches training data
                                missing_cols = set(self.model.feature_names_in_) - set(latest_features_for_symbol.columns)
                                for c in missing_cols:
                                    latest_features_for_symbol[c] = 0 # Fill missing features with 0 (or a suitable default)
                                latest_features_for_symbol = latest_features_for_symbol[self.model.feature_names_in_]

                                # Make prediction (this will be a predicted class: 0 or 1)
                                predicted_class = self.model.predict(latest_features_for_symbol)[0]
                                # Get probability of the 'UP' class (class 1)
                                prediction_proba_up = self.model.predict_proba(latest_features_for_symbol)[:, 1][0]
                                
                                action = "UP" if predicted_class == 1 else "DOWN/FLAT"
                                
                                daily_predictions.append({
                                    'Symbol': symbol,
                                    'Prediction_Date': TOMORROW_DATE_STR,
                                    'Predicted_Movement': action,
                                    'Probability_Up': f"{prediction_proba_up:.4f}" # <--- Reverted to Probability_Up
                                })
                            else:
                                print(f"  Could not generate features for prediction for {symbol} on {PREDICTION_DATE_STR}.")
                        else:
                            print(f"  No data up to {PREDICTION_DATE_STR} for {symbol} from yfinance.")
                    else:
                        print(f"  No raw daily data for prediction for {symbol} from yfinance.")
                except Exception as exc:
                    import traceback
                    print(f"  {symbol} generated an exception during daily prediction feature prep: {type(exc).__name__}: {exc}")
                    traceback.print_exc()

        predictions_df_tomorrow = pd.DataFrame(daily_predictions)
        if not predictions_df_tomorrow.empty:
            print("\n--- Predictions for Tomorrow's Market Movement ---")
            print(predictions_df_tomorrow.head(10))
            print(f"\nTotal predictions generated: {len(predictions_df_tomorrow)}")

            predictions_output_file = os.path.join(self.config.PREDICTIONS_DIR, f"daily_predictions_{TOMORROW_DATE_STR}.csv")
            predictions_df_tomorrow.to_csv(predictions_output_file, index=False)
            print(f"\nDaily predictions saved to {predictions_output_file}")
        else:
            print("\nNo predictions generated.")
        return predictions_df_tomorrow

    def run_pipeline(self, mode="train_and_predict"):
        """
        Main entry point to run the stock prediction pipeline.
        mode: 'train_and_predict', 'train_only', 'predict_only'
        """
        if mode in ["train_and_predict", "train_only"]:
            df_processed = self.run_data_collection_and_feature_engineering(data_type="daily")
            if df_processed is None:
                print("Training data collection failed. Cannot proceed with training.")
                return
            if not self.train_model(df_processed):
                print("Model training failed. Cannot proceed with prediction.")
                return

        if mode in ["train_and_predict", "predict_only"]:
            self.make_daily_predictions()

# --- Command Line Interface ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Stock Prediction ML Pipeline")
    parser.add_argument('--mode', type=str, default='train_and_predict',
                        choices=['train_and_predict', 'train_only', 'predict_only'],
                        help="Mode to run the pipeline: 'train_and_predict' (default), 'train_only', 'predict_only'.")
    parser.add_argument('--start_date', type=str, default=Config.START_DATE_HISTORICAL_DAILY,
                        help="Start date for historical data (YYYY-MM-DD). Only applies to training data if not cached.")
    parser.add_argument('--end_date', type=str, default=Config.END_DATE_HISTORICAL_DAILY,
                        help="End date for historical data (YYYY-MM-DD). Only applies to training data if not cached.")
    parser.add_argument('--tickers', type=str, default=','.join(Config.TARGET_STOCKS),
                        help="Comma-separated list of stock tickers (e.g., RELIANCE,INFY).")
    parser.add_argument('--max_workers', type=int, default=Config.MAX_WORKERS,
                        help=f"Max concurrent workers for data fetching (default: {Config.MAX_WORKERS}).")
    parser.add_argument('--api_delay', type=float, default=Config.API_CALL_DELAY_SECONDS,
                        help=f"Delay between API calls in seconds (default: {Config.API_CALL_DELAY_SECONDS}).")

    args = parser.parse_args()

    # Update config based on command line arguments
    Config.START_DATE_HISTORICAL_DAILY = args.start_date
    Config.END_DATE_HISTORICAL_DAILY = args.end_date
    Config.TARGET_STOCKS = [t.strip().upper() for t in args.tickers.split(',')]
    Config.MAX_WORKERS = args.max_workers
    Config.API_CALL_DELAY_SECONDS = args.api_delay

    predictor = StockPredictor(config=Config())
    predictor.run_pipeline(mode=args.mode)

