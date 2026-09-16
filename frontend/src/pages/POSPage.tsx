import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Banknote,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Mail,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import { api } from "../api";
import { Customer, Product, Sale } from "../types";
import { useToast } from "../ToastContext";
import "../style/pos.css";

type CustomerType =
  | "WALK_IN"
  | "CLINIC"
  | "HOSPITAL"
  | "PHARMACY"
  | "DISTRIBUTOR";

type OrderUnit = "PCS" | "BOX";

type ProductWithBox = Product & {
  units_per_box?: number | null;
};

type CartItem = {
  product: ProductWithBox;
  quantity: number;
  unit: OrderUnit;
  unitPrice: number;
};

type CustomerDropdownProps = {
  value: string;
  customers: Customer[];
  onChange: (value: string) => void;
  onAddCustomer: () => void;
};

type CustomerForm = {
  code: string;
  business_name: string;
  customer_type: CustomerType;
  contact_person: string;
  phone: string;
  email: string;
};

const initialCustomerForm: CustomerForm = {
  code: "",
  business_name: "",
  customer_type: "WALK_IN",
  contact_person: "",
  phone: "",
  email: "",
};

const customerTypeLabels: Record<CustomerType, string> = {
  WALK_IN: "Walk-in",
  CLINIC: "Clinic",
  HOSPITAL: "Hospital",
  PHARMACY: "Pharmacy",
  DISTRIBUTOR: "Distributor",
};

const customerTypeIcons: Record<
  CustomerType,
  typeof Users
> = {
  WALK_IN: Users,
  CLINIC: Building2,
  HOSPITAL: Building2,
  PHARMACY: Store,
  DISTRIBUTOR: Building2,
};

/* =========================================================
   CUSTOMER DROPDOWN
========================================================= */

function CustomerDropdown({
  value,
  customers,
  onChange,
  onAddCustomer,
}: CustomerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find(
    (customer) => customer.code === value,
  );

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return customers.slice(0, 30);
    }

    return customers
      .filter((customer) =>
        `${customer.code} ${customer.business_name} ${
          customer.contact_person || ""
        } ${customer.phone || ""}`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 30);
  }, [customers, search]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        searchRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const selectedLabel = selectedCustomer
    ? `${selectedCustomer.code} — ${selectedCustomer.business_name}`
    : "Walk-in / No customer";

  return (
    <div
      className="pos-customer-dropdown"
      ref={dropdownRef}
    >
      <button
        type="button"
        className="pos-customer-trigger"
        onClick={() => {
          setOpen((current) => !current);
          setSearch("");
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="pos-customer-trigger-left">
          <span className="pos-customer-trigger-icon">
            <UserRound size={16} />
          </span>

          <span className="pos-customer-trigger-text">
            <strong>{selectedLabel}</strong>

            {selectedCustomer?.contact_person && (
              <small>
                {selectedCustomer.contact_person}
              </small>
            )}
          </span>
        </span>

        <ChevronDown
          size={17}
          className={
            open
              ? "pos-chevron pos-chevron-open"
              : "pos-chevron"
          }
        />
      </button>

      {open && (
        <div className="pos-customer-menu">
          <div className="pos-customer-menu-search">
            <Search size={16} />

            <input
              ref={searchRef}
              type="text"
              placeholder="Search customer..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={
              !value
                ? "pos-customer-option active"
                : "pos-customer-option"
            }
            onClick={() => {
              onChange("");
              setOpen(false);
              setSearch("");
            }}
          >
            <span className="pos-customer-option-left">
              <span className="pos-customer-option-icon walk-in">
                <Users size={15} />
              </span>

              <span>
                <strong>Walk-in / No customer</strong>
                <small>No customer record</small>
              </span>
            </span>

            {!value && <Check size={16} />}
          </button>

          <div className="pos-customer-menu-divider">
            Existing customers
          </div>

          <div className="pos-customer-results">
            {filteredCustomers.map((customer) => {
              const selected =
                customer.code === value;

              return (
                <button
                  key={customer.code}
                  type="button"
                  className={
                    selected
                      ? "pos-customer-option active"
                      : "pos-customer-option"
                  }
                  onClick={() => {
                    onChange(customer.code);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="pos-customer-option-left">
                    <span className="pos-customer-option-icon">
                      <UserRound size={15} />
                    </span>

                    <span>
                      <strong>
                        {customer.business_name}
                      </strong>

                      <small>
                        {customer.code}
                        {customer.contact_person
                          ? ` • ${customer.contact_person}`
                          : ""}
                      </small>
                    </span>
                  </span>

                  {selected && <Check size={16} />}
                </button>
              );
            })}

            {!filteredCustomers.length && (
              <div className="pos-customer-no-results">
                <Users size={20} />

                <strong>
                  No customer found
                </strong>

                <span>
                  Register a new customer below.
                </span>
              </div>
            )}
          </div>

          <div className="pos-customer-menu-footer">
            <button
              type="button"
              className="pos-register-customer-button"
              onClick={() => {
                setOpen(false);
                setSearch("");
                onAddCustomer();
              }}
            >
              <Plus size={16} />
              Register New Customer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CUSTOMER TYPE DROPDOWN
========================================================= */

function CustomerTypeDropdown({
  value,
  onChange,
}: {
  value: CustomerType;
  onChange: (value: CustomerType) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const Icon = customerTypeIcons[value];

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutside,
      );
  }, []);

  return (
    <div
      className="pos-type-dropdown"
      ref={dropdownRef}
    >
      <button
        type="button"
        className="pos-type-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <span>
          <Icon size={16} />
          {customerTypeLabels[value]}
        </span>

        <ChevronDown
          size={16}
          className={
            open ? "pos-type-chevron open" : "pos-type-chevron"
          }
        />
      </button>

      {open && (
        <div className="pos-type-menu">
          {(
            Object.keys(
              customerTypeLabels,
            ) as CustomerType[]
          ).map((type) => {
            const OptionIcon = customerTypeIcons[type];

            return (
              <button
                key={type}
                type="button"
                className={
                  type === value
                    ? "pos-type-option selected"
                    : "pos-type-option"
                }
                onClick={() => {
                  onChange(type);
                  setOpen(false);
                }}
              >
                <span>
                  <OptionIcon size={15} />
                  {customerTypeLabels[type]}
                </span>

                {type === value && (
                  <Check size={15} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   POS PAGE
========================================================= */

export default function POSPage() {
  const { showToast } = useToast();

  const [products, setProducts] = useState<ProductWithBox[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [loadingCustomers, setLoadingCustomers] =
    useState(true);

  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [showCheckout, setShowCheckout] =
    useState(false);

  const [showCustomerModal, setShowCustomerModal] =
    useState(false);

  const [savingCustomer, setSavingCustomer] =
    useState(false);

  const [processingSale, setProcessingSale] =
    useState(false);

  const [customerForm, setCustomerForm] =
    useState<CustomerForm>(initialCustomerForm);

  const [paymentMethod, setPaymentMethod] =
    useState("CASH");

  const [amountPaid, setAmountPaid] =
    useState("");

  const searchRef =
    useRef<HTMLInputElement>(null);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);

        const response = await api.get<ProductWithBox[]>(
          "/products/?active=true",
        );

        setProducts(response.data);
      } catch (error) {
        console.error(error);

        showToast?.(
          "Failed to load products.",
          "error",
        );
      } finally {
        setLoadingProducts(false);
      }
    };

    const loadCustomers = async () => {
      try {
        setLoadingCustomers(true);

        const response = await api.get<Customer[]>(
          "/customers/?active=true",
        );

        setCustomers(response.data);
      } catch (error) {
        console.error(error);

        showToast?.(
          "Failed to load customers.",
          "error",
        );
      } finally {
        setLoadingCustomers(false);
      }
    };

    loadProducts();
    loadCustomers();
  }, []);

  /* =========================================================
     SEARCH PRODUCTS
  ========================================================= */

  const filteredProducts = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    if (!query) {
      return products.slice(0, 40);
    }

    return products
      .filter((product) =>
        `${product.name} ${product.sku} ${
          product.barcode || ""
        }`
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 40);
  }, [products, search]);

  /* =========================================================
     TOTALS
  ========================================================= */

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            item.unitPrice,
        0,
      ),
    [cart],
  );

  const paid = Number(amountPaid || 0);

  const change =
    paymentMethod === "CASH"
      ? Math.max(0, paid - subtotal)
      : 0;

  const paymentValid =
    paymentMethod !== "CASH"
      ? true
      : paid >= subtotal;

  /* =========================================================
     CART HELPERS
  ========================================================= */

  function getBoxSize(
    product: ProductWithBox,
  ) {
    const size = Number(
      product.units_per_box || 0,
    );

    return size > 0 ? size : null;
  }

  function getAvailableStock(
    product: ProductWithBox,
  ) {
    return Number(
      product.current_stock || 0,
    );
  }

  function getItemPieces(
    item: CartItem,
  ) {
    if (item.unit === "BOX") {
      return (
        item.quantity *
        (getBoxSize(item.product) || 1)
      );
    }

    return item.quantity;
  }

  function getItemUnitPrice(
    product: ProductWithBox,
    unit: OrderUnit,
  ) {
    const basePrice = Number(
      product.selling_price || 0,
    );

    if (unit === "BOX") {
      return (
        basePrice *
        (getBoxSize(product) || 1)
      );
    }

    return basePrice;
  }

  function addProduct(
    product: ProductWithBox,
  ) {
    const stock = getAvailableStock(product);

    if (stock <= 0) {
      showToast?.(
        `${product.name} is out of stock.`,
        "error",
      );

      return;
    }

    setCart((current) => {
      const existing = current.find(
        (item) =>
          item.product.id === product.id,
      );

      if (existing) {
        const newPieces =
          getItemPieces(existing) + 1;

        if (newPieces > stock) {
          showToast?.(
            `Only ${stock} piece${
              stock === 1 ? "" : "s"
            } available for ${product.name}.`,
            "error",
          );

          return current;
        }

        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          product,
          quantity: 1,
          unit: "PCS",
          unitPrice:
            getItemUnitPrice(
              product,
              "PCS",
            ),
        },
      ];
    });
  }

  function changeQty(
    productId: number,
    quantity: number,
  ) {
    if (!Number.isFinite(quantity)) {
      return;
    }

    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        const requestedPieces =
          quantity *
          (item.unit === "BOX"
            ? getBoxSize(item.product) || 1
            : 1);

        const stock =
          getAvailableStock(
            item.product,
          );

        if (requestedPieces > stock) {
          showToast?.(
            `Only ${stock} piece${
              stock === 1 ? "" : "s"
            } available.`,
            "error",
          );

          return item;
        }

        return {
          ...item,
          quantity,
        };
      }),
    );
  }

  function changeUnit(
    productId: number,
    unit: OrderUnit,
  ) {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        if (
          unit === "BOX" &&
          !getBoxSize(item.product)
        ) {
          showToast?.(
            "This product does not have a box size configured.",
            "error",
          );

          return item;
        }

        const pieces =
          getItemPieces(item);

        const newQuantity =
          unit === "BOX"
            ? Math.max(
                1,
                Math.ceil(
                  pieces /
                    (getBoxSize(
                      item.product,
                    ) || 1),
                ),
              )
            : pieces;

        const newPieces =
          newQuantity *
          (unit === "BOX"
            ? getBoxSize(item.product) || 1
            : 1);

        if (
          newPieces >
          getAvailableStock(
            item.product,
          )
        ) {
          showToast?.(
            `Cannot change this order to ${unit}. It exceeds available stock.`,
            "error",
          );

          return item;
        }

        return {
          ...item,
          unit,
          quantity: newQuantity,
          unitPrice:
            getItemUnitPrice(
              item.product,
              unit,
            ),
        };
      }),
    );
  }

  function removeItem(productId: number) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.product.id !== productId,
      ),
    );
  }

  /* =========================================================
     CUSTOMER
  ========================================================= */

  function openCustomerModal() {
    setCustomerForm(
      initialCustomerForm,
    );

    setShowCustomerModal(true);
  }

  async function createCustomer(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !customerForm.business_name.trim()
    ) {
      showToast?.(
        "Customer name is required.",
        "error",
      );

      return;
    }

    try {
      setSavingCustomer(true);

      const response =
        await api.post<Customer>(
          "/customers/",
          {
            code:
              customerForm.code.trim(),
            business_name:
              customerForm.business_name.trim(),
            customer_type:
              customerForm.customer_type,
            contact_person:
              customerForm.contact_person.trim(),
            phone:
              customerForm.phone.trim(),
            email:
              customerForm.email.trim(),
          },
        );

      const createdCustomer =
        response.data;

      setCustomers((current) => [
        createdCustomer,
        ...current.filter(
          (customer) =>
            customer.code !==
            createdCustomer.code,
        ),
      ]);

      setCustomerId(
        createdCustomer.code,
      );

      setCustomerForm(
        initialCustomerForm,
      );

      setShowCustomerModal(false);

      showToast?.(
        "Customer registered successfully.",
        "success",
      );
    } catch (error: any) {
      console.error(error);

      showToast?.(
        error?.response?.data?.detail ||
          "Failed to register customer.",
        "error",
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  /* =========================================================
     CHECKOUT
  ========================================================= */

  function openCheckout() {
    if (!cart.length) {
      showToast?.(
        "Add at least one product first.",
        "error",
      );

      return;
    }

    setPaymentMethod("CASH");
    setAmountPaid("");
    setShowCheckout(true);
  }

  async function checkout() {
    if (!cart.length) {
      return;
    }

    if (
      paymentMethod === "CASH" &&
      paid < subtotal
    ) {
      showToast?.(
        "Amount paid is less than the total.",
        "error",
      );

      return;
    }

    try {
      setProcessingSale(true);

      const response = await api.post<
        { detail?: string } & Sale
      >(
        "/sales/checkout/",
        {
          customer_id:
            customerId || null,

          items: cart.map((item) => ({
            product_id:
              item.product.id,

            /*
             * Inventory is submitted as pieces.
             * A BOX is converted using units_per_box.
             */
            quantity:
              getItemPieces(item),

            unit_price:
              Number(
                item.product
                  .selling_price,
              ),

            discount: 0,
          })),

          discount: 0,
          tax: 0,

          payment_method:
            paymentMethod,

          amount_paid:
            paymentMethod === "CASH"
              ? paid
              : subtotal,
        },
      );

      showToast?.(
        `Sale ${response.data.invoice_number} completed successfully.`,
        "success",
      );

      setCart([]);
      setAmountPaid("");
      setCustomerId("");
      setShowCheckout(false);

      const [
        refreshedProducts,
        refreshedCustomers,
      ] = await Promise.all([
        api.get<ProductWithBox[]>(
          "/products/?active=true",
        ),
        api.get<Customer[]>(
          "/customers/?active=true",
        ),
      ]);

      setProducts(
        refreshedProducts.data,
      );

      setCustomers(
        refreshedCustomers.data,
      );

      window.setTimeout(() => {
        searchRef.current?.focus();
      }, 100);
    } catch (error: any) {
      console.error(error);

      showToast?.(
        error?.response?.data?.detail ||
          "Checkout failed.",
        "error",
      );
    } finally {
      setProcessingSale(false);
    }
  }

  /* =========================================================
     MODAL ESCAPE
  ========================================================= */

  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key !== "Escape" ||
        savingCustomer ||
        processingSale
      ) {
        return;
      }

      if (showCheckout) {
        setShowCheckout(false);
      } else if (showCustomerModal) {
        setShowCustomerModal(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () =>
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
  }, [
    showCheckout,
    showCustomerModal,
    savingCustomer,
    processingSale,
  ]);

  return (
    <div className="pos-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="pos-page-header">
        <div>
          <span className="pos-kicker">
            Point of Sale
          </span>

          <h1>Sales / POS</h1>

          <p>
            Create a sales order and complete
            payment at checkout.
          </p>
        </div>

        <div className="pos-header-status">
          <span className="pos-header-status-dot" />
          POS Ready
        </div>
      </div>

      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <div className="pos-layout">
        {/* ===================================================
            PRODUCTS
        =================================================== */}

        <section className="pos-card products-card">
          <div className="pos-card-header">
            <div>
              <span className="pos-section-label">
                Products
              </span>

              <h2>Select Products</h2>

              <p>
                Search by product name, SKU,
                or barcode.
              </p>
            </div>

            <div className="pos-card-icon">
              <Package size={19} />
            </div>
          </div>

          <div className="product-search">
            <Search size={17} />

            <input
              ref={searchRef}
              autoFocus
              type="text"
              placeholder="Search product, SKU or barcode..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="product-results-header">
            <span>
              {search
                ? `Results for "${search}"`
                : "Available products"}
            </span>

            <strong>
              {filteredProducts.length}
            </strong>
          </div>

          <div className="product-grid">
            {loadingProducts ? (
              <>
                {Array.from({
                  length: 8,
                }).map((_, index) => (
                  <div
                    className="product-skeleton"
                    key={index}
                  >
                    <div className="skeleton-icon" />
                    <div className="skeleton-line wide" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line price" />
                  </div>
                ))}
              </>
            ) : (
              filteredProducts.map(
                (product) => {
                  const stock =
                    getAvailableStock(
                      product,
                    );

                  const boxSize =
                    getBoxSize(
                      product,
                    );

                  const inCart =
                    cart.find(
                      (item) =>
                        item.product.id ===
                        product.id,
                    );

                  return (
                    <button
                      className={
                        stock <= 0
                          ? "product-card out-of-stock"
                          : "product-card"
                      }
                      key={product.id}
                      onClick={() =>
                        addProduct(
                          product,
                        )
                      }
                      disabled={
                        stock <= 0
                      }
                      type="button"
                    >
                      <div className="product-card-top">
                        <div className="product-icon">
                          <Package
                            size={17}
                          />
                        </div>

                        <span
                          className={
                            stock > 0
                              ? "stock-badge"
                              : "stock-badge empty"
                          }
                        >
                          {stock > 0
                            ? `${stock} pcs`
                            : "Out of stock"}
                        </span>
                      </div>

                      <div className="product-details">
                        <strong>
                          {product.name}
                        </strong>

                        <span>
                          SKU:{" "}
                          {product.sku}
                        </span>

                        {product.barcode && (
                          <span>
                            Barcode:{" "}
                            {
                              product.barcode
                            }
                          </span>
                        )}
                      </div>

                      <div className="product-card-bottom">
                        <div className="product-price">
                          ₱
                          {Number(
                            product.selling_price,
                          ).toFixed(2)}
                          <small>
                            / pc
                          </small>
                        </div>

                        {boxSize && (
                          <span className="box-info">
                            1 box ={" "}
                            {boxSize} pcs
                          </span>
                        )}
                      </div>

                      {inCart && (
                        <span className="product-added">
                          <Check
                            size={12}
                          />
                          {inCart.quantity}{" "}
                          {inCart.unit.toLowerCase()}
                          {inCart.quantity !==
                          1
                            ? "s"
                            : ""}{" "}
                          in cart
                        </span>
                      )}
                    </button>
                  );
                },
              )
            )}

            {!loadingProducts &&
              !filteredProducts.length && (
                <div className="products-empty">
                  <div className="products-empty-icon">
                    <Search size={24} />
                  </div>

                  <strong>
                    No products found
                  </strong>

                  <span>
                    Try another product,
                    SKU, or barcode.
                  </span>

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch("")
                      }
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
          </div>
        </section>

        {/* ===================================================
            CART
        =================================================== */}

        <section className="pos-card cart-card">
          <div className="cart-card-header">
            <div className="cart-title">
              <div className="cart-icon">
                <ShoppingCart size={18} />
              </div>

              <div>
                <span className="pos-section-label">
                  Current Order
                </span>

                <h2>Cart</h2>
              </div>
            </div>

            <button
              type="button"
              className="clear-cart"
              onClick={() =>
                setCart([])
              }
              disabled={!cart.length}
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>

          {/* CUSTOMER */}

          <div className="customer-field">
            <label>
              <UserRound size={14} />
              Customer
            </label>

            {loadingCustomers ? (
              <div className="pos-customer-loading">
                <span className="pos-small-spinner" />
                Loading customers...
              </div>
            ) : (
              <CustomerDropdown
                customers={customers}
                value={customerId}
                onChange={setCustomerId}
                onAddCustomer={
                  openCustomerModal
                }
              />
            )}
          </div>

          {/* CART */}

          <div className="cart-list">
            {cart.map((item) => {
              const boxSize =
                getBoxSize(
                  item.product,
                );

              const pieces =
                getItemPieces(item);

              return (
                <div
                  className="cart-item"
                  key={item.product.id}
                >
                  <div className="cart-item-info">
                    <div className="cart-item-name-row">
                      <strong>
                        {item.product.name}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.product
                              .id,
                          )
                        }
                        aria-label="Remove item"
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    </div>

                    <span>
                      {item.product.sku}
                    </span>

                    <small>
                      ₱
                      {item.unitPrice.toFixed(
                        2,
                      )}{" "}
                      /{" "}
                      {item.unit ===
                      "BOX"
                        ? "box"
                        : "pc"}
                    </small>
                  </div>

                  <div className="cart-item-bottom">
                    <div className="unit-selector">
                      <button
                        type="button"
                        className={
                          item.unit ===
                          "PCS"
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          changeUnit(
                            item.product
                              .id,
                            "PCS",
                          )
                        }
                      >
                        PCS
                      </button>

                      <button
                        type="button"
                        className={
                          item.unit ===
                          "BOX"
                            ? "active"
                            : ""
                        }
                        disabled={!boxSize}
                        title={
                          !boxSize
                            ? "Box size is not configured for this product"
                            : undefined
                        }
                        onClick={() =>
                          changeUnit(
                            item.product
                              .id,
                            "BOX",
                          )
                        }
                      >
                        BOX
                      </button>
                    </div>

                    <div className="cart-quantity">
                      <button
                        type="button"
                        onClick={() =>
                          changeQty(
                            item.product
                              .id,
                            item.quantity -
                              1,
                          )
                        }
                      >
                        −
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={
                          item.quantity
                        }
                        onChange={(
                          event,
                        ) =>
                          changeQty(
                            item.product
                              .id,
                            Number(
                              event
                                .target
                                .value,
                            ),
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          changeQty(
                            item.product
                              .id,
                            item.quantity +
                              1,
                          )
                        }
                      >
                        +
                      </button>
                    </div>

                    <strong className="cart-item-total">
                      ₱
                      {(
                        item.quantity *
                        item.unitPrice
                      ).toFixed(2)}
                    </strong>
                  </div>

                  {item.unit ===
                    "BOX" &&
                    boxSize && (
                      <div className="cart-box-note">
                        {item.quantity} box
                        {item.quantity !==
                        1
                          ? "es"
                          : ""}{" "}
                        ={" "}
                        {pieces} pieces
                      </div>
                    )}
                </div>
              );
            })}

            {!cart.length && (
              <div className="cart-empty">
                <div className="cart-empty-icon">
                  <ShoppingCart size={24} />
                </div>

                <strong>
                  Your cart is empty
                </strong>

                <span>
                  Select a product to begin
                  the order.
                </span>
              </div>
            )}
          </div>

          {/* TOTAL */}

          <div className="order-summary">
            <div className="summary-row">
              <span>Items</span>

              <strong>
                {cart.reduce(
                  (sum, item) =>
                    sum + item.quantity,
                  0,
                )}
              </strong>
            </div>

            <div className="summary-row">
              <span>Subtotal</span>

              <strong>
                ₱{subtotal.toFixed(2)}
              </strong>
            </div>

            <div className="summary-total">
              <span>Total</span>

              <strong>
                ₱{subtotal.toFixed(2)}
              </strong>
            </div>
          </div>

          {/* CHECKOUT */}

          <button
            className="checkout-button"
            onClick={openCheckout}
            disabled={!cart.length}
            type="button"
          >
            <ShoppingCart size={18} />

            <span>
              Checkout Order
            </span>

            <strong>
              ₱{subtotal.toFixed(2)}
            </strong>
          </button>

          <div className="cart-footer-note">
            Payment will be collected on
            the checkout screen.
          </div>
        </section>
      </div>

      {/* =====================================================
          CUSTOMER REGISTRATION MODAL
      ===================================================== */}

      {showCustomerModal && (
        <div
          className="pos-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !savingCustomer
            ) {
              setShowCustomerModal(
                false,
              );
            }
          }}
        >
          <div
            className="pos-customer-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="pos-modal-header">
              <div className="pos-modal-heading">
                <div className="pos-modal-heading-icon">
                  <UserRound size={19} />
                </div>

                <div>
                  <span>
                    CUSTOMER
                  </span>

                  <h2>
                    Register Customer
                  </h2>

                  <p>
                    Save the customer so they
                    can be found quickly next
                    time.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="pos-modal-close"
                onClick={() => {
                  if (
                    !savingCustomer
                  ) {
                    setShowCustomerModal(
                      false,
                    );
                  }
                }}
                disabled={
                  savingCustomer
                }
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="pos-customer-form"
              onSubmit={createCustomer}
            >
              <div className="pos-customer-form-body">
                <div className="pos-form-section-title">
                  Customer information
                </div>

                <div className="pos-form-grid">
                  <label className="pos-form-field">
                    <span>
                      Customer Code
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. CUST-001"
                      value={
                        customerForm.code
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomerForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            code: event
                              .target
                              .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label className="pos-form-field">
                    <span>
                      Business / Customer Name
                      <em>*</em>
                    </span>

                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Enter customer name"
                      value={
                        customerForm.business_name
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomerForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            business_name:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <div className="pos-form-field">
                    <span>
                      Customer Type
                      <em>*</em>
                    </span>

                    <CustomerTypeDropdown
                      value={
                        customerForm.customer_type
                      }
                      onChange={(
                        value,
                      ) =>
                        setCustomerForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            customer_type:
                              value,
                          }),
                        )
                      }
                    />
                  </div>

                  <label className="pos-form-field">
                    <span>
                      Contact Person
                    </span>

                    <input
                      type="text"
                      placeholder="Full name"
                      value={
                        customerForm.contact_person
                      }
                      onChange={(
                        event,
                      ) =>
                        setCustomerForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            contact_person:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                    />
                  </label>

                  <label className="pos-form-field">
                    <span>
                      Phone Number
                    </span>

                    <div className="pos-input-icon">
                      <UserRound size={15} />

                      <input
                        type="text"
                        placeholder="09XX XXX XXXX"
                        value={
                          customerForm.phone
                        }
                        onChange={(
                          event,
                        ) =>
                          setCustomerForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              phone: event
                                .target
                                .value,
                            }),
                          )
                        }
                      />
                    </div>
                  </label>

                  <label className="pos-form-field">
                    <span>
                      Email Address
                    </span>

                    <div className="pos-input-icon">
                      <Mail size={15} />

                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={
                          customerForm.email
                        }
                        onChange={(
                          event,
                        ) =>
                          setCustomerForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              email: event
                                .target
                                .value,
                            }),
                          )
                        }
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="pos-modal-footer">
                <span>
                  <em>*</em> Required
                  fields
                </span>

                <div>
                  <button
                    type="button"
                    className="pos-cancel-button"
                    onClick={() => {
                      if (
                        !savingCustomer
                      ) {
                        setShowCustomerModal(
                          false,
                        );
                      }
                    }}
                    disabled={
                      savingCustomer
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="pos-primary-button"
                    disabled={
                      savingCustomer
                    }
                  >
                    {savingCustomer ? (
                      <>
                        <span className="pos-button-spinner" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Register Customer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          CHECKOUT / RECEIPT MODAL
      ===================================================== */}

      {showCheckout && (
        <div
          className="pos-modal-backdrop checkout-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !processingSale
            ) {
              setShowCheckout(false);
            }
          }}
        >
          <div
            className="pos-checkout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-title"
          >
            {/* RECEIPT TOP */}

            <div className="receipt-paper">
              <div className="receipt-top">
                <div className="receipt-store-icon">
                  <Store size={20} />
                </div>

                <span>
                  SALES RECEIPT
                </span>

                <h2 id="checkout-title">
                  Confirm Order
                </h2>

                <p>
                  Review the order before
                  completing the sale.
                </p>
              </div>

              <div className="receipt-customer">
                <div>
                  <span>
                    CUSTOMER
                  </span>

                  <strong>
                    {customerId
                      ? customers.find(
                          (
                            customer,
                          ) =>
                            customer.code ===
                            customerId,
                        )
                          ?.business_name ||
                        customerId
                      : "Walk-in Customer"}
                  </strong>
                </div>

                <div>
                  <span>
                    PAYMENT
                  </span>

                  <strong>
                    {paymentMethod}
                  </strong>
                </div>
              </div>

              <div className="receipt-items">
                {cart.map((item) => (
                  <div
                    className="receipt-item"
                    key={
                      item.product.id
                    }
                  >
                    <div>
                      <strong>
                        {item.product.name}
                      </strong>

                      <span>
                        {item.quantity}{" "}
                        {item.unit ===
                        "BOX"
                          ? "box"
                          : "pc"}
                        {item.quantity !==
                        1
                          ? "s"
                          : ""}{" "}
                        × ₱
                        {item.unitPrice.toFixed(
                          2,
                        )}
                      </span>

                      {item.unit ===
                        "BOX" &&
                        getBoxSize(
                          item.product,
                        ) && (
                          <small>
                            {getItemPieces(
                              item,
                            )}{" "}
                            pieces total
                          </small>
                        )}
                    </div>

                    <strong>
                      ₱
                      {(
                        item.quantity *
                        item.unitPrice
                      ).toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="receipt-dashed" />

              <div className="receipt-total-row">
                <span>
                  Subtotal
                </span>

                <strong>
                  ₱{subtotal.toFixed(2)}
                </strong>
              </div>

              <div className="receipt-total-row grand">
                <span>
                  TOTAL
                </span>

                <strong>
                  ₱{subtotal.toFixed(2)}
                </strong>
              </div>

              {/* PAYMENT */}

              <div className="checkout-payment">
                <div className="checkout-payment-title">
                  <span>
                    PAYMENT METHOD
                  </span>

                  <small>
                    Select how the customer
                    will pay.
                  </small>
                </div>

                <div className="checkout-payment-methods">
                  <button
                    type="button"
                    className={
                      paymentMethod ===
                      "CASH"
                        ? "checkout-payment-method active"
                        : "checkout-payment-method"
                    }
                    onClick={() => {
                      setPaymentMethod(
                        "CASH",
                      );
                      setAmountPaid(
                        "",
                      );
                    }}
                  >
                    <Banknote size={17} />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    className={
                      paymentMethod ===
                      "GCASH"
                        ? "checkout-payment-method active"
                        : "checkout-payment-method"
                    }
                    onClick={() => {
                      setPaymentMethod(
                        "GCASH",
                      );
                      setAmountPaid(
                        subtotal.toFixed(
                          2,
                        ),
                      );
                    }}
                  >
                    <WalletCards size={17} />
                    <span>GCash</span>
                  </button>

                  <button
                    type="button"
                    className={
                      paymentMethod ===
                      "BANK"
                        ? "checkout-payment-method active"
                        : "checkout-payment-method"
                    }
                    onClick={() => {
                      setPaymentMethod(
                        "BANK",
                      );
                      setAmountPaid(
                        subtotal.toFixed(
                          2,
                        ),
                      );
                    }}
                  >
                    <WalletCards size={17} />
                    <span>Bank</span>
                  </button>

                  <button
                    type="button"
                    className={
                      paymentMethod ===
                      "CARD"
                        ? "checkout-payment-method active"
                        : "checkout-payment-method"
                    }
                    onClick={() => {
                      setPaymentMethod(
                        "CARD",
                      );
                      setAmountPaid(
                        subtotal.toFixed(
                          2,
                        ),
                      );
                    }}
                  >
                    <CreditCard size={17} />
                    <span>Card</span>
                  </button>
                </div>

                {paymentMethod ===
                  "CASH" && (
                  <div className="checkout-cash-area">
                    <div className="checkout-amount-field">
                      <label>
                        Amount Paid
                      </label>

                      <div className="checkout-amount-input">
                        <span>₱</span>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          autoFocus
                          placeholder="0.00"
                          value={
                            amountPaid
                          }
                          onChange={(
                            event,
                          ) =>
                            setAmountPaid(
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="checkout-change">
                      <span>
                        Change
                      </span>

                      <strong>
                        ₱
                        {change.toFixed(
                          2,
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                {paymentMethod !==
                  "CASH" && (
                  <div className="non-cash-confirmation">
                    <Check size={16} />

                    <span>
                      Payment amount:
                      <strong>
                        ₱
                        {subtotal.toFixed(
                          2,
                        )}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="receipt-tear">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>

            {/* CHECKOUT ACTIONS */}

            <div className="checkout-actions">
              <button
                type="button"
                className="checkout-cancel"
                onClick={() =>
                  setShowCheckout(false)
                }
                disabled={
                  processingSale
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="checkout-confirm"
                onClick={checkout}
                disabled={
                  processingSale ||
                  !paymentValid
                }
              >
                {processingSale ? (
                  <>
                    <span className="pos-button-spinner light" />
                    Processing Sale...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Complete Sale
                    <strong>
                      ₱
                      {subtotal.toFixed(
                        2,
                      )}
                    </strong>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

