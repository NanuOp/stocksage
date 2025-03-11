import requests
from bs4 import BeautifulSoup
from django.http import JsonResponse
from django.db.models import Q
from django.shortcuts import get_object_or_404
from bsedata.bse import BSE
from api.models import Stock  # Replace 'your_app' with your actual app name
import random

# Initialize BSE object
bse = BSE()

def home(request):
    return JsonResponse({"message": "Hello from Django!"})


def suggestions(request):
    query = request.GET.get("q", "").strip()

    if not query:
        return JsonResponse({"success": False, "data": []})

    stocks = Stock.objects.filter(Q(name__icontains=query) | Q(code__icontains=query))[:10]

    data = [{"name": stock.name, "code": stock.code} for stock in stocks]
    
    return JsonResponse({"success": True, "data": data})


def get_stock_info(request, code):
    """
    View to fetch stock details from BSE API based on stock code and company overview from Google Finance.
    """
    # Validate stock code by checking if it exists in the database
    stock = get_object_or_404(Stock, code=code)

    try:
        # Fetch stock data from BSE
        quote = bse.getQuote(code)
        if not quote:
            return JsonResponse({"success": False, "message": f"No data found for stock code {code}"}, status=404)

        # Filter out unnecessary fields (excluding 'buy' and 'sell' sections)
        stock_data = {k: v for k, v in quote.items() if k not in ["buy", "sell"]}

        # Fetch company overview from Google Finance
        about_section = fetch_company_overview(stock.name)
        stock_data["about"] = about_section  # Add "About" section to response

        return JsonResponse({"success": True, "data": stock_data})

    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

def fetch_company_overview(security_id):
    """
    Fetch the company overview (About section) from Google Finance based on the security ID.
    It first checks NSE, then BOM (BSE).
    """
    exchanges = ["NSE", "BOM"]  # Prioritize NSE first, then BOM

    for exchange in exchanges:
        url = f"https://www.google.com/finance/quote/{security_id}:{exchange}?hl=en"
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})

        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            about_section_div = soup.find("div", class_="bLLb2d")

            if about_section_div:
                # Remove all <a> tags inside the div
                for a_tag in about_section_div.find_all("a"):
                    a_tag.decompose()

                return about_section_div.get_text(" ", strip=True)

    return "Company information not available."

def get_company_overview(request, security_id):
    """
    API endpoint to fetch company overview based on security ID.
    """
    # Ensure security ID exists in the database
    stock = get_object_or_404(Stock, security_id=security_id)

    # Fetch the company overview
    company_overview = fetch_company_overview(stock.security_id)

    return JsonResponse({"success": True, "security_id": security_id, "company_overview": company_overview})


def get_random_stocks(request):
    stocks = list(Stock.objects.all())
    random.shuffle(stocks)
    selected_stocks = stocks[:5]  # Select 5 random stocks
    data = [{"name": stock.name, "code": stock.code} for stock in selected_stocks]
    
    return JsonResponse({"success": True, "data": data})
