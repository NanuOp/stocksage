from django.urls import path
from .views import home, get_stock_info


urlpatterns = [
    path("", home),
    path('stock/<str:code>/', get_stock_info, name='get_stock_info'),
]
