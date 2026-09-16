from django.contrib import admin
from .models import Sale, SaleItem, SaleBatchAllocation, Payment
admin.site.register(Sale)
admin.site.register(SaleItem)
admin.site.register(SaleBatchAllocation)
admin.site.register(Payment)
