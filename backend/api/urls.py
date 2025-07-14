# backend/api/urls.py
from django.urls import path
from .views import (
    home,
    suggestions,
    get_stock_info,
    get_random_stocks,
    get_historical_data,
    get_stock_news,
    stock_analysis_view,
    get_stock_prediction  # <--- ADD THIS LINE
)

urlpatterns = [
    path('', home, name='home'),
    path('suggestions/', suggestions, name='suggestions'),
    path('stock/<str:security_id>/', get_stock_info, name='get_stock_info'),
    path('news/<str:symbol>/', get_stock_news, name='get_stock_news'),
    path('random-stocks/', get_random_stocks, name='get_random_stocks'),
    path("stock/<str:security_id>/history/", get_historical_data, name="get_historical_data"),
    path('analyze/<str:stock_name>/', stock_analysis_view, name='stock_analysis'),
    path('predictions/<str:security_id>/', get_stock_prediction, name='get_stock_prediction'), # Corrected parameter name here too for consistency
]
