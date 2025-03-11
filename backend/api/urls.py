from django.urls import path
from .views import get_stock_info, suggestions, home, get_company_overview, get_random_stocks


urlpatterns = [
    path('home/', home, name = 'home'),
    path('stock/<str:code>/', get_stock_info, name='get_stock_info'),
    path("suggestions/", suggestions, name="stock"),
    path("company/<str:security_id>/", get_company_overview, name="get_company_overview"),  # New endpoint
    path("random-stocks/", get_random_stocks, name="random-stocks"),
]
