import pandas as pd
import numpy as np
import datetime
import requests
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

# --- Data Acquisition Libraries ---
import yfinance as yf

# --- Feature Engineering Library ---
import pandas_ta as ta

# --- Machine Learning Libraries ---
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
import joblib

# --- Configuration ---
LOCAL_DATA_DIR = "historical_data"

# Data collection parameters for yfinance fallback or daily prediction
START_DATE_HISTORICAL = "2023-01-01" # Using a longer period for better data
END_DATE_HISTORICAL = datetime.date.today().strftime('%Y-%m-%d')

# --- Stock Universe ---
TARGET_STOCKS = ['TATAMOTORS'] 


# --- File Paths ---
PROCESSED_DATA_FILE = "processed_stock_features_with_target.parquet"
TRAINED_MODEL_FILE = "_stock_prediction_model.joblib"

# --- ML Model Parameters ---
PREDICTION_HORIZON_DAYS = 1
UP_THRESHOLD = 0.005
LOOKBACK_DAYS_FOR_FEATURES = 50 

# --- Functions for Data Acquisition ---

def fetch_data_from_yfinance(symbol, start_date_str, end_date_str):
    """
    Fetches historical data for a single symbol using yfinance.
    Handles MultiIndex columns, standardizes to lowercase, and validates OHLCV presence.
    """
    yf_symbols = [f"{symbol}.NS", f"{symbol}.BO"]
    
    for yf_symbol in yf_symbols:
        try:
            df = yf.download(yf_symbol, start=start_date_str, end=end_date_str, progress=False, auto_adjust=False)
            time.sleep(2.0)  # polite delay to avoid rate limit

            if df is not None and not df.empty:
                # Flatten MultiIndex if present
                if isinstance(df.columns, pd.MultiIndex):
                    # 🛠 MultiIndex flattening with ticker removal
                    df.columns = [col[0].lower() for col in df.columns]
                else:
                    # Single-level columns: rename directly
                    df.columns = [col.lower() for col in df.columns]

                # ✅ Standardize column names to OHLCV schema
                rename_dict = {
                    'adj close': 'adj_close',
                    'open': 'open',
                    'high': 'high',
                    'low': 'low',
                    'close': 'close',
                    'volume': 'volume'
                }
                df.rename(columns=rename_dict, inplace=True)

                # ✅ Drop adj_close if you don't use it
                if 'adj_close' in df.columns:
                    df.drop(columns=['adj_close'], inplace=True)

                # Debug: Print final columns
                print(f"✅ Columns fetched for {symbol}: {df.columns.tolist()}")

                df['Symbol'] = symbol
                df.index = pd.to_datetime(df.index)
                df.sort_index(inplace=True)

                # Validate required OHLCV columns
                missing_cols = [col for col in ['open', 'high', 'low', 'close', 'volume'] if col not in df.columns]
                if missing_cols:
                    print(f"❌ Missing columns {missing_cols} for {symbol}. Skipping this symbol.")
                    continue

                return df

        except Exception as e:
            print(f"❌ Error fetching {yf_symbol} from yfinance: {e}")
            continue

    print(f"❌ No data found for {symbol} from yfinance (both .NS and .BO failed from {start_date_str} to {end_date_str}).")
    return None

def fetch_data_for_training(symbol, start_date_str, end_date_str):
    """
    Attempts to load historical data from a local CSV first.
    If not found, falls back to yfinance.
    """
    csv_path_ns = os.path.join(LOCAL_DATA_DIR, f"{symbol}.NS.csv")
    csv_path_bo = os.path.join(LOCAL_DATA_DIR, f"{symbol}.BO.csv")

    # Try loading from .NS CSV
    if os.path.exists(csv_path_ns):
        try:
            df = pd.read_csv(csv_path_ns, index_col='Date', parse_dates=True)
            if not df.empty:
                print(f"  Loaded {len(df)} rows for {symbol}.NS from local CSV.")
                df['Symbol'] = symbol
                df.sort_index(inplace=True)
                df.rename(columns={
                    'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'
                }, inplace=True)
                return df
        except Exception as e:
            print(f"  Error loading {symbol}.NS from local CSV: {e}")

    # Try loading from .BO CSV if .NS failed or not found
    if os.path.exists(csv_path_bo):
        try:
            df = pd.read_csv(csv_path_bo, index_col='Date', parse_dates=True)
            if not df.empty:
                print(f"  Loaded {len(df)} rows for {symbol}.BO from local CSV.")
                df['Symbol'] = symbol
                df.sort_index(inplace=True)
                df.rename(columns={
                    'Open': 'open', 'High': 'high', 'Low': 'low', 'Close': 'close', 'Volume': 'volume'
                }, inplace=True)
                return df
        except Exception as e:
            print(f"  Error loading {symbol}.BO from local CSV: {e}")

    # Fallback to yfinance if no local CSV found or failed to load
    print(f"  Local CSV not found or failed for {symbol}. Falling back to yfinance...")
    return fetch_data_from_yfinance(symbol, start_date_str, end_date_str)


# --- Feature Engineering Function (SIMPLIFIED FOR DEBUGGING) ---
def create_features_and_target(df_stock):
    """
    Calculates essential features and target variable for a single stock DataFrame.
    Assumes df_stock has 'open', 'high', 'low', 'close', 'volume' columns and 'Date' as index.
    Simplified for debugging 'arg must be a list...' error.
    """
    if df_stock is None or df_stock.empty:
        print(f"  Debug: Input df_stock is None or empty for {df_stock.get('Symbol', 'Unknown') if df_stock is not None else 'Unknown'}.")
        return None

    df = df_stock.copy()

    # --- CRITICAL: Ensure OHLCV columns are numeric and drop rows with NaNs in these core columns ---
    ohlcv_cols = ['open', 'high', 'low', 'close', 'volume']
    
    # Check if all required OHLCV columns exist
    if not all(col in df.columns for col in ohlcv_cols):
        print(f"  Error: Missing one or more OHLCV columns for {df.get('Symbol', 'Unknown')}. Required: {ohlcv_cols}. Found: {df.columns.tolist()}")
        return None

    for col in ohlcv_cols:
    	if col in df.columns:
        	print(f"🔍 Converting column {col} for {df['Symbol'].iloc[0] if 'Symbol' in df.columns else 'Unknown'}")
        	print(f"   Type before: {type(df[col])}, First rows:\n{df[col].head()}")
        	df[col] = pd.to_numeric(df[col], errors='coerce')
    	else:
        	print(f"❌ Column '{col}' missing for {df['Symbol'].iloc[0] if 'Symbol' in df.columns else 'Unknown Symbol'}. Available columns: {df.columns.tolist()}")
        	return None
    
    initial_rows = len(df)
    df.dropna(subset=ohlcv_cols, inplace=True)
    if len(df) < initial_rows:
        print(f"  {df.get('Symbol', 'Unknown')}: Dropped {initial_rows - len(df)} rows due to NaN in OHLCV after numeric conversion. Remaining rows: {len(df)}")

    if df.empty: # Check if empty after dropping initial NaNs
        print(f"  Warning: DataFrame for {df.get('Symbol', 'Unknown')} became empty after initial OHLCV NaN handling. Skipping feature creation.")
        return None

    # Fill NaN in volume with 0 after ensuring it's numeric, as 0 volume is a valid state
    if 'volume' in df.columns:
        df['volume'] = df['volume'].fillna(0)

    # If after dropping NaNs, the DataFrame becomes empty or too short, return None
    # Required for even basic calculations like daily returns or simple indicators
    required_min_rows = 5 # Even a few days are enough for basic checks
    if len(df) < required_min_rows: 
        print(f"  Warning: DataFrame for {df.get('Symbol', 'Unknown')} became too short ({len(df)} rows, required at least {required_min_rows}) after initial NaN handling. Skipping feature creation.")
        return None

    print(f"  DataFrame info for {df.get('Symbol', 'Unknown')} AFTER initial NaN handling but BEFORE feature creation:")
    df.info()
    print(f"  DataFrame head for {df.get('Symbol', 'Unknown')} AFTER initial NaN handling:")
    print(df.head())
    print(f"  DataFrame describe for {df.get('Symbol', 'Unknown')} AFTER initial NaN handling:")
    print(df.describe())


    # --- SIMPLIFIED FEATURE ENGINEERING FOR DEBUGGING ---
    # Only calculate a very basic feature and the target
    
    # Daily Returns (requires 'close' column)
    if 'close' in df.columns and not df['close'].empty:
        df['Daily_Return'] = df['close'].pct_change()
        print(f"  Debug: Daily_Return created for {df.get('Symbol', 'Unknown')}. Head:\n{df['Daily_Return'].head()}")
    else:
        print(f"  Warning: 'close' column is missing or empty for {df.get('Symbol', 'Unknown')}. Cannot create Daily_Return.")
        df['Daily_Return'] = np.nan # Ensure column exists even if not calculated
        
    # Example: Simple Moving Average (requires 'close' column)
    if 'close' in df.columns and not df['close'].empty and len(df) >= 14: # RSI needs at least 14 periods
        df.ta.rsi(append=True, length=14)
        print(f"  Debug: RSI created for {df.get('Symbol', 'Unknown')}. Head:\n{df['RSI_14'].head()}")
    else:
        print(f"  Warning: 'close' column is missing, empty, or too short for RSI for {df.get('Symbol', 'Unknown')}. Skipping RSI.")


    # --- Calendar Features (always safe) ---
    df['DayOfWeek'] = df.index.dayofweek
    df['DayOfMonth'] = df.index.day
    df['Month'] = df.index.month
    df['Year'] = df.index.year

    # --- Target Variable ---
    if 'close' in df.columns and not df['close'].empty:
        df['Future_Close'] = df['close'].shift(-PREDICTION_HORIZON_DAYS)
        df['Future_Return'] = (df['Future_Close'] - df['close']) / df['close']
        df['Target'] = (df['Future_Return'] > UP_THRESHOLD).astype(int)
        print(f"  Debug: Target created for {df.get('Symbol', 'Unknown')}. Head:\n{df['Target'].head()}")
    else:
        print(f"  Warning: 'close' column is missing or empty for {df.get('Symbol', 'Unknown')}. Cannot create target variable.")
        return None # Cannot proceed without target

    # Drop rows with NaN values created by indicator calculations and future shifts
    df.dropna(inplace=True) 

    # After dropping rows, fill any remaining NaNs in all numeric columns with 0
    # This is a final, comprehensive cleanup before model training
    for col in df.select_dtypes(include=np.number).columns.tolist():
        df[col] = df[col].fillna(0)

    # Drop temporary columns used for target creation
    df.drop(columns=['Future_Close', 'Future_Return'], errors='ignore', inplace=True)

    # Drop original OHLCV columns if pandas_ta created lowercase versions (to avoid duplicates)
    df.drop(columns=['open', 'high', 'low', 'close', 'volume'], errors='ignore', inplace=True)

    print(f"  Debug: Final DataFrame for {df.get('Symbol', 'Unknown')} after feature creation and final NaN handling. Shape: {df.shape}")
    print(f"  Debug: Final DataFrame head for {df.get('Symbol', 'Unknown')}:\n{df.head()}")
    print(f"  Debug: Final DataFrame info for {df.get('Symbol', 'Unknown')}:\n")
    df.info()

    return df

# --- Main Script Execution ---

if __name__ == "__main__":
    # Create the local data directory if it doesn't exist
    if not os.path.exists(LOCAL_DATA_DIR):
        os.makedirs(LOCAL_DATA_DIR)
        print(f"Created local data directory: {LOCAL_DATA_DIR}")

    print("--- Phase 1: Data Collection & Feature Engineering ---")
    
    all_processed_stocks = []
    MAX_WORKERS = 1 # Keep at 1 for maximum reliability, especially with yfinance fallback

    print(f"Starting bulk data collection and feature engineering for {len(TARGET_STOCKS)} stocks. Prioritizing local CSVs...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_symbol = {
            # Call the new fetch_data_for_training function
            executor.submit(fetch_data_for_training, symbol, START_DATE_HISTORICAL, END_DATE_HISTORICAL): symbol
            for symbol in TARGET_STOCKS
        }
        
        for future in as_completed(future_to_symbol):
            symbol = future_to_symbol[future]
            try:
                df_raw = future.result()
                if df_raw is not None and not df_raw.empty:
                    print(f"  Processing features for {symbol}...")
                    df_processed = create_features_and_target(df_raw)
                    if df_processed is not None and not df_processed.empty:
                        all_processed_stocks.append(df_processed)
                        print(f"  Successfully processed {symbol}. Total processed so far: {len(all_processed_stocks)}")
                    else:
                        print(f"  No features generated for {symbol} (likely due to insufficient data after dropna).")
                else:
                    print(f"  Skipping {symbol} due to no raw data (neither local CSV nor yfinance fallback provided data).")
            except Exception as exc:
                # Print the full traceback for more detailed error info
                import traceback
                print(f"  {symbol} generated an exception during processing: {type(exc).__name__}: {exc}")
                traceback.print_exc()
                
    if all_processed_stocks:
        final_dataset = pd.concat(all_processed_stocks)
        final_dataset.sort_values(by=['Symbol', 'Date'], inplace=True)
        final_dataset['Symbol'] = final_dataset['Symbol'].astype('category')
        final_dataset.to_parquet(PROCESSED_DATA_FILE)
        print(f"\n--- All historical data with features and target saved to {PROCESSED_DATA_FILE} ---")
        print(f"Total rows in final dataset: {len(final_dataset)}")
        print(f"Memory usage: {final_dataset.memory_usage(deep=True).sum() / (1024**2):.2f} MB")
    else:
        print("\nNo data processed. Exiting.")
        exit()

    # --- Phase 2: Model Training ---
    print("\n--- Phase 2: Model Training ---")
    
    try:
        df_ml = pd.read_parquet(PROCESSED_DATA_FILE)
        print(f"Loaded {len(df_ml)} rows for ML training.")
    except FileNotFoundError:
        print(f"Error: {PROCESSED_DATA_FILE} not found. Please ensure Phase 1 completed successfully.")
        exit()

    feature_columns = [col for col in df_ml.columns if col not in ['Open', 'High', 'Low', 'Close', 'Volume', 'Target', 'Symbol']]
    X = df_ml[feature_columns]
    y = df_ml['Target']

    TRAIN_END_DATE = pd.to_datetime("2024-01-01") # Example: Train on data before 2024
    
    train_mask = (df_ml.index < TRAIN_END_DATE)
    
    X_train = X[train_mask]
    y_train = y[train_mask]
    
    X_test = X[~train_mask]
    y_test = y[~train_mask]

    print(f"Training data size: {len(X_train)} rows")
    print(f"Test data size: {len(X_test)} rows")
    print(f"Target distribution in training data (0/1): {y_train.value_counts(normalize=True)}")
    print(f"Target distribution in test data (0/1): {y_test.value_counts(normalize=True)}")

    print("\nInitializing and training XGBoost Classifier...")
    model = XGBClassifier(
        objective='binary:logistic',
        eval_metric='logloss',
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
    y_pred_proba_test = model.predict_proba(X_test)[:, 1]

    print("\nClassification Report on Test Data:")
    print(classification_report(y_test, y_pred_test))
    print(f"Accuracy Score: {accuracy_score(y_test, y_pred_test):.4f}")
    print(f"ROC AUC Score: {roc_auc_score(y_test, y_pred_proba_test):.4f}")

    joblib.dump(model, TRAINED_MODEL_FILE)
    print(f"\nModel saved to {TRAINED_MODEL_FILE}")

    # --- Phase 3: Prediction for Truly Unseen (New) Data ---
    print("\n--- Phase 3: Generating Predictions for Tomorrow's Market ---")

    try:
        loaded_model = joblib.load(TRAINED_MODEL_FILE)
        print(f"Model loaded from {TRAINED_MODEL_FILE}")
    except FileNotFoundError:
        print(f"Error: Trained model not found at {TRAINED_MODEL_FILE}. Please run Phase 2 first.")
        exit()

    PREDICTION_DATE_STR = datetime.date.today().strftime('%Y-%m-%d') # Today's date for which we have data
    TOMORROW_DATE_STR = (datetime.date.today() + datetime.timedelta(days=1)).strftime('%Y-%m-%d') # The date we are predicting for

    print(f"\nFetching latest data for prediction for {PREDICTION_DATE_STR} using yfinance...")
    
    daily_predictions = []
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_symbol_daily = {
            # Request enough history to calculate features for the latest day
            # This will use yfinance directly for daily data, as it's a smaller request
            executor.submit(fetch_data_from_yfinance, symbol, 
                            (datetime.datetime.strptime(PREDICTION_DATE_STR, '%Y-%m-%d') - datetime.timedelta(days=LOOKBACK_DAYS_FOR_FEATURES + 50)).strftime('%Y-%m-%d'), 
                            PREDICTION_DATE_STR): symbol
            for symbol in TARGET_STOCKS
        }

        for future_daily in as_completed(future_to_symbol_daily):
            symbol = future_to_symbol_daily[future_daily]
            try:
                df_raw_daily = future_daily.result()
                if df_raw_daily is not None and not df_raw_daily.empty:
                    # Filter to ensure we only process data up to today's date for prediction features
                    df_raw_daily_upto_today = df_raw_daily[df_raw_daily.index <= pd.to_datetime(PREDICTION_DATE_STR)]
                    
                    if not df_raw_daily_upto_today.empty:
                        df_features_daily = create_features_and_target(df_raw_daily_upto_today)
                        
                        if df_features_daily is not None and not df_features_daily.empty:
                            # Get the features for the very last available date (today's features)
                            # Ensure we drop the 'Target' column as it's not available for unseen data
                            latest_features_for_symbol = df_features_daily.iloc[[-1]].drop(columns=['Target'], errors='ignore')
                            
                            # Ensure column order matches training data
                            latest_features_for_symbol = latest_features_for_symbol[loaded_model.feature_names_in_]

                            # Make prediction
                            prediction_proba = loaded_model.predict_proba(latest_features_for_symbol)[:, 1][0]
                            predicted_class = loaded_model.predict(latest_features_for_symbol)[0]
                            
                            action = "UP" if predicted_class == 1 else "DOWN/FLAT"
                            
                            daily_predictions.append({
                                'Symbol': symbol,
                                'Prediction_Date': TOMORROW_DATE_STR,
                                'Predicted_Movement': action,
                                'Probability_Up': f"{prediction_proba:.4f}"
                            })
                        else:
                            print(f"  Could not generate features for prediction for {symbol} on {PREDICTION_DATE_STR}.")
                    else:
                        print(f"  No data up to {PREDICTION_DATE_STR} for {symbol} from yfinance.")
                else:
                    print(f"  No raw daily data for prediction for {symbol} from yfinance.")
            except Exception as exc:
                print(f"  {symbol} generated an exception during daily prediction feature prep: {exc}")

    predictions_df_tomorrow = pd.DataFrame(daily_predictions)
    print("\n--- Predictions for Tomorrow's Market Movement ---")
    print(predictions_df_tomorrow.head(10))
    print(f"\nTotal predictions generated: {len(predictions_df_tomorrow)}")

    predictions_output_file = f"daily_predictions_{TOMORROW_DATE_STR}.csv"
    predictions_df_tomorrow.to_csv(predictions_output_file, index=False)
    print(f"\nDaily predictions saved to {predictions_output_file}")

