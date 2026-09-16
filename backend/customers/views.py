from rest_framework import viewsets, filters
from .models import Customer
from .serializers import CustomerSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("business_name")
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["code", "business_name", "contact_person", "phone", "email"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active") == "true":
            qs = qs.filter(is_active=True)
        return qs
