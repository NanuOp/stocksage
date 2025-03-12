import requests
from bs4 import BeautifulSoup
from django.http import JsonResponse
from django.db.models import Q
from django.shortcuts import get_object_or_404
from bsedata.bse import BSE
from api.models import Stock  # Ensure 'Stock' is your model name
import random

# Initialize BSE object
bse = BSE()


def home(request):
    return JsonResponse({"message": "Hello from Django!"})


def suggestions(request):
    """
    Search for stocks by name or code.
    """
    query = request.GET.get("q", "").strip()

    if not query:
        return JsonResponse({"success": False, "data": []})

    stocks = Stock.objects.filter(Q(name__icontains=query) | Q(code__icontains=query))[:10]

    data = [{"name": stock.name, "code": stock.code} for stock in stocks]

    return JsonResponse({"success": True, "data": data})


def get_stock_info(request, code):
    """
    Fetch stock details from BSE API and company overview from Screener.in.
    """
    # Validate stock code by checking if it exists in the database
    stock = get_object_or_404(Stock, code=code)

    try:
        # Fetch stock data from BSE
        quote = bse.getQuote(code)
        if not quote:
            return JsonResponse({"success": False, "message": f"No data found for stock code {code}"}, status=404)

        # Remove unnecessary fields ('buy' and 'sell')
        stock_data = {k: v for k, v in quote.items() if k not in ["buy", "sell"]}

        # Fetch company overview from Screener.in
        about_section = fetch_company_overview(stock.name, stock.code)
        stock_data["about"] = about_section  # Add "About" section to response

        return JsonResponse({"success": True, "data": stock_data})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


def get_random_stocks(request):
    """
    Fetch 5 random stocks from the database.
    """
    stocks = list(Stock.objects.all())
    random.shuffle(stocks)
    selected_stocks = stocks[:5]  # Select 5 random stocks
    data = [{"name": stock.name, "code": stock.code} for stock in selected_stocks]

    return JsonResponse({"success": True, "data": data})


def fetch_company_overview(symbol, code):
    """
    Fetches company overview from Screener.in using stock symbol and code.
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

                # Locate the company info section
                company_info_div = soup.find("div", class_="company-info")

                if company_info_div:
                    for a_tag in company_info_div.find_all("a"):
                        a_tag.decompose()  # Remove links
                    return company_info_div.get_text(strip=True)

        except Exception as e:
            print(f"Error fetching {url}: {e}")
            continue  # Try the next URL

    return "Company information not available."


def get_company_overview(request, stock_code):
    """
    Fetches company overview from Screener.in for a given stock code.
    """
    stock = get_object_or_404(Stock, code=stock_code)  # Ensure stock exists

    # Fetch company overview from Screener.in
    overview = fetch_company_overview(stock.name, stock.code)

    return JsonResponse({
        "success": True,
        "stock_code": stock.code,
        "company_name": stock.name,
        "company_overview": overview
    })

