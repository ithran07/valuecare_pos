# medical-supplier-pos-part-3/backend/inventory/urls.py
from rest_framework.routers import DefaultRouter
from .views import ProductBatchViewSet, InventoryMovementViewSet, WarehouseViewSet

router = DefaultRouter()
router.register("batches", ProductBatchViewSet)
router.register("movements", InventoryMovementViewSet)
router.register("warehouses", WarehouseViewSet)
urlpatterns = router.urls