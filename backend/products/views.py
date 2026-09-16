from rest_framework import viewsets, filters
from .models import Category, Unit, Product
from .serializers import CategorySerializer, UnitSerializer, ProductSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer

class UnitViewSet(viewsets.ModelViewSet):
    queryset = Unit.objects.all().order_by("name")
    serializer_class = UnitSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "unit").all().order_by("name")
    serializer_class = ProductSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["sku", "barcode", "name", "brand", "manufacturer"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active") == "true":
            qs = qs.filter(is_active=True)
        return qs
