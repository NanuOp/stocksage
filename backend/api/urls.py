from django.urls import path
from .views import get_stock_info, suggestions, home, get_random_stocks

urlpatterns = [
    path("home/", home, name="home"),
    path("stock/<str:security_id>/", get_stock_info, name="get_stock_info"),  # Pass ticker (security_id)
    path("suggestions/", suggestions, name="stock_suggestions"),
    path("random-stocks/", get_random_stocks, name="random_stocks"),
]