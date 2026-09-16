import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Package,
  ShoppingCart,
  AlertTriangle,
  Clock3,
  Truck,
  Users,
  PhilippinePeso,
  ChevronRight,
  Receipt,
} from "lucide-react";

import "../style/dashboard.css";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api";

const dashboardTitles: Record<string, { title: string; subtitle: string }> = {
  SUPER_ADMIN: {
    title: "Dashboard",
    subtitle: "A complete view of business operations and system health.",
  },
  ADMIN: {
    title: "Dashboard",
    subtitle: "Monitor sales, inventory, customers, and purchasing.",
  },
  MANAGER: {
    title: "Dashboard",
    subtitle: "Track performance, stock, sales, and purchasing activity.",
  },
  SALES: {
    title: "Dashboard",
    subtitle: "Keep customer conversations and checkout moving.",
  },
  WAREHOUSE: {
    title: "Dashboard",
    subtitle: "Stay ahead of stock levels, receiving, and expiry risk.",
  },
  ACCOUNTING: {
    title: "Dashboard",
    subtitle: "Keep revenue, payments, receivables, and payables visible.",
  },
};

function formatRole(role?: string) {
  return (
    role
      ?.replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Staff"
  );
}

interface DashboardStats {
  todaysSales: number;
  todaysTransactions: number;
  lowStockItems: number;
  expiringBatches: number;
  totalItems: number;
  inStock: number;
  expiringSoon: number;
  expired: number;
  recentSales: any[];
  expiringProducts: any[];
  salesChange: number;
}

const EMPTY_STATS: DashboardStats = {
  todaysSales: 0,
  todaysTransactions: 0,
  lowStockItems: 0,
  expiringBatches: 0,
  totalItems: 0,
  inStock: 0,
  expiringSoon: 0,
  expired: 0,
  recentSales: [],
  expiringProducts: [],
  salesChange: 0,
};

type Period = "week" | "month" | "year";

interface ChartPoint {
  label: string;
  total: number;
}

function buildChartData(sales: any[], period: Period): ChartPoint[] {
  const now = new Date();

  if (period === "week") {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay()); // back to Sunday

    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return { label: dayNames[d.getDay()], date: d, total: 0 };
    });

    sales.forEach((sale) => {
      const d = new Date(sale.created_at);
      const idx = buckets.findIndex(
        (b) =>
          d.getFullYear() === b.date.getFullYear() &&
          d.getMonth() === b.date.getMonth() &&
          d.getDate() === b.date.getDate()
      );
      if (idx !== -1) buckets[idx].total += parseFloat(sale.total || 0);
    });

    // Reorder so the week displays Mon → Sun
    const reordered = [...buckets.slice(1), buckets[0]];
    return reordered.map((b) => ({ label: b.label, total: b.total }));
  }

  if (period === "month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const buckets: ChartPoint[] = Array.from({ length: daysInMonth }, (_, i) => ({
      label: String(i + 1),
      total: 0,
    }));

    sales.forEach((sale) => {
      const d = new Date(sale.created_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        buckets[d.getDate() - 1].total += parseFloat(sale.total || 0);
      }
    });

    return buckets;
  }

  // year
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const year = now.getFullYear();
  const buckets: ChartPoint[] = monthNames.map((label) => ({ label, total: 0 }));

  sales.forEach((sale) => {
    const d = new Date(sale.created_at);
    if (d.getFullYear() === year) {
      buckets[d.getMonth()].total += parseFloat(sale.total || 0);
    }
  });

  return buckets;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [completedSales, setCompletedSales] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);

  const dashboard = dashboardTitles[user?.role || "SALES"] || dashboardTitles.SALES;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // All four requests are independent — fire them in parallel instead of
      // awaiting one at a time (cuts load time roughly 4x vs sequential).
      const [salesRes, batchRes, expiringRes, productsRes] = await Promise.all([
        api.get("/sales/"),
        api.get("/inventory/batches/"),
        api.get("/inventory/batches/expiring/"),
        api.get("/products/"),
      ]);

      const allSales = salesRes.data.results || salesRes.data || [];
      const allBatches = batchRes.data.results || batchRes.data || [];
      const expiringProducts = (expiringRes.data.results || expiringRes.data || []).slice(0, 5);
      const allProducts = productsRes.data.results || productsRes.data || [];

      const completed = allSales.filter((sale: any) => sale.status === "COMPLETED");
      setCompletedSales(completed);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const todaysSales = completed.filter((sale: any) => {
        const d = new Date(sale.created_at);
        return d >= startOfToday && d < startOfTomorrow;
      });
      const yesterdaysSales = completed.filter((sale: any) => {
        const d = new Date(sale.created_at);
        return d >= startOfYesterday && d < startOfToday;
      });

      const todaysSalesAmount = todaysSales.reduce(
        (sum: number, sale: any) => sum + parseFloat(sale.total || 0),
        0
      );
      const yesterdaysSalesAmount = yesterdaysSales.reduce(
        (sum: number, sale: any) => sum + parseFloat(sale.total || 0),
        0
      );
      const salesChange =
        yesterdaysSalesAmount > 0
          ? ((todaysSalesAmount - yesterdaysSalesAmount) / yesterdaysSalesAmount) * 100
          : 0;

      // Batch breakdown — is_expired and days_to_expiry are computed
      // server-side, so we trust them rather than re-deriving from dates.
      const activeBatches = allBatches.filter((b: any) => b.is_active && b.quantity > 0);
      const expiredBatches = activeBatches.filter((b: any) => b.is_expired);
      const expiringSoonBatches = activeBatches.filter((b: any) => {
        if (b.is_expired || !b.expiration_date) return false;
        const days = b.days_to_expiry;
        return typeof days === "number" ? days <= 90 : false;
      });
      const expiringSoonIds = new Set(expiringSoonBatches.map((b: any) => b.id));
      const inStockBatches = activeBatches.filter(
        (b: any) => !b.is_expired && !expiringSoonIds.has(b.id)
      );

      // Low stock is a direct product-level comparison — current_stock is
      // already computed by the API, so no batch loop is needed here.
      const lowStockCount = allProducts.reduce((count: number, product: any) => {
        const currentStock = parseFloat(product.current_stock || 0);
        const reorderLevel = parseFloat(product.reorder_level || 0);
        return currentStock < reorderLevel ? count + 1 : count;
      }, 0);

      setStats({
        todaysSales: todaysSalesAmount,
        todaysTransactions: todaysSales.length,
        lowStockItems: lowStockCount,
        expiringBatches: expiringSoonBatches.length,
        totalItems: activeBatches.length,
        inStock: inStockBatches.length,
        expiringSoon: expiringSoonBatches.length,
        expired: expiredBatches.length,
        recentSales: todaysSales.slice(0, 5),
        expiringProducts,
        salesChange: Math.round(salesChange * 10) / 10,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = buildChartData(completedSales, period);
  const maxValue = Math.max(...chartData.map((d) => d.total), 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
  const yMax = Math.ceil(maxValue / magnitude) * magnitude || 1;
  const yTicks = [1, 0.8, 0.6, 0.4, 0.2, 0].map((f) => yMax * f);

  return (
    <div className="dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <div className="dashboard-breadcrumb">Overview</div>
          <h1>{dashboard.title}</h1>
          <p>{dashboard.subtitle}</p>
        </div>

        <div className="dashboard-actions">
          <Link className="secondary-button" to="/products">
            <Package size={16} />
            Products
          </Link>

          <Link className="primary-button" to="/pos">
            <ShoppingCart size={16} />
            Open POS
          </Link>
        </div>
      </div>

      {/* TOP STAT CARDS */}
      {loading ? (
        <div className="dashboard-stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <div className="stat-card skeleton-card" key={i}>
              <div className="skeleton-icon" />
              <div className="skeleton-line short" />
              <div className="skeleton-line long" />
              <div className="skeleton-line medium" />
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-stat-grid">
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon purple">
                <PhilippinePeso size={20} />
              </div>
              <button className="card-menu">•••</button>
            </div>
            <span className="stat-label">Today's Sales</span>
            <strong className="stat-value">
              ₱
              {stats.todaysSales.toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
            <div className={`stat-change ${stats.salesChange >= 0 ? "positive" : "negative"}`}>
              {stats.salesChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{Math.abs(stats.salesChange)}%</span>
              <small>vs yesterday</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon blue">
                <ShoppingCart size={20} />
              </div>
              <button className="card-menu">•••</button>
            </div>
            <span className="stat-label">Transactions</span>
            <strong className="stat-value">{stats.todaysTransactions}</strong>
            <div className="stat-change positive">
              <ArrowUpRight size={14} />
              <span>{stats.todaysTransactions > 0 ? "Active" : "None"}</span>
              <small>today</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon orange">
                <AlertTriangle size={20} />
              </div>
              <button className="card-menu">•••</button>
            </div>
            <span className="stat-label">Low Stock</span>
            <strong className="stat-value">{stats.lowStockItems}</strong>
            <div className="stat-change warning">
              <AlertTriangle size={14} />
              <span>{stats.lowStockItems > 0 ? "Needs attention" : "All good"}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon pink">
                <Clock3 size={20} />
              </div>
              <button className="card-menu">•••</button>
            </div>
            <span className="stat-label">Expiring Batches</span>
            <strong className="stat-value">{stats.expiringBatches}</strong>
            <div className="stat-change danger">
              <Clock3 size={14} />
              <span>{stats.expiringBatches > 0 ? "Monitor closely" : "None"}</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN DASHBOARD GRID */}
      <div className="dashboard-grid">
        {/* SALES CHART */}
        <section className="dashboard-panel sales-chart-panel">
          <div className="panel-header">
            <div>
              <h2>Sales Overview</h2>
              <p>Revenue performance over the selected period.</p>
            </div>

            <select
              className="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
            >
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="year">This year</option>
            </select>
          </div>

          {loading ? (
            <div className="chart-area skeleton-chart">
              <div className="skeleton-line long" />
            </div>
          ) : (
            <div className="chart-area">
              <div className="chart-y-axis">
                {yTicks.map((tick, i) => (
                  <span key={i}>
                    ₱{tick >= 1000 ? `${Math.round(tick / 1000)}k` : Math.round(tick)}
                  </span>
                ))}
              </div>

              <div className="chart-content">
                <div className="chart-lines">
                  {yTicks.map((_, i) => (
                    <span key={i} />
                  ))}
                </div>

                <div className="chart-bars">
                  {chartData.map((point, index) => {
                    const showLabel = period !== "month" || index % 1 === 0;
                    return (
                      <div className="chart-column" key={index}>
                        {point.total > 0 && (
                          <div
                            className="chart-bar"
                            style={{ height: `${yMax > 0 ? (point.total / yMax) * 100 : 0}%` }}
                            title={`₱${point.total.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}`}
                          />
                        )}
                        <small style={{ visibility: showLabel ? "visible" : "hidden" }}>
                          {point.label}
                        </small>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* INVENTORY STATUS */}
        <section className="dashboard-panel inventory-panel">
          <div className="panel-header">
            <div>
              <h2>Inventory Status</h2>
              <p>Current stock health.</p>
            </div>
            <Link to="/warehouses">
              <ChevronRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="skeleton-inventory">
              <div className="skeleton-ring" />
              <div className="skeleton-line medium" />
              <div className="skeleton-line medium" />
              <div className="skeleton-line medium" />
            </div>
          ) : (
            <>
              <div className="inventory-circle-area">
                <div className="inventory-ring">
                  <div>
                    <strong>{stats.totalItems}</strong>
                    <span>Items</span>
                  </div>
                </div>
              </div>

              <div className="inventory-legend">
                <div>
                  <span className="legend-dot in-stock" />
                  <span>In Stock</span>
                  <strong>{stats.inStock}</strong>
                </div>

                <div>
                  <span className="legend-dot low-stock" />
                  <span>Expiring Soon</span>
                  <strong>{stats.expiringSoon}</strong>
                </div>

                <div>
                  <span className="legend-dot expiring" />
                  <span>Expired</span>
                  <strong>{stats.expired}</strong>
                </div>
              </div>
            </>
          )}
        </section>

        {/* RECENT SALES */}
        <section className="dashboard-panel recent-sales-panel">
          <div className="panel-header">
            <div>
              <h2>Recent Sales</h2>
              <p>Latest transactions.</p>
            </div>
            <Link to="/sales" className="view-all">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="recent-sales-list">
              {[1, 2, 3].map((i) => (
                <div className="sale-item skeleton-row" key={i}>
                  <div className="sale-info">
                    <div className="skeleton-line short" />
                    <div className="skeleton-line medium" />
                  </div>
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          ) : stats.recentSales && stats.recentSales.length > 0 ? (
            <div className="recent-sales-list">
              {stats.recentSales.map((sale: any) => (
                <div key={sale.id} className="sale-item">
                  <div className="sale-info">
                    <strong>{sale.invoice_number}</strong>
                    <span className="sale-customer">
                      {sale.customer_name ? sale.customer_name : "Walk-in"}
                    </span>
                  </div>
                  <div className="sale-amount">
                    ₱
                    {parseFloat(sale.total).toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                <Receipt size={21} />
              </div>
              <strong>No sales yet</strong>
              <span>Completed sales will appear here.</span>
            </div>
          )}
        </section>

        {/* EXPIRING PRODUCTS */}
        <section className="dashboard-panel expiry-panel">
          <div className="panel-header">
            <div>
              <h2>Expiry Monitoring</h2>
              <p>Products requiring attention.</p>
            </div>
            <Link to="/warehouses">
              <ChevronRight size={18} />
            </Link>
          </div>

          {loading ? (
            <div className="expiring-list">
              {[1, 2, 3].map((i) => (
                <div className="expiring-item skeleton-row" key={i}>
                  <div className="expiring-info">
                    <div className="skeleton-line short" />
                    <div className="skeleton-line medium" />
                  </div>
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          ) : stats.expiringProducts && stats.expiringProducts.length > 0 ? (
            <div className="expiring-list">
              {stats.expiringProducts.map((batch: any) => (
                <div key={batch.id} className="expiring-item">
                  <div className="expiring-info">
                    <strong>{batch.product_name || batch.product}</strong>
                    <span className="batch-number">Batch: {batch.batch_number}</span>
                  </div>
                  <div className="expiring-date">
                    <small>
                      Expires: {new Date(batch.expiration_date).toLocaleDateString("en-PH")}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <div className="empty-icon orange-icon">
                <Clock3 size={20} />
              </div>
              <strong>No expiring batches</strong>
              <span>Expiry alerts will appear here.</span>
            </div>
          )}
        </section>

        {/* QUICK OPERATIONS */}
        <section className="dashboard-panel quick-panel">
          <div className="panel-header">
            <div>
              <h2>Quick Operations</h2>
              <p>Common actions.</p>
            </div>
          </div>

          <div className="quick-actions">
            <Link to="/pos">
              <div className="quick-icon purple-bg">
                <ShoppingCart size={19} />
              </div>
              <div>
                <strong>New Sale</strong>
                <span>Open POS</span>
              </div>
              <ChevronRight size={16} />
            </Link>

            <Link to="/receiving">
              <div className="quick-icon blue-bg">
                <Truck size={19} />
              </div>
              <div>
                <strong>Receive Stock</strong>
                <span>Record incoming inventory</span>
              </div>
              <ChevronRight size={16} />
            </Link>

            <Link to="/customers">
              <div className="quick-icon green-bg">
                <Users size={19} />
              </div>
              <div>
                <strong>Customers</strong>
                <span>Manage business customers</span>
              </div>
              <ChevronRight size={16} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}