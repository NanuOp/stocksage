from django.urls import path
from .views import (
    home,
    suggestions,
    get_stock_info,
    get_random_stocks,
    get_historical_data,
    get_stock_news,
    stock_analysis_view,
    get_stock_prediction,
    get_top_gainers, 
    get_top_losers,
    get_stock_financials,
    get_stock_announcements,
    get_peers,
    get_stock_events,
    
    
)

urlpatterns = [
    path('', home, name='home'),
    path('suggestions/', suggestions, name='suggestions'),
    path('stock/<str:security_id>/', get_stock_info, name='get_stock_info'),
    path('news/<str:symbol>/', get_stock_news, name='get_stock_news'),
    path('random-stocks/', get_random_stocks, name='get_random_stocks'),
    path('stock/<str:security_id>/history/', get_historical_data, name='get_historical_data'),
    path('analyze/<str:stock_name>/', stock_analysis_view, name='stock_analysis'),
    path('predictions/<str:security_id>/', get_stock_prediction, name='get_stock_prediction'),
    path('top-gainers/', get_top_gainers, name='top-gainers'),
    path('top-losers/', get_top_losers, name='top-losers'),
    path('stock/<str:security_id>/peers/', get_peers, name='get_peers'),
    path('financials/<str:symbol>/', get_stock_financials, name='get_stock_financials'),
    path('announcements/<str:symbol>/', get_stock_announcements, name='get_stock_announcements'),
    path('stock/<str:security_id>/events/', get_stock_events, name='get_stock_events'),
    


]
