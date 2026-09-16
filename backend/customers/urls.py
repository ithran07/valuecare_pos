# medical-supplier-pos-part-3/backend/customers/urls.py
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet
router = DefaultRouter()
router.register("", CustomerViewSet)
urlpatterns = router.urls
