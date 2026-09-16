# medical-supplier-pos-part-3/backend/products/urls.py
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, UnitViewSet, ProductViewSet

router = DefaultRouter()
router.register("categories", CategoryViewSet)
router.register("units", UnitViewSet)
router.register("", ProductViewSet)

urlpatterns = router.urls
