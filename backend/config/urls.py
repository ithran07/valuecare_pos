from django.contrib import admin
from django.urls import include, path
from web_orders_proxy import WebOrderListProxyView, WebOrderDetailProxyView  # add

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/products/", include("products.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/customers/", include("customers.urls")),
    path("api/sales/", include("sales.urls")),
    path("api/purchasing/", include("purchasing.urls")),
    path("api/web-orders/", WebOrderListProxyView.as_view()),          # add
    path("api/web-orders/<int:pk>/", WebOrderDetailProxyView.as_view()),  # add
]