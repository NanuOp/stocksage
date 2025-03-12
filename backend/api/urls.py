from django.urls import path, re_path
from .views import get_stock_info, suggestions, home, get_company_overview, get_random_stocks

urlpatterns = [
    path('home/', home, name='home'),
    path('stock/<str:code>/', get_stock_info, name='get_stock_info'),
    path("suggestions/", suggestions, name="stock"),
    path("company/<str:stock_code>/", get_company_overview, name="company_overview"),
    path("random-stocks/", get_random_stocks, name="random-stocks"),
    
    # Case-insensitive version (allows 'Company' or 'company')
    re_path(r"(?i)api/company/(?P<security_id>[\w-]+)/$", get_company_overview),
]