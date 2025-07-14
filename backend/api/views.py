from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
import yfinance as yf
import json
import random
from bs4 import BeautifulSoup
from django.http import JsonResponse
from django.db.models import Q
from django.shortcuts import get_object_or_404
from api.models import Stock
from datetime import datetime, timedelta
import pandas as pd
from .gemini_service import analyze_stock
import google.generativeai as genai
import ta
import ta_py as ta
import requests
from rest_framework.decorators import api_view # Make sure this is imported
from rest_framework.response import Response   # Make sure this is imported
from .models import Stock, Prediction

# Configure the Gemini API
GEMINI_API_KEY = "AIzaSyDmO0wg72Bx3BAS3XaxkKlBgrn6t9q3ISY"
genai.configure(api_key=GEMINI_API_KEY)
gemini_models = {
    "flash": genai.GenerativeModel("gemini-2.0-flash"),
    
}

def home(request):
    """API Health Check"""
    return JsonResponse({"message": "Hello from Django API!"})

def suggestions(request):
    """
    Search for stocks by name or ticker.
    """
    query = request.GET.get("q", "").strip()
    if not query:
        return JsonResponse({"success": False, "data": []})

    starting_stocks = Stock.objects.filter(
        Q(name__istartswith=query) | Q(security_id__istartswith=query)
    )

    if starting_stocks.count() < 10:
        containing_stocks = Stock.objects.filter(
            Q(name__icontains=query) | Q(security_id__icontains=query)
        ).exclude(id__in=starting_stocks)

        stocks = list(starting_stocks) + list(containing_stocks[:10 - starting_stocks.count()])
    else:
        stocks = list(starting_stocks[:10])

    data = [{"name": stock.name, "ticker": stock.security_id} for stock in stocks]
    return JsonResponse({"success": True, "data": data})


@api_view(["GET"])
def get_stock_prediction(request, security_id): # Changed parameter name to security_id for consistency
    """
    Retrieves the latest prediction for a given stock security_id.
    """
    try:
        stock = get_object_or_404(Stock, security_id=security_id.upper())
        
        # Get the most recent prediction for this stock
        prediction = Prediction.objects.filter(stock=stock).order_by('-prediction_date').first()
        
        if prediction:
            return Response({
                "success": True,
                "symbol": prediction.stock.security_id, # Use stock.security_id
                "prediction_date": prediction.prediction_date.strftime('%Y-%m-%d'),
                "predicted_movement": prediction.predicted_movement,
                "probability_up": prediction.probability_up,
                "source_date": prediction.source_date.strftime('%Y-%m-%d')
            })
        else:
            return Response({"success": False, "message": f"No prediction found for {security_id}"}, status=404)
    except Stock.DoesNotExist:
        return Response({"success": False, "message": f"Stock with security ID {security_id} not found."}, status=404)
    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=500)
        
def fetch_real_time_price(ticker, stock_code):
    """
    Fetches real-time stock price and updated timestamp from Google Finance.
    - First, it tries with `ticker:NSE`
    - If no price is found, it tries with `stock_code:BOM`
    """
    headers = {'User-Agent': 'Mozilla/5.0'}
    source = None  # Track price source
    updated_time = "N/A"  # Initialize updated time

    # 1st attempt: Using Ticker (NSE)
    url_nse = f"https://www.google.com/finance/quote/{ticker}:NSE?hl=en"
    try:
        response = requests.get(url_nse, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Fetch the price
        price_element = soup.find('div', class_="YMlKec fxKbKc")
        if price_element:
            price = float(price_element.text.strip().replace(",", "").replace("₹", ""))
            source = "NSE"

            # Fetch the updated time
            time_element = soup.find('div', class_="ygUjEc")
            if time_element:
                updated_time = time_element.text.strip().split("·")[0].strip()

            return price, source, updated_time
    except Exception as e:
        print(f"Error fetching price from NSE: {e}")

    # 2nd attempt: Using Stock Code (BSE)
    url_bse = f"https://www.google.com/finance/quote/{stock_code}:BOM?hl=en"
    try:
        response = requests.get(url_bse, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Fetch the price
        price_element = soup.find('div', class_="YMlKec fxKbKc")
        if price_element:
            price = float(price_element.text.strip().replace(",", "").replace("₹", ""))
            source = "BSE"

            # Fetch the updated time
            time_element = soup.find('div', class_="ygUjEc")
            if time_element:
                updated_time = time_element.text.strip().split("·")[0].strip()

            return price, source, updated_time
    except Exception as e:
        print(f"Error fetching price from BSE: {e}")

    return None, None, "N/A"  # Return None if both attempts fail

def get_stock_news(request, symbol):
    """
    Fetch stock-specific news using SerpAPI (Google News)
    """
    SERPAPI_KEY = "5f9caf868363cac1080e4f99576ce05edb4632548b7ae0c0fa0b952c18e1baba"
    
    # Map symbols to proper search queries
    stock_queries = {
        'TATAMOTORS': 'Tata Motors stock',
        'INFY': 'Infosys stock',
        'RELIANCE': 'Reliance Industries stock',
        'HDFCBANK': 'HDFC Bank stock',
        'TCS': 'TCS stock'
    }
    
    query = stock_queries.get(symbol, f"{symbol} Indian stock Market")
    
    try:
        url = f"https://serpapi.com/search.json?engine=google_news&q={query}&api_key={SERPAPI_KEY}"
        response = requests.get(url)
        data = response.json()

        articles = []
        if "news_results" in data:
            for news in data["news_results"][:10]:  # Get top 10 news articles
                # Additional filtering to ensure relevance
                title = news['title'].lower()
                if any(keyword in title for keyword in ['stock', 'share', 'price', 'market', 'invest', 'earning']):
                    articles.append({
                        'title': news['title'],
                        'description': news.get('snippet', news['title']),
                        'source': news['source']['name'],
                        'publishedAt': news['date'],
                        'url': news['link'],
                        'urlToImage': news.get('thumbnail', '')
                    })

        return JsonResponse({
            'success': True,
            'symbol': symbol,
            'articles': articles,
            'totalResults': len(articles)
        })

    except Exception as e:
        print(f"Error fetching news for {symbol}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': "Failed to fetch news"
        })

def get_stock_info(request, security_id):
    """
    Fetch stock data using yfinance & real-time price from Google Finance.
    """
    try:
        stock = get_object_or_404(Stock, security_id=security_id.upper())

        # Get real-time stock price and updated time
        real_time_price, price_source, updated_time = fetch_real_time_price(stock.security_id, stock.code)

        # Determine Yahoo Finance ticker suffix based on price source
        ticker_suffix = ".NS" if price_source == "NSE" else ".BO" if price_source == "BSE" else None
        stock_info = {}

        if ticker_suffix:
            ticker_symbol = stock.security_id + ticker_suffix
            try:
                ticker = yf.Ticker(ticker_symbol)
                stock_info = ticker.info
            except Exception as e:
                print(f"Error fetching stock info from Yahoo Finance: {e}")

        # Override real-time price with Google Finance price if available
        stock_info["realTimePrice"] = real_time_price if real_time_price else stock_info.get("regularMarketPrice", "N/A")
        stock_info["priceSource"] = price_source if price_source else "Yahoo Finance"

        # Use the Google Finance timestamp for `updatedOn`
        stock_info["updatedOn"] = updated_time

        # Calculate change and pChange
        previous_close = stock_info.get("previousClose", stock_info.get("regularMarketPreviousClose", "N/A"))

        if isinstance(real_time_price, (int, float)) and isinstance(previous_close, (int, float)) and previous_close > 0:
            change = real_time_price - previous_close
            pChange = (change / previous_close) * 100

            stock_info["change"] = f"{'+' if change > 0 else ''}{change:.2f}"
            stock_info["pChange"] = f"{'+' if pChange > 0 else ''}{pChange:.2f}%"
        else:
            stock_info["change"] = "N/A"
            stock_info["pChange"] = "N/A"

        return JsonResponse({"success": True, "data": stock_info}, json_dumps_params={'ensure_ascii': False})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

def get_random_stocks(request):
    """
    Fetch 5 random stocks from the database.
    """
    try:
        stocks = list(Stock.objects.all())
        random.shuffle(stocks)
        selected_stocks = stocks[:5]
        data = [{"name": stock.name, "ticker": stock.security_id} for stock in selected_stocks]

        return JsonResponse({"success": True, "data": data})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

def get_historical_data(request, security_id):
    """
    Fetch historical stock data from Yahoo Finance for NSE (`.NS`) and BSE (`.BO`).
    Users can select:
    - `1M`  (Last 1 Month)
    - `6M`  (Last 6 Months)
    - `1Y`  (Last 1 Year)
    - `3Y`  (Last 3 Years)
    - `5Y`  (Last 5 Years)
    - `10Y` (Last 10 Years)
    - `MAX` (All Available Data)
    
    If `.NS` fails, it will automatically check `.BO`.
    """
    try:
        stock = get_object_or_404(Stock, security_id=security_id.upper())

        # Define NSE & BSE tickers
        ticker_ns = f"{security_id}.NS"
        ticker_bo = f"{security_id}.BO"

        # Get user-selected timeframe
        timeframe = request.GET.get("timeframe", "1Y").upper()  # Default: 1 Year

        # Determine start_date based on selected timeframe
        end_date = datetime.today().strftime("%Y-%m-%d")  # Default: Today
        
        timeframe_mapping = {
            "1M": 30,
            "6M": 182,
            "1Y": 365,
            "3Y": 3 * 365,
            "5Y": 5 * 365,
            "10Y": 10 * 365,
            "MAX": None  # Special case
        }
        
        if timeframe not in timeframe_mapping:
            return JsonResponse({"success": False, "error": "Invalid timeframe selected."})
            
        if timeframe == "MAX":
            start_date = "1900-01-01"  # Fetch all available data
        else:
            days = timeframe_mapping[timeframe]
            start_date = (datetime.today() - timedelta(days=days)).strftime("%Y-%m-%d")

        # Helper function to format dataframe for JSON response
        def format_dataframe(df):
            if df.empty:
                return []
            df = df.reset_index()
            df["Date"] = df["Date"].astype(str)  # Convert Date to string for JSON
            df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
            return df.to_dict(orient="records")

        # Try fetching NSE (`.NS`) data first
        try:
            df_ns = yf.download(ticker_ns, start=start_date, end=end_date)
            if not df_ns.empty:
                return JsonResponse({
                    "success": True,
                    "exchange": "NSE",
                    "ticker": ticker_ns,
                    "timeframe": timeframe,
                    "start_date": start_date,
                    "end_date": end_date,
                    "data": format_dataframe(df_ns),
                }, safe=False)
        except Exception as e:
            print(f"⚠️ NSE Fetch Failed: {e} -> Trying BSE ({ticker_bo})")

        # Try fetching BSE (`.BO`) data if `.NS` fails or returns empty
        try:
            df_bo = yf.download(ticker_bo, start=start_date, end=end_date)
            if not df_bo.empty:
                return JsonResponse({
                    "success": True,
                    "exchange": "BSE",
                    "ticker": ticker_bo,
                    "timeframe": timeframe,
                    "start_date": start_date,
                    "end_date": end_date,
                    "data": format_dataframe(df_bo),
                }, safe=False)
            else:
                raise ValueError(f"No data found for {ticker_bo}")
        except Exception as e:
            return JsonResponse({"success": False, "error": f"Both NSE & BSE failed: {str(e)}"})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

def get_current_price(symbol):
    ticker = yf.Ticker(f"{symbol}.NS")
    data = ticker.history(period="1d")
    if not data.empty:
        current_price = data['Close'].iloc[-1]
        return round(current_price, 2)
    else:
        return None

# Example usage
current_price = get_current_price("TATAMOTORS")
print(f"Current live price for TATAMOTORS: ₹{current_price}")

@api_view(["GET"])
def stock_analysis_view(request, stock_name):
    """
    Analyze stock using multiple Gemini models and summarize the best decision.
    """
    try:
        prompt = f"""You are a financial sentiment analysis model. Analyze the following stock data and provide a clear, concise, and professional assessment for traders and investors.

**Stock:** {stock_name}

**Current Live Price:** ₹{{current_price}}
**Predicted Price (Next Day):** ₹{{predicted_price}}
**Predicted Return:** {{predicted_return}}
**Probability of Upward Movement:** {{probability_up}}

**Recent News Highlights:** 
- JLR reports strong Q4 results, exceeding expectations due to increased demand for luxury vehicles and effective cost management.
- Tata Motors announces new partnerships to accelerate its EV development program.
- Concerns remain regarding the company's debt levels and the impact of rising raw material costs on profitability.

### Please provide:

1. **Overall Sentiment:** (e.g. Strongly Bullish, Slightly Bullish, Neutral, Slightly Bearish, Strongly Bearish)
2. **Summary Reasoning:** Summarize the impact of the above data points in under 100 words.
3. **Actionable Insight:** Should investors buy, hold, or sell this stock tomorrow?

Respond concisely and clearly for display in an executive dashboard.
"""
        

        # Get responses from both analysis models
        response_flash = gemini_models["flash"].generate_content(prompt)
        

        analysis_flash = response_flash.text if response_flash else "No response from Flash model."
        #analysis_flash_lite = response_flash_lite.text if response_flash_lite else "No response from Flash Lite model."
       
        # Combine both responses for Ultra summarization
        combined_analysis = f"Model 1 (Flash): {analysis_flash}"

        # Use Gemini Ultra to summarize and choose the best decision
        summarization_prompt = f"""
        Given these three analyses, summarize the insights and choose the best BUY/SELL recommendation.
	And don't use model,etc words please and don't use both models or anything because we have to show only one summary and the best one you choose
        Ensure you provide:
        - A clear BUY/SELL decision for both Short-Term and Long-Term.
        - The strongest 5 pros and 5 cons.
        - Keep it structured, accurate, and concise.
        Here is the analysis:\n\n{combined_analysis}
        """
        response_ultra = gemini_models["flash"].generate_content(summarization_prompt)
        final_summary = response_ultra.text if response_ultra else "No summary available."

        return Response({
            "stock": stock_name,
            "summary": final_summary
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)
