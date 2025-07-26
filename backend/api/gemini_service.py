import os
import requests
import ast
from groq import Groq
import google.generativeai as genai

# --- Configuration & Secrets ---

GEMINI_API_KEY = "AIzaSyDmO0wg72Bx3BAS3XaxkKlBgrn6t9q3ISY"
GROQ_API_KEY = "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"
PERPLEXITY_API_KEY = "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"

GROQ_MODEL = "llama3-70b-8192"
PERPLEXITY_MODEL = "gpt-4o-mini"
PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/v1/chat/completions"

# Initialize Gemini
genai.configure(api_key=GEMINI_API_KEY)

# --- News Fetching ---
def get_news(symbol: str) -> str:
    # TODO: Connect to your actual news API here
    example_news = [
        f"{symbol} Q4 profit up 10%",
        f"{symbol} plans new product launch"
    ]
    return "\n".join(f"{i+1}. {s}" for i, s in enumerate(example_news)) if example_news else "No news found."

# --- Sentiment Analysis: Groq ---
def groq_sentiment(symbol: str) -> dict:
    news = get_news(symbol)
    prompt = f"""
    Analyze the sentiment of these financial news snippets for {symbol}.NS (NSE):
    ---
    News:
    {news}
    ---
    Return only a parsable Python dict with: sentiment_score (float 0-100), summary (str), key_phrases (list).
    """
    client = Groq(api_key=GROQ_API_KEY)
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=GROQ_MODEL,
        temperature=0.0
    )
    response_content = chat_completion.choices[0].message.content
    try:
        result = ast.literal_eval(response_content)  # Safer than eval
        return {
            "sentiment_score": result.get("sentiment_score", 50.0),
            "summary": result.get("summary", "No summary extracted"),
            "key_phrases": result.get("key_phrases", [])
        }
    except Exception as e:
        print("Groq parsing error:", e)
        return {
            "sentiment_score": 50.0,
            "summary": "Sentiment analysis failed",
            "key_phrases": []
        }

# --- Sentiment Analysis: Perplexity ---
def perplexity_sentiment(symbol: str) -> dict:
    news = get_news(symbol)
    prompt = f"""
    Analyze the sentiment of these financial news snippets for {symbol}.NS (NSE):
    ---
    News:
    {news}
    ---
    Return only a parsable Python dict with: sentiment_score (float 0-100), summary (str), key_phrases (list).
    """
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    body = {
        "model": PERPLEXITY_MODEL,
        "messages": [{"role": "user", "content": prompt}]
    }
    response = requests.post(PERPLEXITY_ENDPOINT, json=body, headers=headers)
    response.raise_for_status()
    response_json = response.json()
    content = response_json.get('choices', [{}])[0].get('message', {}).get('content', '')
    try:
        result = ast.literal_eval(content)
        return result
    except Exception as e:
        return {
            "error": "Failed to parse API response",
            "raw_response": content
        }

# --- Gemini Stock Analysis ---
def analyze_stock(symbol):
    """Fetches stock analysis using Gemini AI"""
    model = genai.GenerativeModel("gemini-2.0-flash")
    prompt = f"Provide an in-depth analysis of {symbol} stock, including technical and fundamental insights."
    response = model.generate_content(prompt)
    return response.text

# --- Main ---
if __name__ == "__main__":
    stock = "Tata Motors"
    print("🔷 Gemini Analysis:")
    print(analyze_stock(stock))
    print("\n🔷 Groq Sentiment:")
    print(groq_sentiment(stock))
    print("\n🔷 Perplexity Sentiment:")
    print(perplexity_sentiment(stock))
