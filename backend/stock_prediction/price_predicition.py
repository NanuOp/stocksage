import os
import datetime
import pandas as pd
import numpy as np
import yfinance as yf
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import requests
from groq import Groq
import requests
    
# === CONFIG ===

TARGET_STOCKS = ['TATAMOTORS']
MODEL_PATH = './models/xgb_regression_model.joblib'
START_DATE = '2015-01-01'
END_DATE = datetime.date.today().strftime('%Y-%m-%d')
PREDICTIONS_OUTPUT_DIR = './predictions'

os.makedirs('./models', exist_ok=True)
os.makedirs('./processed_data', exist_ok=True)
os.makedirs(PREDICTIONS_OUTPUT_DIR, exist_ok=True)

# === DATA COLLECTION & FEATURE ENGINEERING ===
def fetch_stock_data(symbol):
    df = yf.download(symbol + '.NS', start=START_DATE, end=END_DATE, auto_adjust=True)

    # ✅ Flatten MultiIndex columns if present
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    df.dropna(inplace=True)
    df = df.loc[:, ~df.columns.duplicated()]  # remove duplicate columns

    if 'Close' not in df.columns:
        print("⚠️ 'Close' column not found after flattening.")
        return None

    df['Close'] = pd.to_numeric(df['Close'], errors='coerce')

    df['Future_Close'] = df['Close'].shift(-1)
    df['Future_Return'] = (df['Future_Close'] - df['Close']) / df['Close']

    df.dropna(inplace=True)
    return df


def add_features(df):
    df['MA_20'] = df['Close'].rolling(window=20).mean()
    df['MA_50'] = df['Close'].rolling(window=50).mean()
    df['Volatility_10d'] = df['Close'].pct_change().rolling(window=10).std()
    df.dropna(inplace=True)  # drop rows with NA after feature engineering
    return df


# === TRAINING ===

def train_xgb_model(df):
    features = ['Close', 'MA_20', 'MA_50', 'Volatility_10d']
    target = 'Future_Return'

    # ✅ Debug: Check available columns
    print(f"✅ Available columns: {df.columns.tolist()}")

    # ❌ Check if all required features exist
    missing = [f for f in features if f not in df.columns]
    if missing:
        print(f"❌ Missing features: {missing}")
        return

    # 🧹 Drop NaN rows just in case
    df = df.dropna(subset=features + [target])

    X = df[features]
    y = df[target]

    from sklearn.model_selection import train_test_split
    from xgboost import XGBRegressor
    from sklearn.metrics import mean_squared_error
    import joblib

    # 🔀 Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # ⚡ Train model
    model = XGBRegressor(n_estimators=100, learning_rate=0.05)
    model.fit(X_train, y_train)

    # 📊 Evaluate
    preds = model.predict(X_test)
    mse = mean_squared_error(y_test, preds)
    print(f"✅ Model trained. Test MSE: {mse:.4f}")

    # 💾 Save model
    model_path = './models/xgb_regression_model.joblib'
    joblib.dump(model, model_path)
    print(f"✅ Model saved to {model_path}")


# === PREDICTION ===

def predict_next_day(symbol, model):
    api_key = "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"
    text_sample = "Provide a precise, actionable financial market sentiment analysis for {symbol}. Include short-term outlook, recent news tone, and any risk factors briefly"

    url = "https://api.grokmachine.com/parse"
    headers = {"Authorization": f"Bearer {api_key}"}
    data = {"text": text_sample, "pattern": "%{COMMON_WORD:name} %{INT:age}"}

    response = requests.post(url, headers=headers, json=data)

    if response.status_code == 200:
        print(response.json())
    else:
        print(f"Error: {response.status_code}")	
    df = fetch_stock_data(symbol)
    latest = df.iloc[-1:]
    features = ['Close', 'MA_20', 'MA_50', 'Volatility_10d']
    X_pred = latest[features]
    predicted_return = model.predict(X_pred)[0]
    predicted_price = latest['Close'].values[0] * (1 + predicted_return)

    print(f"{symbol} Prediction: Return {predicted_return:.4f}, Predicted Price {predicted_price:.2f}")

    return {
        'Symbol': symbol,
        'Prediction_Date': (datetime.date.today() + datetime.timedelta(days=1)).strftime('%Y-%m-%d'),
        'Predicted_Return': f"{predicted_return:.4f}",
        'Predicted_Close_Price': f"{predicted_price:.2f}"
    }

# === SENTIMENT ANALYSIS (Using Grok) ===

def get_sentiment_analysis(symbol):
    client = Groq()
    prompt_text = f"Provide a precise, actionable financial market sentiment analysis for {symbol}. Include short-term outlook, recent news tone, and any risk factors briefly."

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "user", "content": prompt_text}
            ],
            temperature=0.7,
            max_completion_tokens=512,
            top_p=1,
            stream=False,
            stop=None,
        )
        return completion.choices[0].message.content

    except Exception as e:
        return f"Exception during sentiment analysis: {e}"
        
        

# === MAIN PIPELINE ===

if __name__ == "__main__":
    print("=== STOCK PREDICTION PIPELINE STARTED ===")

    # 1. Data Collection & Feature Engineering
    all_dfs = []
    for symbol in TARGET_STOCKS:
        df = fetch_stock_data(symbol)
        all_dfs.append(df)
        print(f"{symbol} data fetched with {len(df)} rows.")

    final_df = pd.concat(all_dfs)
    final_df.to_parquet('./processed_data/processed_stock_features.parquet')
    print("All data saved to ./processed_data/processed_stock_features.parquet")

    # 2. Model Training
    train_xgb_model(final_df)

    # 3. Prediction
    model = joblib.load(MODEL_PATH)
    predictions = []
    for symbol in TARGET_STOCKS:
        pred = predict_next_day(symbol, model)
        sentiment = get_sentiment_analysis(symbol)
        pred['Sentiment'] = sentiment
        predictions.append(pred)

    # 4. Save predictions
    predictions_df = pd.DataFrame(predictions)
    output_file = os.path.join(PREDICTIONS_OUTPUT_DIR, f"daily_predictions_{datetime.date.today().strftime('%Y-%m-%d')}.csv")
    predictions_df.to_csv(output_file, index=False)
    print(f"Predictions saved to {output_file}")

    print("=== PIPELINE COMPLETED SUCCESSFULLY ===")
