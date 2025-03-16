import requests
import yfinance as yf
import json
import random
from bs4 import BeautifulSoup
from django.http import JsonResponse
from django.db.models import Q
from django.shortcuts import get_object_or_404
from api.models import Stock
import datetime

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


def get_stock_info(request, security_id):
    """
    Fetch stock data using yfinance & real-time price from Google Finance.
    """
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

    # Define required fields
    required_fields = {
        "companyName": "longName",
        "realTimePrice": "regularMarketPrice",
        "previousClose": "regularMarketPreviousClose",
        "updatedOn": "regularMarketTime",
        "address": "address1",
        "city": "city",
        "zip": "zip",
        "country": "country",
        "contact": "phone",
        "website": "website",
        "industry": "industry",
        "sector": "sector",
        "longBusinessSummary": "longBusinessSummary",
        "fullTimeEmployees": "fullTimeEmployees",
        "marketCap": "marketCap",
        "dayHigh": "dayHigh",
        "dayLow": "dayLow",
        "open": "open",
        "totalRevenue": "totalRevenue",
        "debtToEquity": "debtToEquity",
        "trailingPE": "trailingPE",
        "forwardPE": "forwardPE",
        "volume": "volume",
        "fiftyTwoWeekHigh": "fiftyTwoWeekHigh",
        "fiftyTwoWeekLow": "fiftyTwoWeekLow",
        "quoteType": "quoteType",
        "grossProfits": "grossProfits",
        "totalDebt": "totalDebt",
        "previousClose": "previousClose", 
        "open":"open", 
        "beta": "beta",
        "trailingPE": "trailingPE",
    }

    # Extract only required fields
    # stock_info = {key: stock_info.get(field, "N/A") for key, field in required_fields.items()}

    # Override real-time price with Google Finance price if available
    stock_info["realTimePrice"] = real_time_price if real_time_price else stock_info["realTimePrice"]
    stock_info["priceSource"] = price_source if price_source else "Yahoo Finance"

    # Use the Google Finance timestamp for `updatedOn`
    stock_info["updatedOn"] = updated_time

    # Calculate change and pChange
    previous_close = stock_info.get("previousClose", "N/A")

    if isinstance(real_time_price, (int, float)) and isinstance(previous_close, (int, float)) and previous_close > 0:
        change = real_time_price - previous_close
        pChange = (change / previous_close) * 100

        stock_info["change"] = f"{'+' if change > 0 else ''}{change:.2f}"
        stock_info["pChange"] = f"{'+' if pChange > 0 else ''}{pChange:.2f}%"
    else:
        stock_info["change"] = "N/A"
        stock_info["pChange"] = "N/A"

    return JsonResponse({"success": True, "data": stock_info}, json_dumps_params={'ensure_ascii': False})


def get_random_stocks(request):
    """
    Fetch 5 random stocks from the database.
    """
    stocks = list(Stock.objects.all())
    random.shuffle(stocks)
    selected_stocks = stocks[:5]
    data = [{"name": stock.name, "ticker": stock.security_id} for stock in selected_stocks]

    return JsonResponse({"success": True, "data": data})
