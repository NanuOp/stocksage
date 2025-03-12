import requests
from bs4 import BeautifulSoup
import json
from django.http import JsonResponse
from django.db.models import Q
from django.shortcuts import get_object_or_404
from bsedata.bse import BSE
from api.models import Stock  # Ensure 'Stock' is your model name
import random
import re

# Initialize BSE object
bse = BSE()

def home(request):
    return JsonResponse({"message": "Hello from Django!"})


def suggestions(request):
    """
    Search for stocks by name or code.
    Suggest companies that start with the query first.
    If fewer than 10 matches, include those that contain the query.
    """
    query = request.GET.get("q", "").strip()

    if not query:
        return JsonResponse({"success": False, "data": []})

    # Get companies that start with the query
    starting_stocks = Stock.objects.filter(
        Q(name__istartswith=query) | Q(code__istartswith=query)
    )

    # If fewer than 10 results, get additional ones that contain the query
    if starting_stocks.count() < 10:
        containing_stocks = Stock.objects.filter(
            Q(name__icontains=query) | Q(code__icontains=query)
        ).exclude(id__in=starting_stocks)  # Avoid duplicates

        # Combine both results
        stocks = list(starting_stocks) + list(containing_stocks[:10 - starting_stocks.count()])
    else:
        stocks = list(starting_stocks[:10])  # Limit to 10 results

    data = [{"name": stock.name, "code": stock.code} for stock in stocks]

    return JsonResponse({"success": True, "data": data})

def get_stock_info(request, code):
    """
    Fetch stock details from BSE API and company overview from Screener.in.
    """
    stock = get_object_or_404(Stock, code=code)

    try:
        quote = bse.getQuote(code)
        if not quote:
            return JsonResponse({"success": False, "message": f"No data found for stock code {code}"}, status=404)

        stock_data = {k: v for k, v in quote.items() if k not in ["buy", "sell"]}
        stock_data["about"] = fetch_company_overview(stock.name, stock.code)

        return JsonResponse({"success": True, "data": stock_data})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

def get_random_stocks(request):
    """
    Fetch 5 random stocks from the database.
    """
    stocks = list(Stock.objects.all())
    random.shuffle(stocks)
    selected_stocks = stocks[:5]  
    data = [{"name": stock.name, "code": stock.code} for stock in selected_stocks]

    return JsonResponse({"success": True, "data": data})

def fetch_company_overview(symbol, code):
    """
    Fetches company overview from Screener.in using stock symbol and code.
    Removes everything after 'Read More'.
    """
    base_url = "https://www.screener.in/company/"
    possible_urls = [
        f"{base_url}{symbol}/",
        f"{base_url}{symbol}/consolidated/",
        f"{base_url}{code}/",
        f"{base_url}{code}/consolidated/",
    ]

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    for url in possible_urls:
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, "html.parser")
                
                company_info_div = soup.find("div", class_="company-info")
                if not company_info_div:
                    continue
                
                for a_tag in company_info_div.find_all("a"):
                    a_tag.decompose()
                
                text_content = company_info_div.get_text(" ", strip=True)
                
                if "Read More" in text_content:
                    overview = text_content.split("Read More")[0]
                    return {"overview": overview.strip()}
                
                return {"overview": text_content.strip()}

        except Exception as e:
            print(f"Error fetching {url}: {e}")
            continue  
    
    return {"error": "Company information not available."}

def get_company_overview(request, stock_code):
    """
    Fetches company overview from Screener.in for a given stock code.
    """
    stock = get_object_or_404(Stock, code=stock_code)
    overview = fetch_company_overview(stock.name, stock.code)

    return JsonResponse({
        "success": True,
        "stock_code": stock.code,
        "company_name": stock.name,
        "company_overview": overview
    })