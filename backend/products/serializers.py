from rest_framework import serializers
from .models import Category, Unit, Product

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = "__all__"

class ProductSerializer(serializers.ModelSerializer):
    current_stock = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id","sku","barcode","name","description","category","category_name",
            "unit","unit_name","brand","manufacturer","cost_price","selling_price",
            "wholesale_price","minimum_stock","reorder_level","is_prescription",
            "is_active","current_stock","created_at","updated_at"
        ]
