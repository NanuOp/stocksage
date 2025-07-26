import os
import requests
from groq import Groq
from datetime import datetime, timedelta

# Use your actual Groq Cloud API key via env var
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "mixtral-8x7b-32768"  # or other supported Groq models

def get_news(symbol: str) -> str:
    # Same as above—implement your news fetching logic
    news = ["Reliance Q4 profit up 10%", "Reliance Jio plans 5G rollout"]  # Example
    return "\n".join(f"{i+1}. {s}" for i, s in enumerate(news)) if news else "No news found."

def groq_sentiment(symbol: str) -> dict[str, float | str | list]:
    """
    Calls Groq API on latest news for the stock symbol.
    Returns a dict with sentiment_score, summary, key_phrases.
    """
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
    try:
        result = eval(chat_completion.choices[0].message.content)
        return {
            "sentiment_score": result.get("sentiment_score", 50.0),
            "summary": result.get("summary", "No summary extracted"),
            "key_phrases": result.get("key_phrases", [])
        }
    except:
        return {
            "sentiment_score": 50.0,
            "summary": "Sentiment analysis failed",
            "key_phrases": []
        }
