from django.urls import path
from .views import (
    get_stock_info, 
    suggestions, 
    home, 
    get_random_stocks, 
    get_historical_data  # Import the new view
)

urlpatterns = [
    path("home/", home, name="home"),
    path("stock/<str:security_id>/", get_stock_info, name="get_stock_info"),  
    path("stock/<str:security_id>/history/", get_historical_data, name="get_historical_data"),  # New route
    path("suggestions/", suggestions, name="stock_suggestions"),
    path("random-stocks/", get_random_stocks, name="random_stocks"),
]
