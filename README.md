# Medical Supplier POS — Part 3

## How the system works

The system separates the **product catalog** from **stock inventory**:

- **Products** defines what an item is: name, SKU, prices, category and unit.
- **Stock Receiving** records how many units arrived, including the batch
  number, quantity, cost and expiration date.
- **POS** sells received stock. The backend automatically consumes the earliest
  non-expired batch first (FEFO).

Creating a product does **not** add stock. Use the Stock Receiving workflow to
increase inventory.

### First-time setup workflow

1. Create a supplier in **Suppliers**.
2. Create the product in **Products**. This only creates the catalog item.
3. Optional: create a purchase order in **Purchasing**, add products and submit
   it.
4. Open **Stock Receiving** and click **New Goods Receipt**.
5. Select the supplier, warehouse and purchase order if one exists.
6. Add products, then enter each item's:
   - Batch number (required)
   - Manufacturing date (optional)
   - Expiration date (optional but recommended for medical stock)
   - Quantity (required and greater than zero)
   - Unit cost
7. Click **Record Goods Receipt**. The system creates or updates the batch,
   increases inventory, records a receipt movement and creates a supplier bill.
8. Open **POS** to sell the available stock.

### Why Stock Receiving may not appear

Stock Receiving is available to **Super Admin**, **Admin**, **Manager** and
**Warehouse** accounts. Sales and Accounting accounts do not have permission to
receive stock. If the menu is still missing after signing in as one of the
allowed roles, log out and back in after the role has been changed.

### Common distinction

- **Purchase order:** what you intend to buy.
- **Goods receipt:** what physically arrived and gets added to stock.
- **Supplier bill:** the payable amount generated from the received goods.
- **Product batch:** the stock record used by POS and FEFO allocation.

This part adds the actual sales/POS workflow on top of the Part 2 foundation.

## Added

- Customers
  - Walk-in
  - Clinic
  - Hospital
  - Pharmacy
  - Distributor
  - Contact information
  - Credit terms and credit limit fields
- Sales
  - Invoice number
  - Sale items
  - Payments
  - Payment status
  - Amount paid and change
  - Sales history
- FEFO inventory allocation
  - Non-expired batches only
  - Earliest expiration first
  - Can consume multiple batches for one line item
  - Row locking with `select_for_update()` to reduce race-condition overselling
- Inventory movement
  - Every checkout creates SALE movements with negative quantities
  - Each movement keeps the invoice reference
- Transaction safety
  - Checkout runs inside one database transaction
  - If allocation/payment fails, the transaction rolls back

## Important architecture

The expiration date stays on `ProductBatch`, not `Product`.

A medical supplier may have:

- Product: Syringe 5ml
- Batch A: expires 2026-10
- Batch B: expires 2027-04

When the customer buys 100 units, the POS first consumes Batch A, then Batch B
if necessary.

## Backend setup

```powershell
cd backend
python -m venv venv
.env\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Set your Supabase PostgreSQL connection string in `.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres
```

Then:

```powershell
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend:

http://127.0.0.1:8000

## Frontend setup

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend:

http://localhost:5173

## Main endpoints

### Auth

- POST `/api/auth/login/`
- GET `/api/auth/me/`
- POST `/api/auth/token/refresh/`

### Products

- GET `/api/products/`
- GET `/api/products/?search=syringe`
- POST `/api/products/`

### Customers

- GET `/api/customers/`
- GET `/api/customers/?search=hospital`
- POST `/api/customers/`

### Sales

- GET `/api/sales/`
- GET `/api/sales/{id}/`
- POST `/api/sales/checkout/`

Example checkout body:

```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 5,
      "quantity": 100,
      "unit_price": "12.50",
      "discount": "0"
    }
  ],
  "discount": "0",
  "tax": "0",
  "payment_method": "CASH",
  "amount_paid": "1500"
}
```

The backend determines the batches. The client does not choose the batch, which
is intentional: the server is responsible for enforcing FEFO and stock safety.

## Supabase note

Supabase is being used as the PostgreSQL database. Django REST Framework remains
responsible for authentication, authorization and business rules.

## Next recommended part

Part 4 should add purchasing and supplier management:

1. Suppliers
2. Purchase orders
3. Receiving against purchase orders
4. Automatic batch creation
5. Supplier invoice/reference numbers
6. Purchase costs
7. Accounts payable foundation
8. Stock receiving UI
9. Warehouse/location support
10. Returns and damaged stock workflow
