from django.shortcuts import render
from django.http import JsonResponse
from bsedata.bse import BSE

def home(request):
    return JsonResponse({"message": "Hello from Django!"})


# Initialize BSE object
b = BSE()

def get_stock_info(request, code):
    try:
        quote = b.getQuote(code)  # Fetch stock data from BSE
        if quote:
            # Filter out unnecessary fields
            filtered_data = {k: v for k, v in quote.items() if k not in ["buy", "sell"]}
            return JsonResponse({"success": True, "data": filtered_data})
        else:
            return JsonResponse({"success": False, "message": f"No data found for stock code {code}"}, status=404)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

