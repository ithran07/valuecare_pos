import { FormEvent, useEffect, useState } from "react";
import { Landmark, Search, X } from "lucide-react";
import { api } from "../api";
import { Supplier } from "../types";
import { useToast } from "../ToastContext";
import "../style/suppliers.css";

const blankForm = {
  code: "",
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  payment_terms_days: "0",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { showToast } = useToast();

  async function load() {
    try {
      setLoading(true);

      const res = await api.get(
        `/purchasing/suppliers/?search=${encodeURIComponent(search)}`,
      );

      setSuppliers(res.data);
    } catch (e) {
      showToast("Failed to load suppliers.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!showCreateForm) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) {
        setShowCreateForm(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => document.removeEventListener("keydown", handleEscape);
  }, [showCreateForm, saving]);

  function updateForm(field: keyof typeof blankForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function create(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      showToast("Supplier name is required.", "error");
      return;
    }

    try {
      setSaving(true);

      await api.post("/purchasing/suppliers/", {
        ...form,
        payment_terms_days: Number(form.payment_terms_days || 0),
      });

      setForm(blankForm);
      setShowCreateForm(false);
      showToast("Supplier saved successfully.", "success");
      load();
    } catch (e: any) {
      showToast(
        e?.response?.data?.detail || "Could not save supplier.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="supplier-page">
      {/* HEADER */}
      <div className="supplier-page-head">
        <div>
          <h1>Suppliers</h1>
          <p>Vendors this pharmacy purchases medical supplies from.</p>
        </div>
      </div>

      {/* SUPPLIER DIRECTORY */}
      <section className="supplier-list-panel">
        {/* TOOLBAR */}
        <div className="supplier-toolbar">
          <div className="supplier-search">
            <Search size={17} />

            <input
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                className="supplier-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="supplier-toolbar-right">
            <span className="supplier-toolbar-count">
              {suppliers.length}{" "}
              {suppliers.length === 1 ? "supplier" : "suppliers"}
            </span>

            <button
              type="button"
              className="supplier-add-button"
              onClick={() => {
                setForm(blankForm);
                setShowCreateForm(true);
              }}
            >
              Add Supplier
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="supplier-table-wrap">
          {loading ? (
            <div className="supplier-loading">
              <div className="supplier-loading-spinner" />

              <div>
                <strong>Loading suppliers</strong>
                <span>Please wait a moment...</span>
              </div>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="supplier-empty">
              <div className="supplier-empty-icon">
                <Landmark size={23} />
              </div>

              <h3>{search ? "No suppliers found" : "No suppliers yet"}</h3>

              <p>
                {search
                  ? "Try changing your search."
                  : "Add your first supplier to get started."}
              </p>
            </div>
          ) : (
            <table className="supplier-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Terms</th>
                </tr>
              </thead>

              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="supplier-code">{s.code}</span>
                    </td>

                    <td>
                      <strong>{s.name}</strong>
                    </td>

                    <td>{s.contact_person || "Not provided"}</td>

                    <td>{s.phone || "—"}</td>

                    <td>
                      <span className="supplier-terms-badge">
                        {s.payment_terms_days} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ADD SUPPLIER MODAL */}
      {showCreateForm && (
        <div
          className="supplier-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowCreateForm(false);
            }
          }}
        >
          <div
            className="supplier-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-modal-title"
          >
            <div className="supplier-modal-header">
              <div>
                <span className="supplier-section-label">Purchasing</span>
                <h2 id="supplier-modal-title">Add Supplier</h2>
                <p>Create a supplier record for your business.</p>
              </div>

              <button
                type="button"
                className="supplier-modal-close"
                onClick={() => {
                  if (!saving) setShowCreateForm(false);
                }}
                disabled={saving}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form className="supplier-create-form" onSubmit={create}>
              <div className="supplier-modal-body">
                <div className="supplier-form-grid">
                  <div className="supplier-field">
                    <label>Supplier code</label>

                    <input
                      placeholder="e.g. SUP-001"
                      value={form.code}
                      onChange={(e) => updateForm("code", e.target.value)}
                    />
                  </div>

                  <div className="supplier-field supplier-field-wide">
                    <label>
                      Supplier / company name <span>*</span>
                    </label>

                    <input
                      required
                      autoFocus
                      placeholder="Enter supplier name"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                    />
                  </div>

                  <div className="supplier-field">
                    <label>Contact person</label>

                    <input
                      placeholder="Full name"
                      value={form.contact_person}
                      onChange={(e) =>
                        updateForm("contact_person", e.target.value)}
                    />
                  </div>

                  <div className="supplier-field">
                    <label>Phone</label>

                    <input
                      placeholder="09XX XXX XXXX"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                    />
                  </div>

                  <div className="supplier-field">
                    <label>Email</label>

                    <input
                      type="email"
                      placeholder="supplier@email.com"
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                    />
                  </div>

                  <div className="supplier-field">
                    <label>Payment terms (days)</label>

                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.payment_terms_days}
                      onChange={(e) =>
                        updateForm("payment_terms_days", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="supplier-modal-footer">
                <button
                  type="button"
                  className="supplier-cancel-button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setForm(blankForm);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="supplier-submit-button"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}