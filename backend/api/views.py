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
import pandas_market_calendars as mcal
from jugaad_data.nse import NSELive # Import NSELive
from datetime import datetime
from rest_framework import status
from datetime import date, datetime # Import date and datetime
from dateutil.relativedelta import relativedelta # Import relativedelta
from nsetools import Nse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import StockDB
nse = Nse()



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

import requests
from django.http import JsonResponse

from django.http import JsonResponse
import requests

def get_stock_news(request, symbol):
    """
    Fetch stock-specific news using Marketaux API.
    """
    api_token = "jcPHtzPtFX6Qzy8k20W6Oq6Z3yVTaFERHOjuNcQl"

    # Map symbols to full company names for Marketaux search
    stock_queries = {
        'TATAMOTORS': 'Tata Motors',
        'INFY': 'Infosys',
        'RELIANCE': 'Reliance Industries',
        'HDFCBANK': 'HDFC Bank',
        'TCS': 'TCS',
        'SBIN': 'State Bank of India'
    }
    company = stock_queries.get(symbol.upper(), symbol)

    url = f"https://api.marketaux.com/v1/news/all?api_token={api_token}&filter_entities=true&language=en&search={company}"

    try:
        response = requests.get(url)
        if response.status_code != 200:
            return JsonResponse({
                "success": False,
                "error": f"Marketaux API error: {response.status_code}",
                "message": response.text
            })

        data = response.json()

        # Format articles cleanly for React
        articles = []
        for item in data.get("data", []):
            articles.append({
                "title": item.get("title"),
                "description": item.get("description"),
                "source": item.get("source"),
                "publishedAt": item.get("published_at"),
                "url": item.get("url"),
                "urlToImage": item.get("image_url")
            })

        return JsonResponse({
            "success": True,
            "symbol": symbol,
            "articles": articles,
            "totalResults": len(articles)
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e),
            "message": "Failed to fetch news"
        })

def get_stock_info(request, security_id):
    """
    Fetch stock data using yfinance & real-time price from Google Finance.
    """
    try:
        stock = Stock.objects.filter(security_id=security_id.upper()).first()
        if not stock:
            return JsonResponse({"success": False, "message": f"Stock with security ID {security_id} not found."}, status=404)

        # Your existing logic fetching price info and stock_info dictionary here
        real_time_price, price_source, updated_time = fetch_real_time_price(stock.security_id, stock.code)

        # Set up ticker and get the info from yfinance
        ticker_suffix = ".NS" if price_source == "NSE" else ".BO" if price_source == "BSE" else None
        stock_info = {}
        if ticker_suffix:
            ticker_symbol = stock.security_id + ticker_suffix
            try:
                ticker = yf.Ticker(ticker_symbol)
                stock_info = ticker.info
            except Exception as e:
                print(f"Error fetching stock info from Yahoo Finance: {e}")

        stock_info["realTimePrice"] = real_time_price if real_time_price else stock_info.get("regularMarketPrice", "N/A")
        stock_info["priceSource"] = price_source if price_source else "Yahoo Finance"
        stock_info["updatedOn"] = updated_time

        previous_close = stock_info.get("previousClose", stock_info.get("regularMarketPreviousClose", "N/A"))

        if isinstance(real_time_price, (int, float)) and isinstance(previous_close, (int, float)) and previous_close > 0:
            change = real_time_price - previous_close
            pChange = (change / previous_close) * 100
            stock_info["change"] = f"{'+' if change > 0 else ''}{change:.2f}"
            stock_info["pChange"] = f"{'+' if pChange > 0 else ''}{pChange:.2f}%"
        else:
            stock_info["change"] = "N/A"
            stock_info["pChange"] = "N/A"

        # **IMPORTANT:** return a valid response here
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
    """
    try:
        stock = get_object_or_404(Stock, security_id=security_id.upper())

        ticker_ns = f"{security_id}.NS"
        ticker_bo = f"{security_id}.BO"

        timeframe = request.GET.get("timeframe", "1Y").upper()

        end_date = datetime.today().strftime("%Y-%m-%d")

        timeframe_mapping = {
            "1D": 2,
            "1W": 7,
            "1M": 30,
            "6M": 182,
            "1Y": 365,
            "3Y": 3 * 365,
            "5Y": 5 * 365,
            "10Y": 10 * 365,
            "MAX": None
        }

        if timeframe not in timeframe_mapping:
            return JsonResponse({"success": False, "error": "Invalid timeframe selected."})

        if timeframe == "MAX":
            start_date = "1900-01-01"

        elif timeframe == "1D":
            nse = mcal.get_calendar('NSE')
            schedule = nse.schedule.loc[
                (datetime.today() - timedelta(days=7)).strftime('%Y-%m-%d'):
                datetime.today().strftime('%Y-%m-%d')
            ]
            if not schedule.empty:
                # Latest previous trading day
                start_date = schedule.index[-1].strftime('%Y-%m-%d')
            else:
                # Fallback to previous weekday if no trading day found in last week
                start_date = (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d")
        
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

@api_view(["GET"])
def stock_analysis_view(request, stock_name):
    """
    Analyze stock using Gemini model, summarizing best decision including real-time price and latest news.
    """
    try:
        # Fetch stock object
        stock = get_object_or_404(Stock, security_id=stock_name.upper())

        # ✅ Fetch real-time price
        price, price_source, updated_time = fetch_real_time_price(stock.security_id, stock.code)
        price_text = f"₹{price}" if price is not None else "Unavailable"

        # ✅ Fetch latest news headlines (using your get_stock_news logic directly here)
        SERPAPI_KEY = "5f9caf868363cac1080e4f99576ce05edb4632548b7ae0c0fa0b952c18e1baba"
        query = f"{stock_name} Indian stock Market"
        news_url = f"https://serpapi.com/search.json?engine=google_news&q={query}&api_key={SERPAPI_KEY}"
        news_response = requests.get(news_url).json()

        # Extract top 5 news headlines
        news_items = []
        if "news_results" in news_response:
            for news in news_response["news_results"][:5]:
                title = news['title']
                snippet = news.get('snippet', '')
                news_items.append(f"- {title}: {snippet}")

        news_text = "\n".join(news_items) if news_items else "No major news found."

        # 🔑 Build Gemini prompt with price & news
        summarization_prompt = f"""
        Analyze the stock {stock_name} with the current real-time price of {price_text}.
        don't give any disclaimer.
        
        Recent News:
        {news_text}

        Provide:
        - A clear BUY/SELL decision for both Short-Term and Long-Term.
        - Trading Levels
        - The strongest 5 pros and 5 cons.
        
        - Structured, professional, actionable summary (no mention of models or internal prompts).
	- i don't want these types or anything like this in results (Okay, here's an analysis of WSFX Global Pay (currently at ₹69.1), based on the provided information. Note that this analysis is based solely on the limited information you've provided and does not constitute comprehensive financial advice. Always conduct your own thorough research before making investment decisions.)
	- Sequence of the results should be (Summary, Trading Levels, Some News, pros and cons)
        """

        # 🔥 Call Gemini for summarization
        response_flash = gemini_models["flash"].generate_content(summarization_prompt)
        final_summary = response_flash.text if response_flash else "No summary available."

        return Response({
            "stock": stock_name,
            "real_time_price": price_text,
            "price_source": price_source,
            "updated_time": updated_time,
            "news_headlines": news_items,
            "summary": final_summary
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)



@api_view(['GET'])
def get_top_gainers(request):
    from nsetools import Nse
    nse = Nse()

    try:
        gainers_data = nse.get_top_gainers()
        if not gainers_data:
            return JsonResponse({'success': False, 'data': [], 'message': 'No gainers today.'})

        gainers = []
        for item in gainers_data:
            gainers.append({
                'symbol': item.get('symbol'),
                'lastPrice': item.get('ltp'),
                'pChange': item.get('perChange'),
                'highPrice': item.get('dayHigh'),
                'lowPrice': item.get('dayLow')
            })

        return JsonResponse({'success': True, 'data': gainers})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
@api_view(['GET'])
def get_top_losers(request):
    try:
        losers = nse.get_top_losers()
        data = [{
            "symbol": l['symbol'],
            "ltp": l['ltp'],
            "perChange": l['perChange']
        } for l in losers]
        return Response({"success": True, "data": data})
    except Exception as e:
        return Response({"success": False, "error": str(e)})
        
@api_view(['GET'])
def get_stock_financials(request):
    symbol = request.GET.get('symbol')
    if not symbol:
        return Response({"success": False, "error": "Symbol query parameter is required."})

    try:
        ticker = yf.Ticker(symbol.upper())
        financials = ticker.financials
        balance_sheet = ticker.balance_sheet

        if financials.empty or balance_sheet.empty:
            return Response({"success": False, "error": "Financial data not available."})

        latest_period = financials.columns[0]

        # Safely extract revenue and profit
        revenue = financials.loc['Total Revenue'][latest_period] if 'Total Revenue' in financials.index else None
        profit = financials.loc['Net Income'][latest_period] if 'Net Income' in financials.index else None

        # Safely extract assets
        assets = balance_sheet.loc['Total Assets'][latest_period] if 'Total Assets' in balance_sheet.index else None

        # Safely extract liabilities using known keys
        liabilities = None
        for liab_key in ['Total Liab', 'Total Liabilities', 'Total Debt']:
            if liab_key in balance_sheet.index:
                liabilities = balance_sheet.loc[liab_key][latest_period]
                break

        # Calculate net worth if both are available
        net_worth = assets - liabilities if (assets is not None and liabilities is not None) else None

        # Format large numbers for readability (convert to INR Crores)
        def format_inr_crores(value):
            if value is None:
                return "N/A"
            return f"₹{value / 1e7:,.2f} Cr"

        data = {
            "symbol": symbol.upper(),
            "revenue": format_inr_crores(revenue),
            "profit": format_inr_crores(profit),
            "net_worth": format_inr_crores(net_worth)
        }
        return Response({"success": True, "data": data})

    except Exception as e:
        return Response({"success": False, "error": str(e)})
        


# In your Django app's views.py

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from jugaad_data.nse import NSELive
from datetime import date, datetime # Import date and datetime
from dateutil.relativedelta import relativedelta # Import relativedelta

@api_view(['GET'])
def get_stock_announcements(request, symbol):
    """
    Fetch recent corporate announcements for a given NSE stock symbol.
    """
    try:
        today = date.today()
        six_months_ago = today - relativedelta(months=6)
        n = NSELive()

        all_announcements = n.corporate_announcements(symbol=symbol)

        filtered_announcements = []
        for ann in all_announcements:
            date_time_str = ann.get("an_dt", "")
            if not date_time_str:
                continue
            try:
                announcement_datetime = datetime.strptime(date_time_str, '%d-%b-%Y %H:%M:%S')
                announcement_date = announcement_datetime.date()
                if announcement_date >= six_months_ago:
                    filtered_announcements.append({
                        "date": date_time_str,
                        "subject": ann.get("subject", ann.get("desc", "N/A")),
                        "attachment": ann.get("attchmntFile", "N/A")
                    })
            except ValueError as e:
                print(f"Could not parse date {date_time_str}: {e}")

        # Sort by date, newest first
        filtered_announcements.sort(
            key=lambda x: datetime.strptime(x["date"], '%d-%b-%Y %H:%M:%S'),
            reverse=True
        )

        return Response({
            "success": True,
            "symbol": symbol,
            "total": len(filtered_announcements),
            "announcements": filtered_announcements
        })

    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=500)


@api_view(['GET'])
def get_peers(request, security_id):
    try:
        stock = StockDB.objects.get(security_id=security_id)
        industry = stock.industry
        sector = stock.sector_index

        peers_data = []

        if industry:
            peers = StockDB.objects.filter(industry=industry).exclude(security_id=security_id)
            peers_data = [{
                "security_id": peer.security_id,
                "name": peer.name,
                "industry": peer.industry
            } for peer in peers]

        # If no peers found by industry, fallback to sector_index
        if not peers_data and sector:
            peers = StockDB.objects.filter(sector_index=sector).exclude(security_id=security_id)
            peers_data = [{
                "security_id": peer.security_id,
                "name": peer.name,
                "sector_index": peer.sector_index
            } for peer in peers]

        return Response({
            "success": True,
            "security_id": security_id,
            "industry": industry,
            "sector_index": sector,
            "peers": peers_data
        })

    except StockDB.DoesNotExist:
        return Response({
            "success": False,
            "error": "Stock not found"
        })

@api_view(['GET'])
def get_stock_events(request, security_id):
    try:
        n = NSELive()
        announcements = n.corporate_announcements(symbol=security_id)
        events = []

        # Filter corporate announcements for past 1 year
        one_year_ago = datetime.now() - timedelta(days=365)
        for ann in announcements:
            ann_date = datetime.strptime(ann['an_dt'], "%d-%b-%Y %H:%M:%S")
            if ann_date >= one_year_ago:
                events.append({
                    "date": ann['an_dt'],
                    "subject": ann.get('subject') or ann.get('desc'),
                    "attachment": ann.get('attchmntFile')
                })

        # --- YFinance data ---
        stock = yf.Ticker(f"{security_id}.NS")

        # Splits
        splits_raw = stock.splits.to_dict()
        splits = []
        for date, value in splits_raw.items():
            splits.append({
                "date": date.strftime("%Y-%m-%d") if hasattr(date, 'strftime') else str(date),
                "split_ratio": f"1:{int(value)}"
            })

        # Dividends
        dividends_raw = stock.dividends.to_dict()
        dividends = []
        for date, amount in dividends_raw.items():
            dividends.append({
                "date": date.strftime("%Y-%m-%d") if hasattr(date, 'strftime') else str(date),
                "amount": float(amount)
            })

        # Quarterly Results
        quarterly_financials = stock.quarterly_financials
        quarterly_results = []
        if not quarterly_financials.empty:
            for date in quarterly_financials.columns:
                data = quarterly_financials[date].dropna().to_dict()
                quarterly_results.append({
                    "date": str(date.date()) if hasattr(date, 'date') else str(date),
                    "data": {k: float(v) if isinstance(v, (int, float)) else str(v) for k, v in data.items()}
                })

        # Annual Results + Revenue + Net Income (Profit/Loss)
        annual_financials = stock.financials
        annual_results = []
        yearly_revenue_profit = []
        if not annual_financials.empty:
            for date in annual_financials.columns:
                data = annual_financials[date].dropna().to_dict()
                annual_results.append({
                    "date": str(date.date()) if hasattr(date, 'date') else str(date),
                    "data": {k: float(v) if isinstance(v, (int, float)) else str(v) for k, v in data.items()}
                })

                # Extract revenue and net income if present
                revenue = data.get('Total Revenue') or data.get('TotalRevenue')
                net_income = data.get('Net Income') or data.get('NetIncome')

                yearly_revenue_profit.append({
                    "date": str(date.date()) if hasattr(date, 'date') else str(date),
                    "total_revenue": float(revenue) if revenue else None,
                    "net_income": float(net_income) if net_income else None
                })

        # --- Final Response ---
        return Response({
            "success": True,
            "security_id": security_id,
            "splits": splits,
            "dividends": dividends,
            "quarterly_results": quarterly_results,
            "annual_results": annual_results,
            "yearly_revenue_profit": yearly_revenue_profit,
            "events": events
        })

    except Exception as e:
        return Response({
            "success": False,
            "error": str(e)
        })

from rest_framework.decorators import api_view
@api_view(["GET"])
def get_moving_averages(request, security_id):
    try:
        ticker = f"{security_id.upper()}.NS"
        end_date = datetime.today()
        start_date = end_date - timedelta(days=4549)

        df = yf.download(ticker, start=start_date, end=end_date, group_by='ticker', auto_adjust=True)

        if df.empty:
            return Response({
                "success": True,
                "ticker": security_id,
                "exchange": "NSE",
                "data_points": 0,
                "data": []
            })

        # Flatten multi-index columns
        df.columns = ['_'.join(filter(None, col)).strip() if isinstance(col, tuple) else col for col in df.columns]

        # Find Close column dynamically
        close_col = next((col for col in df.columns if "Close" in col), None)
        if not close_col:
            return Response({"success": False, "error": f"No Close column found in: {df.columns.tolist()}"})

        # ✅ This part must be outside the `if not close_col` block
        df["MA10"] = df[close_col].rolling(window=10).mean()
        df["MA20"] = df[close_col].rolling(window=20).mean()
        df["MA100"] = df[close_col].rolling(window=100).mean()
        df = df.reset_index()
        df["Date"] = df["Date"].astype(str)

        # Prepare output
        result_df = df[["Date", close_col, "MA10", "MA20", "MA100"]].dropna()
        result_df.rename(columns={close_col: "Close"}, inplace=True)

        return Response({
            "success": True,
            "ticker": security_id,
            "exchange": "NSE",
            "data_points": len(result_df),
            "data": result_df.to_dict(orient="records")
        })

    except Exception as e:
        return Response({"success": False, "error": str(e)})


@api_view(['GET'])
def get_intraday_stock_data(request, symbol):
    symbol = symbol.upper() + ".NS"  # default to NSE
    stock = yf.Ticker(symbol)
    interval = request.GET.get('interval', '5m')  # Default to 5-minute data
    period = request.GET.get('period', '5d')      # Default to 1-day data

    try:
        stock = yf.Ticker(symbol)
        df = stock.history(interval=interval, period=period)

        if df.empty:
            return Response({"success": False, "error": "No data found for this interval and period."}, status=404)

        df.reset_index(inplace=True)
        df['Datetime'] = df['Datetime'].astype(str)

        data = df[['Datetime', 'Open', 'High', 'Low', 'Close', 'Volume']].to_dict(orient='records')

        return Response({"success": True, "symbol": symbol, "interval": interval, "period": period, "data": data})
    except Exception as e:
        return Response({"success": False, "error": str(e)}, status=500)
