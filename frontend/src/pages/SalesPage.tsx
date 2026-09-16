import { useEffect, useMemo, useState } from "react";
import { Receipt, Search, TrendingUp, Wallet, X } from "lucide-react";
import { api } from "../api";
import { Sale } from "../types";
import "../style/sales.css";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/sales/")
      .then((r) => setSales(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return sales;

    return sales.filter((s) =>
      `${s.invoice_number} ${s.customer_name || "walk-in"} ${
        s.sold_by_name || s.sold_by || ""
      }`
        .toLowerCase()
        .includes(q)
    );
  }, [sales, search]);

  const totalRevenue = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.total || 0), 0),
    [sales],
  );

  const paidCount = useMemo(
    () =>
      sales.filter((s) => (s.payment_status || "").toLowerCase() === "paid")
        .length,
    [sales],
  );

  return (
    <div className="sales-page">
      {/* HEADER */}
      <div className="sales-page-head">
        <div>
          <h1>Sales History</h1>
          <p>Completed sales and batch allocations.</p>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="sales-stats">
        <div className="sales-stat-card">
          <div className="sales-stat-icon sales-stat-icon-purple">
            <Receipt size={19} />
          </div>

          <div>
            <span>Total Sales</span>
            <strong>{sales.length}</strong>
          </div>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-icon">
            <TrendingUp size={19} />
          </div>

          <div>
            <span>Total Revenue</span>
            <strong>₱{totalRevenue.toFixed(2)}</strong>
          </div>
        </div>

        <div className="sales-stat-card">
          <div className="sales-stat-icon">
            <Wallet size={19} />
          </div>

          <div>
            <span>Paid Invoices</span>
            <strong>{paidCount}</strong>
          </div>
        </div>
      </div>

      {/* SALES DIRECTORY */}
      <section className="sales-list-panel">
        {/* TOOLBAR */}
        <div className="sales-toolbar">
          <div className="sales-search">
            <Search size={17} />

            <input
              placeholder="Search invoice or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                type="button"
                className="sales-search-clear"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <span className="sales-toolbar-count">
            {filtered.length} {filtered.length === 1 ? "sale" : "sales"}
          </span>
        </div>

        {/* TABLE */}
        <div className="sales-table-wrap">
          {loading ? (
            <div className="sales-loading">
              <div className="sales-loading-spinner" />

              <div>
                <strong>Loading sales</strong>
                <span>Please wait a moment...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="sales-empty">
              <div className="sales-empty-icon">
                <Receipt size={23} />
              </div>

              <h3>{search ? "No sales found" : "No sales yet"}</h3>

              <p>
                {search
                  ? "Try changing your search."
                  : "Completed sales will appear here."}
              </p>
            </div>
          ) : (
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Served by</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.invoice_number}</strong>
                    </td>

                    <td>{s.customer_name || "Walk-in"}</td>

                    <td>{s.sold_by_name || s.sold_by || "—"}</td>

                    <td>₱{Number(s.total).toFixed(2)}</td>

                    <td>
                      <span
                        className={`sales-badge sales-badge-${
                          (s.payment_status || "").toLowerCase()
                        }`}
                      >
                        {s.payment_status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`sales-badge sales-badge-${
                          (s.status || "").toLowerCase()
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td>{new Date(s.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}