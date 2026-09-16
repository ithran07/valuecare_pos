// CustomersPage.tsx

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Hospital,
  Mail,
  Phone,
  Plus,
  Search,
  Store,
  Users,
  X,
} from "lucide-react";

import { api } from "../api";
import { Customer } from "../types";
import { useToast } from "../ToastContext";
import "../style/customers.css";

type CustomerType =
  | "WALK_IN"
  | "CLINIC"
  | "HOSPITAL"
  | "PHARMACY"
  | "DISTRIBUTOR";

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
  HOSPITAL: Hospital,
  PHARMACY: Store,
  DISTRIBUTOR: Building2,
};

const initialForm = {
  code: "",
  business_name: "",
  customer_type: "WALK_IN" as CustomerType,
  contact_person: "",
  phone: "",
  email: "",
};

type CustomerTypeDropdownProps = {
  value: CustomerType;
  onChange: (value: CustomerType) => void;
  compact?: boolean;
};

function CustomerTypeDropdown({
  value,
  onChange,
  compact = false,
}: CustomerTypeDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const Icon = customerTypeIcons[value];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
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

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const options = Object.keys(customerTypeLabels) as CustomerType[];

  return (
    <div
      className={`customer-dropdown ${
        compact ? "customer-dropdown-compact" : ""
      }`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className="customer-dropdown-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="customer-dropdown-value">
          <span className="customer-dropdown-icon">
            <Icon size={compact ? 15 : 17} />
          </span>

          <span>{customerTypeLabels[value]}</span>
        </span>

        <ChevronDown
          size={17}
          className={`customer-dropdown-chevron ${
            open ? "customer-dropdown-chevron-open" : ""
          }`}
        />
      </button>

      {open && (
        <div className="customer-dropdown-menu" role="listbox">
          {options.map((option) => {
            const OptionIcon = customerTypeIcons[option];
            const selected = option === value;

            return (
              <button
                key={option}
                type="button"
                className={`customer-dropdown-option ${
                  selected ? "customer-dropdown-option-selected" : ""
                }`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                role="option"
                aria-selected={selected}
              >
                <span className="customer-dropdown-option-left">
                  <span className="customer-dropdown-option-icon">
                    <OptionIcon size={16} />
                  </span>

                  <span>{customerTypeLabels[option]}</span>
                </span>

                {selected && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  const { showToast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(initialForm);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);

      const response = await api.get<Customer[]>(
        `/customers/?search=${encodeURIComponent(search)}`,
      );

      setCustomers(response.data);
    } catch (error) {
      console.error(error);

      showToast?.(
        "Failed to load customers.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!showCreateForm) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        setShowCreateForm(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCreateForm, saving]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.business_name.trim()) {
      showToast?.(
        "Business / customer name is required.",
        "error",
      );
      return;
    }

    try {
      setSaving(true);

      await api.post("/customers/", {
        code: form.code.trim(),
        business_name: form.business_name.trim(),
        customer_type: form.customer_type,
        contact_person: form.contact_person.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });

      setForm(initialForm);
      setShowCreateForm(false);

      showToast?.(
        "Customer added successfully.",
        "success",
      );

      await load();
    } catch (error) {
      console.error(error);

      showToast?.(
        "Failed to add customer.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const totalCustomers = customers.length;

  const customerBreakdown = useMemo(() => {
    return {
      clinics: customers.filter(
        (customer) => customer.customer_type === "CLINIC",
      ).length,

      hospitals: customers.filter(
        (customer) => customer.customer_type === "HOSPITAL",
      ).length,

      pharmacies: customers.filter(
        (customer) => customer.customer_type === "PHARMACY",
      ).length,
    };
  }, [customers]);

  const getCustomerType = (
    customer: Customer,
  ): CustomerType => {
    return customer.customer_type as CustomerType;
  };

  return (
    <div className="customers-page">
      {/* HEADER */}
      <div className="customers-header">
        <div>
          <h1>Customers</h1>

          <p>
            Manage clinics, hospitals, pharmacies, distributors, and walk-in
            customers.
          </p>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="customer-stats">
        <div className="customer-stat-card">
          <div className="customer-stat-icon customer-stat-icon-purple">
            <Users size={19} />
          </div>

          <div>
            <span>Total Customers</span>
            <strong>{totalCustomers}</strong>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon">
            <Building2 size={19} />
          </div>

          <div>
            <span>Clinics</span>
            <strong>{customerBreakdown.clinics}</strong>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon">
            <Hospital size={19} />
          </div>

          <div>
            <span>Hospitals</span>
            <strong>{customerBreakdown.hospitals}</strong>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon">
            <Store size={19} />
          </div>

          <div>
            <span>Pharmacies</span>
            <strong>{customerBreakdown.pharmacies}</strong>
          </div>
        </div>
      </div>

      {/* CUSTOMER DIRECTORY */}
      <section className="customer-list-panel">
        <div className="customer-list-header">
        </div>

        {/* TOOLBAR */}
        <div className="customer-toolbar">
          <div className="customer-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            {search && (
              <button
                type="button"
                className="customer-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="customer-toolbar-actions">
            <span className="customer-toolbar-count">
              {totalCustomers} {totalCustomers === 1 ? "customer" : "customers"}
            </span>

            <button
              type="button"
              className="customer-add-button"
              onClick={() => {
                setForm(initialForm);
                setShowCreateForm(true);
              }}
            >
              Add Customer
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="customer-table-wrap">
          {loading
            ? (
              <div className="customer-loading">
                <div className="customer-loading-spinner" />

                <div>
                  <strong>Loading customers</strong>
                  <span>Please wait a moment...</span>
                </div>
              </div>
            )
            : customers.length === 0
            ? (
              <div className="customer-empty">
                <div className="customer-empty-icon">
                  <Users size={23} />
                </div>

                <h3>
                  {search ? "No customers found" : "No customers yet"}
                </h3>

                <p>
                  {search
                    ? "Try changing your search."
                    : "Add your first customer to get started."}
                </p>
              </div>
            )
            : (
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer ID</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Contact Person</th>
                    <th>Contact Information</th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => {
                    const customerType = getCustomerType(customer);

                    const TypeIcon = customerTypeIcons[customerType];

                    return (
                      <tr key={customer.code}>
                        <td>{customers.indexOf(customer) + 1}</td>
                        <td>
                          <span className="customer-code">
                            {customer.code}
                          </span>
                        </td>
                        <td>{customer.business_name}</td>

                        <td>
                          <div
                            className={`customer-type-badge customer-type-${customerType.toLowerCase()}`}
                          >
                            <TypeIcon size={14} />

                            {customerTypeLabels[
                              customerType
                            ] || customer.customer_type}
                          </div>
                        </td>

                        <td>
                          <span className="customer-contact-name">
                            {customer.contact_person ||
                              "Not provided"}
                          </span>
                        </td>

                        <td>
                          <div className="customer-contact-info">
                            {customer.phone && (
                              <span>
                                <Phone size={14} />
                                {customer.phone}
                              </span>
                            )}

                            {customer.email && (
                              <span>
                                <Mail size={14} />
                                {customer.email}
                              </span>
                            )}

                            {!customer.phone &&
                              !customer.email && (
                              <span className="customer-not-provided">
                                No contact information
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
      </section>

      {/* CREATE CUSTOMER MODAL */}
      {showCreateForm && (
        <div
          className="customer-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowCreateForm(false);
            }
          }}
        >
          <div
            className="customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
          >
            <div className="customer-modal-header">
              <div>
                <h2 id="customer-modal-title">
                  Add Customer
                </h2>

                <p>
                  Create a customer record for your business.
                </p>
              </div>

              <button
                type="button"
                className="customer-modal-close"
                onClick={() => {
                  if (!saving) {
                    setShowCreateForm(false);
                  }
                }}
                disabled={saving}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="customer-modal-form"
              onSubmit={create}
            >
              <div className="customer-modal-body">
                <div className="customer-form-grid">
                  <label className="customer-field">
                    <span>
                      Customer Code
                    </span>

                    <input
                      type="text"
                      placeholder="e.g. CUST-001"
                      value={form.code}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))}
                    />
                  </label>

                  <label className="customer-field">
                    <span>
                      Business / Customer Name
                      <em>*</em>
                    </span>

                    <input
                      type="text"
                      placeholder="Enter customer name"
                      value={form.business_name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          business_name: event.target.value,
                        }))}
                      required
                      autoFocus
                    />
                  </label>

                  <div className="customer-field">
                    <span>
                      Customer Type
                      <em>*</em>
                    </span>

                    <CustomerTypeDropdown
                      value={form.customer_type}
                      onChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          customer_type: value,
                        }))}
                    />
                  </div>

                  <label className="customer-field">
                    <span>
                      Contact Person
                    </span>

                    <input
                      type="text"
                      placeholder="Full name"
                      value={form.contact_person}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contact_person: event.target.value,
                        }))}
                    />
                  </label>

                  <label className="customer-field">
                    <span>
                      Phone Number
                    </span>

                    <div className="customer-input-with-icon">
                      <Phone size={16} />

                      <input
                        type="text"
                        placeholder="09XX XXX XXXX"
                        value={form.phone}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))}
                      />
                    </div>
                  </label>

                  <label className="customer-field">
                    <span>
                      Email Address
                    </span>

                    <div className="customer-input-with-icon">
                      <Mail size={16} />

                      <input
                        type="email"
                        placeholder="customer@email.com"
                        value={form.email}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            email: event.target.value,
                          }))}
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div className="customer-modal-footer">
                <span className="customer-required-note">
                  <em>*</em> Required fields
                </span>

                <div className="customer-modal-actions">
                  <button
                    type="button"
                    className="customer-cancel-button"
                    onClick={() => {
                      if (!saving) {
                        setShowCreateForm(false);
                      }
                    }}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="customer-submit-button"
                    disabled={saving}
                  >
                    {saving
                      ? (
                        <>
                          <span className="customer-button-spinner" />
                          Creating...
                        </>
                      )
                      : (
                        <>
                          <Plus size={17} />
                          Add Customer
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
