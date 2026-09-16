# medical-supplier-pos-part-3/backend/sales/urls.py
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet

router = DefaultRouter()
router.register("", SaleViewSet)
urlpatterns = router.urls
