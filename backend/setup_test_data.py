#!/usr/bin/env python
import os
import django
from datetime import timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import User
from customers.models import Customer
from products.models import Category, Unit, Product
from inventory.models import Warehouse, ProductBatch
from sales.models import Sale, SaleItem, Payment
from django.utils import timezone

User = get_user_model()

# Create test users
users = [
    {'username': 'admin', 'employee_id': 'admin', 'password': 'admin123', 'first_name': 'Admin', 'last_name': 'User', 'role': 'SUPER_ADMIN'},
    {'username': 'sales1', 'employee_id': 'sales1', 'password': 'sales123', 'first_name': 'Sales', 'last_name': 'User', 'role': 'SALES'},
    {'username': 'manager1', 'employee_id': 'manager1', 'password': 'manager123', 'first_name': 'Manager', 'last_name': 'User', 'role': 'MANAGER'},
]

for user_data in users:
    password = user_data.pop('password')
    user_id = user_data['employee_id']
    if not User.objects.filter(employee_id=user_id).exists():
        user = User.objects.create_user(**user_data, password=password)
        print(f'Created: {user.employee_id} ({user.role})')
    else:
        user = User.objects.get(employee_id=user_id)
        user.set_password(password)
        user.save()
        print(f'Updated: {user_id}')

# Create test customer
if not Customer.objects.filter(code='CUST001').exists():
    customer = Customer.objects.create(
        code='CUST001',
        business_name='Test Clinic',
        customer_type='CLINIC',
        phone='555-1234',
        email='clinic@test.com'
    )
    print(f'Created customer: {customer.business_name}')
else:
    customer = Customer.objects.get(code='CUST001')

# Create test category
if not Category.objects.filter(name='Medications').exists():
    cat = Category.objects.create(name='Medications')
    print(f'Created category: {cat.name}')
else:
    cat = Category.objects.get(name='Medications')

# Create test unit
if not Unit.objects.filter(name='Box').exists():
    unit = Unit.objects.create(name='Box', abbreviation='box')
    print(f'Created unit: {unit.name}')
else:
    unit = Unit.objects.get(name='Box')

# Create test product
if not Product.objects.filter(sku='MED001').exists():
    product = Product.objects.create(
        sku='MED001',
        barcode='123456789',
        name='Test Medicine',
        category=cat,
        unit=unit,
        cost_price=Decimal('50.00'),
        selling_price=Decimal('75.00'),
        minimum_stock=Decimal('10'),
        reorder_level=Decimal('20')
    )
    print(f'Created product: {product.name}')
else:
    product = Product.objects.get(sku='MED001')

# Create test warehouse
if not Warehouse.objects.filter(code='WH001').exists():
    warehouse = Warehouse.objects.create(
        code='WH001',
        name='Main Warehouse'
    )
    print(f'Created warehouse: {warehouse.name}')
else:
    warehouse = Warehouse.objects.get(code='WH001')

# Create test batch
if not ProductBatch.objects.filter(batch_number='BATCH001').exists():
    batch = ProductBatch.objects.create(
        product=product,
        warehouse=warehouse,
        batch_number='BATCH001',
        quantity=Decimal('100'),
        received_quantity=Decimal('100'),
        unit_cost=Decimal('50.00'),
        expiration_date=timezone.localdate() + timedelta(days=365)
    )
    print(f'Created batch: {batch.batch_number}')
else:
    batch = ProductBatch.objects.get(batch_number='BATCH001')

# Create test sales for today
sales_admin = User.objects.get(employee_id='admin')
today = timezone.now()

# Always delete and recreate for testing
Sale.objects.filter(created_at__date=today.date()).delete()

# Create multiple test sales
for i in range(2):
    sale = Sale.objects.create(
        invoice_number=f'INV-{today.strftime("%Y%m%d")}-{i+1:03d}',
        customer=customer,
        sold_by=sales_admin,
        status='COMPLETED',
        payment_status='PAID',
        subtotal=Decimal('225.00'),
        tax=Decimal('0.00'),
        discount=Decimal('0.00'),
        total=Decimal('225.00'),
        amount_paid=Decimal('225.00'),
        change_amount=Decimal('0.00'),
        created_at=today
    )
    
    # Add sale item
    SaleItem.objects.create(
        sale=sale,
        product=product,
        quantity=Decimal('3'),
        unit_price=Decimal('75.00'),
        line_total=Decimal('225.00')
    )
    
    # Add payment
    Payment.objects.create(
        sale=sale,
        method='CASH',
        amount=Decimal('225.00')
    )
    
    print(f'Created sale: {sale.invoice_number}')

print('\nTest data setup completed!')
