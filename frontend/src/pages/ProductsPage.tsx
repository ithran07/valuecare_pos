import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Barcode,
  Boxes,
  ClipboardList,
  DollarSign,
  FileText,
  Hash,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { api } from "../api";
import { Category, Product, Unit } from "../types";
import { useToast } from "../ToastContext";
import ManagementSelect from "../components/ManagementSelect";
import "../style/product.css";

const blankForm = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  brand: "",
  manufacturer: "",
  category: "",
  unit: "",
  cost_price: "0",
  selling_price: "0",
  wholesale_price: "0",
  minimum_stock: "0",
  reorder_level: "0",
  is_prescription: false,
};

export default function ProductsPage() {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [form, setForm] = useState(blankForm);

  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const [productResponse, categoryResponse, unitResponse] =
        await Promise.all([
          api.get("/products/"),
          api.get("/products/categories/"),
          api.get("/products/units/"),
        ]);

      setProducts(productResponse.data);
      setCategories(categoryResponse.data);
      setUnits(unitResponse.data);
    } catch (error: any) {
      showToast(
        error?.response?.data?.detail || "Could not load products.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(
    field: keyof typeof blankForm,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetCreateForm() {
    setForm(blankForm);
  }

  function closeCreateForm() {
    if (creating) return;

    setShowCreateForm(false);
    resetCreateForm();
  }

  async function create(event: FormEvent) {
    event.preventDefault();

    try {
      setCreating(true);

      await api.post("/products/", {
        ...form,
        barcode: form.barcode || null,
        category: form.category || null,
        unit: form.unit || null,
      });

      showToast(
        "Product created. Receive stock from Stock Receiving.",
        "success",
      );

      setShowCreateForm(false);
      resetCreateForm();

      load();
    } catch (error: any) {
      showToast(
        error?.response?.data?.detail || "Could not create product.",
        "error",
      );
    } finally {
      setCreating(false);
    }
  }

  const visible = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return products;

    return products.filter((product) =>
      `${product.name} ${product.sku} ${product.barcode || ""}`
        .toLowerCase()
        .includes(value),
    );
  }, [products, search]);

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active).length,
    [products],
  );

  const prescriptionProducts = useMemo(
    () => products.filter((product) => product.is_prescription).length,
    [products],
  );

  const lowStockProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          Number(product.current_stock ?? 0) <=
          Number(product.reorder_level ?? 0),
      ).length,
    [products],
  );

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value);
  }

  function getStockState(product: Product) {
    const stock = Number(product.current_stock ?? 0);
    const reorder = Number(product.reorder_level ?? 0);

    if (stock <= 0) {
      return {
        label: "Out of stock",
        className: "out",
      };
    }

    if (stock <= reorder) {
      return {
        label: "Low stock",
        className: "low",
      };
    }

    return {
      label: "In stock",
      className: "good",
    };
  }

  return (
    <div className="product-page">
      {/* PAGE HEADER */}
      <header className="product-page-head">
        <div className="product-heading">
          <div className="product-heading-icon">
            <Package size={20} />
          </div>

          <div>
            <span className="product-eyebrow">
              CATALOG MANAGEMENT
            </span>

            <h1>Products</h1>

            <p>
              Manage the products available across your POS,
              inventory, and stock receiving workflows.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="product-primary-button"
          onClick={() => {
            resetCreateForm();
            setShowCreateForm(true);
          }}
        >
          <Plus size={17} />
          Add Product
        </button>
      </header>

      {/* SUMMARY */}
      <section className="product-summary">
        <div className="product-summary-card">
          <div className="product-summary-icon catalog">
            <Package size={18} />
          </div>

          <div>
            <span>Total Products</span>
            <strong>{products.length}</strong>
          </div>
        </div>

        <div className="product-summary-card">
          <div className="product-summary-icon active">
            <ShieldCheck size={18} />
          </div>

          <div>
            <span>Active Products</span>
            <strong>{activeProducts}</strong>
          </div>
        </div>

        <div className="product-summary-card">
          <div className="product-summary-icon warning">
            <Boxes size={18} />
          </div>

          <div>
            <span>Low Stock</span>
            <strong>{lowStockProducts}</strong>
          </div>
        </div>

        <div className="product-summary-card">
          <div className="product-summary-icon prescription">
            <ClipboardList size={18} />
          </div>

          <div>
            <span>Prescription</span>
            <strong>{prescriptionProducts}</strong>
          </div>
        </div>
      </section>

      {/* TOOLBAR */}
      <section className="product-toolbar">
        <div className="product-toolbar-main">
          <div className="product-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search by product, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="product-toolbar-meta">
          <span>
            Showing <strong>{visible.length}</strong> of{" "}
            <strong>{products.length}</strong>
          </span>
        </div>
      </section>

      {/* PRODUCT LIST */}
      <section className="product-history">
        <div className="product-history-head">
          <div>
            <span className="product-section-eyebrow">
              PRODUCT CATALOG
            </span>

            <h2>All Products</h2>

            <p>
              Product information, pricing, stock levels, and status.
            </p>
          </div>

          <div className="product-history-badge">
            <Package size={15} />
            {visible.length}
          </div>
        </div>

        {loading ? (
          <div className="product-loading">
            <div className="product-loading-spinner" />

            <div>
              <strong>Loading products</strong>
              <span>Getting your product catalog...</span>
            </div>
          </div>
        ) : visible.length === 0 ? (
          <div className="product-empty">
            <div className="product-empty-icon">
              {search ? (
                <Search size={22} />
              ) : (
                <Package size={22} />
              )}
            </div>

            <h3>
              {search
                ? "No products found"
                : "No products yet"}
            </h3>

            <p>
              {search
                ? "Try searching with another product name, SKU, or barcode."
                : "Your product catalog is empty. Add your first product to get started."}
            </p>

            {!search && (
              <button
                type="button"
                className="product-empty-button"
                onClick={() => {
                  resetCreateForm();
                  setShowCreateForm(true);
                }}
              >
                <Plus size={15} />
                Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="product-table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Identification</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((product) => {
                  const stockState = getStockState(product);

                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="product-main-cell">
                          <div className="product-avatar">
                            <Package size={16} />
                          </div>

                          <div>
                            <strong>{product.name}</strong>

                            <span>
                              {product.brand ||
                                product.manufacturer ||
                                "No brand specified"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="product-identification">
                          <span className="product-sku">
                            <Hash size={12} />
                            {product.sku}
                          </span>

                          {product.barcode && (
                            <span className="product-barcode">
                              <Barcode size={12} />
                              {product.barcode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="product-price-cell">
                          <strong>
                            {formatCurrency(
                              Number(
                                product.selling_price ?? 0,
                              ),
                            )}
                          </strong>

                          <span>selling price</span>
                        </div>
                      </td>

                      <td>
                        <div className="product-stock-cell">
                          <strong>
                            {product.current_stock ?? 0}
                          </strong>

                          <span
                            className={`product-stock-state ${stockState.className}`}
                          >
                            {stockState.label}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="product-status-cell">
                          <span
                            className={`product-status ${
                              product.is_active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <span className="product-status-dot" />
                            {product.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>

                          {product.is_prescription && (
                            <span className="product-prescription">
                              Rx
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE PRODUCT MODAL */}
      {showCreateForm && (
        <div
          className="product-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateForm();
            }
          }}
        >
          <div
            className="product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
          >
            {/* MODAL HEADER */}
            <div className="product-modal-header">
              <div className="product-modal-title-area">
                <div className="product-modal-title-icon">
                  <Package size={19} />
                </div>

                <div>
                  <span className="product-modal-eyebrow">
                    PRODUCT CATALOG
                  </span>

                  <h2 id="product-modal-title">
                    Add Product
                  </h2>

                  <p>
                    Create a new product for POS and inventory
                    management.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="product-modal-close"
                onClick={closeCreateForm}
                disabled={creating}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="product-modal-body"
              onSubmit={create}
            >
              {/* BASIC INFORMATION */}
              <section className="product-modal-section">
                <div className="product-section-title">
                  <div className="product-section-title-icon">
                    <FileText size={16} />
                  </div>

                  <div>
                    <h3>Basic Information</h3>
                    <p>
                      Identify the product within your catalog.
                    </p>
                  </div>
                </div>

                <div className="product-form-grid">
                  <div className="product-field product-field-wide">
                    <label htmlFor="product-name">
                      Product name <span>*</span>
                    </label>

                    <div className="product-input-wrap">
                      <Package size={15} />

                      <input
                        id="product-name"
                        required
                        placeholder="e.g. Paracetamol 500mg Tablet"
                        value={form.name}
                        onChange={(e) =>
                          update("name", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-sku">
                      SKU <span>*</span>
                    </label>

                    <div className="product-input-wrap">
                      <Hash size={15} />

                      <input
                        id="product-sku"
                        required
                        placeholder="e.g. PARA-500-001"
                        value={form.sku}
                        onChange={(e) =>
                          update("sku", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-barcode">
                      Barcode
                    </label>

                    <div className="product-input-wrap">
                      <Barcode size={15} />

                      <input
                        id="product-barcode"
                        placeholder="Scan or enter barcode"
                        value={form.barcode}
                        onChange={(e) =>
                          update("barcode", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-brand">
                      Brand
                    </label>

                    <div className="product-input-wrap">
                      <Tag size={15} />

                      <input
                        id="product-brand"
                        placeholder="e.g. Unilab"
                        value={form.brand}
                        onChange={(e) =>
                          update("brand", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-manufacturer">
                      Manufacturer
                    </label>

                    <input
                      id="product-manufacturer"
                      placeholder="Manufacturer name"
                      value={form.manufacturer}
                      onChange={(e) =>
                        update(
                          "manufacturer",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-category">
                      Category
                    </label>

                    <ManagementSelect
                      value={form.category}
                      onChange={(value) =>
                        update("category", value)
                      }
                      ariaLabel="Select category"
                      options={[
                        {
                          value: "",
                          label: "Select category",
                        },
                        ...categories.map((category) => ({
                          value: String(category.id),
                          label: category.name,
                        })),
                      ]}
                    />
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-unit">
                      Unit
                    </label>

                    <ManagementSelect
                      value={form.unit}
                      onChange={(value) =>
                        update("unit", value)
                      }
                      ariaLabel="Select unit"
                      options={[
                        {
                          value: "",
                          label: "Select unit",
                        },
                        ...units.map((unit) => ({
                          value: String(unit.id),
                          label: unit.name,
                        })),
                      ]}
                    />
                  </div>
                </div>
              </section>

              {/* PRICING */}
              <section className="product-modal-section">
                <div className="product-section-title">
                  <div className="product-section-title-icon pricing">
                    <DollarSign size={16} />
                  </div>

                  <div>
                    <h3>Pricing</h3>
                    <p>
                      Define the purchasing and selling prices.
                    </p>
                  </div>
                </div>

                <div className="product-form-grid product-pricing-grid">
                  <div className="product-field">
                    <label htmlFor="product-cost-price">
                      Cost price <span>*</span>
                    </label>

                    <div className="product-money-input">
                      <span>₱</span>

                      <input
                        id="product-cost-price"
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.cost_price}
                        onChange={(e) =>
                          update(
                            "cost_price",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-selling-price">
                      Selling price <span>*</span>
                    </label>

                    <div className="product-money-input featured">
                      <span>₱</span>

                      <input
                        id="product-selling-price"
                        required
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.selling_price}
                        onChange={(e) =>
                          update(
                            "selling_price",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-wholesale-price">
                      Wholesale price
                    </label>

                    <div className="product-money-input">
                      <span>₱</span>

                      <input
                        id="product-wholesale-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.wholesale_price}
                        onChange={(e) =>
                          update(
                            "wholesale_price",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* INVENTORY */}
              <section className="product-modal-section">
                <div className="product-section-title">
                  <div className="product-section-title-icon inventory">
                    <Boxes size={16} />
                  </div>

                  <div>
                    <h3>Inventory Settings</h3>
                    <p>
                      Configure stock thresholds for this product.
                    </p>
                  </div>
                </div>

                <div className="product-form-grid">
                  <div className="product-field">
                    <label htmlFor="product-minimum-stock">
                      Minimum stock
                    </label>

                    <input
                      id="product-minimum-stock"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minimum_stock}
                      onChange={(e) =>
                        update(
                          "minimum_stock",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="product-field">
                    <label htmlFor="product-reorder-level">
                      Reorder level
                    </label>

                    <input
                      id="product-reorder-level"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.reorder_level}
                      onChange={(e) =>
                        update(
                          "reorder_level",
                          e.target.value,
                        )
                      }
                    />
                  </div>

                  <label className="product-prescription-toggle">
                    <div className="product-toggle-copy">
                      <strong>Prescription product</strong>
                      <span>
                        Mark this item as requiring prescription
                        handling.
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.is_prescription}
                      onChange={(e) =>
                        update(
                          "is_prescription",
                          e.target.checked,
                        )
                      }
                    />

                    <span className="product-toggle-track">
                      <span />
                    </span>
                  </label>
                </div>
              </section>

              {/* DESCRIPTION */}
              <section className="product-modal-section">
                <div className="product-section-title">
                  <div className="product-section-title-icon description">
                    <FileText size={16} />
                  </div>

                  <div>
                    <h3>Description</h3>
                    <p>
                      Add additional information about this product.
                    </p>
                  </div>
                </div>

                <div className="product-field">
                  <textarea
                    id="product-description"
                    aria-label="Product description"
                    placeholder="Describe the product, dosage, packaging, or other useful information..."
                    value={form.description}
                    onChange={(e) =>
                      update(
                        "description",
                        e.target.value,
                      )
                    }
                    rows={4}
                  />
                </div>
              </section>

              {/* FOOTER */}
              <div className="product-modal-footer">
                <div className="product-save-note">
                  <ShieldCheck size={15} />

                  <span>
                    Product will be available for POS and stock
                    receiving after creation.
                  </span>
                </div>

                <div className="product-modal-actions">
                  <button
                    type="button"
                    className="product-cancel-button"
                    onClick={closeCreateForm}
                    disabled={creating}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="product-create-button"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <span className="product-button-spinner" />
                        Saving Product...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Save Product
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}