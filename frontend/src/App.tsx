import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import type { ReactNode } from "react";

import { createPortal } from "react-dom";

import {
  Bell,
  CheckCheck,
  ChevronDown,
  Clock3,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  Receipt,
  ShoppingCart,
  Trash2,
  Truck,
  Undo2,
  UserCog,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { api } from "./api";
import type { WebOrder } from "./types";

import { useAuth } from "./auth/AuthContext";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import POSPage from "./pages/POSPage";
import CustomersPage from "./pages/CustomersPage";
import SalesPage from "./pages/SalesPage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import ReceivingPage from "./pages/ReceivingPage";
import PayablesPage from "./pages/PayablesPage";
import ReturnsPage from "./pages/ReturnsPage";
import WarehousesPage from "./pages/WarehousesPage";
import EmployeesPage from "./pages/EmployeesPage";
import ProductsPage from "./pages/ProductsPage";
import AccountPage from "./pages/AccountPage";
import WebOrdersPage from "./pages/WebOrdersPage";

import ValueCareLogo from "./assets/ValueCareLogo.png";

import "./style/sidebar.css";


/* =========================================================
   LOADING SCREEN
========================================================= */

function LoadingScreen() {
  return (
    <div className="loading-screen">

      <div className="loading-card">

        <div className="loading-logo">
          VC
        </div>

        <div className="loading-spinner" />

        <h3>
          Loading ValueCare
        </h3>

        <p>
          Preparing your workspace...
        </p>

      </div>

    </div>
  );
}


/* =========================================================
   PROTECTED
========================================================= */

function Protected({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? (
    <>{children}</>
  ) : (
    <Navigate
      to="/login"
      replace
    />
  );
}


/* =========================================================
   LIVE DATE / TIME
========================================================= */

function LiveDateTime() {
  const [now, setNow] = useState(
    new Date()
  );

  useEffect(() => {

    const timer =
      window.setInterval(() => {
        setNow(new Date());
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };

  }, []);

  const time =
    now.toLocaleTimeString(
      "en-PH",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }
    );

  const date =
    now.toLocaleDateString(
      "en-PH",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );

  return (
    <div className="datetime-pill">

      <div className="datetime-icon">
        <Clock3 size={18} />
      </div>

      <div className="datetime-content">

        <strong>
          {time}
        </strong>

        <span>
          {date}
        </span>

      </div>

    </div>
  );
}


/* =========================================================
   NOTIFICATION TYPE
========================================================= */

type NotificationItem = {
  id: number;
  type: "ORDER";
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  order: WebOrder;
};


/* =========================================================
   NOTIFICATION MODAL
========================================================= */

function NotificationModal({
  notifications,
  onClose,
  onReadAll,
  onDelete,
  onMarkRead,
}: {
  notifications: NotificationItem[];
  onClose: () => void;
  onReadAll: () => void;
  onDelete: (id: number) => void;
  onMarkRead: (id: number) => void;
}) {

  const [
    filter,
    setFilter,
  ] = useState<"all" | "unread">(
    "all"
  );


  const filteredNotifications =
    filter === "unread"
      ? notifications.filter(
          (notification) =>
            !notification.read
        )
      : notifications;


  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;


  /* -------------------------------------------------------
     CLOSE WITH ESCAPE
  ------------------------------------------------------- */

  useEffect(() => {

    function handleEscape(
      event: KeyboardEvent
    ) {
      if (
        event.key === "Escape"
      ) {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };

  }, [onClose]);


  return createPortal(

    <div
      className="notification-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }

      }}
    >

      <div
        className="notification-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="notification-modal-header">

          <div>

            <div className="notification-modal-kicker">
              Updates
            </div>

            <h2 id="notification-title">
              Notifications
            </h2>

            <p>
              Stay updated with your latest
              activities.
            </p>

          </div>

          <button
            className="notification-close"
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X size={19} />
          </button>

        </div>


        {/* =================================================
            FILTER BAR
        ================================================= */}

        <div className="notification-toolbar">

          <div className="notification-filters">

            <button
              type="button"
              className={
                filter === "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All
            </button>

            <button
              type="button"
              className={
                filter === "unread"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setFilter("unread")
              }
            >
              Unread

              {unreadCount > 0 && (
                <span className="filter-count">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}

            </button>

          </div>


          <button
            className="read-all-button"
            type="button"
            onClick={onReadAll}
            disabled={unreadCount === 0}
          >
            <CheckCheck size={15} />

            Read all
          </button>

        </div>


        {/* =================================================
            ORDERS CATEGORY
        ================================================= */}

        <div className="notification-category">

          <div className="notification-category-left">

            <div className="notification-category-icon">
              <ShoppingCart size={15} />
            </div>

            <div>

              <strong>
                Orders
              </strong>

              <span>
                Website orders requiring attention
              </span>

            </div>

          </div>

          {notifications.length > 0 && (
            <span className="notification-category-count">
              {notifications.length}
            </span>
          )}

        </div>


        {/* =================================================
            NOTIFICATION LIST
        ================================================= */}

        <div className="notification-list">

          {filteredNotifications.length === 0 ? (

            <div className="notification-empty">

              <div className="notification-empty-icon">
                <Bell size={25} />
              </div>

              <strong>
                No notifications
              </strong>

              <span>
                {filter === "unread"
                  ? "You have no unread notifications."
                  : "You're all caught up."}
              </span>

            </div>

          ) : (

            filteredNotifications.map(
              (notification) => {

                const order =
                  notification.order;

                const amount =
                  Number(
                    order.total || 0
                  ).toLocaleString(
                    "en-PH",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  );

                return (

                  <div
                    key={notification.id}
                    className={`notification-item ${
                      notification.read
                        ? "is-read"
                        : "is-unread"
                    }`}
                    onClick={() =>
                      onMarkRead(
                        notification.id
                      )
                    }
                  >

                    {/* ICON */}

                    <div className="notification-item-icon">
                      <ShoppingCart
                        size={17}
                      />
                    </div>


                    {/* CONTENT */}

                    <div className="notification-item-content">

                      <div className="notification-title-row">

                        <strong>
                          {notification.title}
                        </strong>

                        {!notification.read && (
                          <span className="notification-unread-dot" />
                        )}

                      </div>


                      <p>
                        {order.contact_name ||
                          "Customer"}{" "}
                        placed an order
                        worth{" "}
                        <strong>
                          ₱{amount}
                        </strong>
                        .
                      </p>


                      <div className="notification-meta">

                        <span>
                          {new Date(
                            notification.created_at
                          ).toLocaleString(
                            "en-PH",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </span>

                        <span>
                          {order.status}
                        </span>

                      </div>

                    </div>


                    {/* DELETE */}

                    <button
                      className="notification-delete"
                      type="button"
                      title="Delete notification"
                      aria-label="Delete notification"
                      onClick={(event) => {

                        event.stopPropagation();

                        onDelete(
                          notification.id
                        );

                      }}
                    >
                      <Trash2 size={15} />
                    </button>

                  </div>

                );
              }
            )

          )}

        </div>

      </div>

    </div>,

    document.body

  );
}


/* =========================================================
   PROFILE DROPDOWN
========================================================= */

function ProfileDropdown({
  webOrderCount,
  onOpenNotifications,
}: {
  webOrderCount: number;
  onOpenNotifications: () => void;
}) {

  const {
    user,
    logout,
  } = useAuth();

  const [open, setOpen] =
    useState(false);

  const [
    confirmingLogout,
    setConfirmingLogout,
  ] = useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);


  /* -------------------------------------------------------
     CLOSE WHEN CLICKING OUTSIDE
  ------------------------------------------------------- */

  useEffect(() => {

    function handleClickOutside(
      event: MouseEvent
    ) {

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {

        setOpen(false);

      }

    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  /* -------------------------------------------------------
     USER DETAILS
  ------------------------------------------------------- */

  const fullName =
    `${user?.first_name || ""} ${
      user?.last_name || ""
    }`.trim() ||
    user?.employee_id ||
    "User";


  const firstName =
    user?.first_name ||
    "";


  const role =
    user?.role
      ?.replaceAll("_", " ")
      .toLowerCase()
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      ) ||
    "Staff";


  const initials =
    fullName
      .split(" ")
      .map(
        (name) =>
          name[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();


  return (

    <div
      className="profile-area"
      ref={dropdownRef}
    >

      {/* =================================================
          PROFILE CARD
      ================================================= */}

      <div className="profile-card">

        {/* NOTIFICATION BELL */}

        <button
          className="notification-button"
          type="button"
          onClick={onOpenNotifications}
          title={
            webOrderCount > 0
              ? `${webOrderCount} pending web order${
                  webOrderCount === 1
                    ? ""
                    : "s"
                }`
              : "Notifications"
          }
          aria-label={
            webOrderCount > 0
              ? `${webOrderCount} pending web orders`
              : "Notifications"
          }
        >

          <Bell size={18} />

          {webOrderCount > 0 && (

            <span className="notification-count">

              {webOrderCount > 99
                ? "99+"
                : webOrderCount}

            </span>

          )}

        </button>


        {/* PROFILE BUTTON */}

        <button
          className="profile-pill"
          onClick={() =>
            setOpen(
              (value) => !value
            )
          }
          type="button"
          aria-expanded={open}
        >

          <div className="profile-avatar">
            {initials}
          </div>

          <div className="profile-info">

            <strong>
              {firstName}
            </strong>

            <span>
              {role}
            </span>

          </div>

          <ChevronDown
            size={17}
            className={`profile-chevron ${
              open
                ? "rotate"
                : ""
            }`}
          />

        </button>

      </div>


      {/* =================================================
          PROFILE DROPDOWN
      ================================================= */}

      {open && (

        <div className="profile-dropdown">

          <div className="dropdown-user">

            <div className="dropdown-avatar">
              {initials}
            </div>

            <div>

              <strong>
                {fullName}
              </strong>

              <span>
                {role}
              </span>

            </div>

          </div>


          <div className="dropdown-divider" />


          {/* ACCOUNT */}

          <Link
            to="/account"
            className="dropdown-item"
            onClick={() =>
              setOpen(false)
            }
          >

            <UserRound size={18} />

            <span>
              Account
            </span>

          </Link>


          {/* LOGOUT */}

          <button
            className="dropdown-item logout-item"
            onClick={() => {

              setOpen(false);

              setConfirmingLogout(
                true
              );

            }}
            type="button"
          >

            <LogOut size={18} />

            <span>
              Logout
            </span>

          </button>

        </div>

      )}


      {/* =================================================
          LOGOUT MODAL
      ================================================= */}

      {confirmingLogout &&
        createPortal(

          <div
            className="logout-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {

              if (
                event.target ===
                event.currentTarget
              ) {

                setConfirmingLogout(
                  false
                );

              }

            }}
          >

            <div
              className="logout-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-title"
            >

              <div className="logout-modal-icon">
                <LogOut size={20} />
              </div>

              <div className="logout-modal-kicker">
                Sign out
              </div>

              <h2 id="logout-title">
                Log out of ValueCare?
              </h2>

              <p>
                Are you sure you want to
                log out of your ValueCare
                account?
              </p>

              <div className="logout-modal-actions">

                <button
                  className="logout-cancel"
                  type="button"
                  onClick={() =>
                    setConfirmingLogout(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  className="logout-confirm"
                  type="button"
                  onClick={logout}
                >

                  <LogOut size={16} />

                  Log out

                </button>

              </div>

            </div>

          </div>,

          document.body

        )}

    </div>

  );
}


/* =========================================================
   MAIN LAYOUT
========================================================= */

function Layout() {

  const { user } =
    useAuth();

  const location =
    useLocation();


  const [
    webOrderCount,
    setWebOrderCount,
  ] = useState(0);


  const [
    notifications,
    setNotifications,
  ] = useState<
    NotificationItem[]
  >([]);


  const [
    notificationOpen,
    setNotificationOpen,
  ] = useState(false);


  /* =======================================================
     WEB ORDER NOTIFICATION

     PENDING + CONTACTED orders are considered
     orders requiring staff attention.
  ======================================================= */

  useEffect(() => {

    let mounted = true;


    const fetchWebOrders =
      async () => {

        try {

          const response =
            await api.get<WebOrder[]>(
              "/web-orders/?status=PENDING,CONTACTED"
            );


          if (!mounted) {
            return;
          }


          const orders =
            response.data;


          setWebOrderCount(
            orders.length
          );


          setNotifications(
            (current) => {

              return orders.map(
                (order) => {

                  const existing =
                    current.find(
                      (notification) =>
                        notification.id ===
                        order.id
                    );


                  return {

                    id: order.id,

                    type: "ORDER",

                    title:
                      `Web order ${order.order_number}`,

                    message:
                      `${order.contact_name || "Customer"} placed a new web order.`,

                    created_at:
                      order.created_at,

                    /*
                     * Preserve the read state
                     * while the app is running.
                     */
                    read:
                      existing?.read ??
                      false,

                    order,

                  };

                }
              );

            }
          );

        } catch (error) {

          console.error(
            "Failed to fetch web orders:",
            error
          );


          if (mounted) {

            setWebOrderCount(0);

          }

        }

      };


    /* INITIAL REQUEST */

    fetchWebOrders();


    /* REFRESH EVERY 30 SECONDS */

    const interval =
      window.setInterval(
        fetchWebOrders,
        30000
      );


    return () => {

      mounted = false;

      window.clearInterval(
        interval
      );

    };

  }, []);


  /* =======================================================
     MARK ONE AS READ
  ======================================================= */

  const markNotificationRead =
    (id: number) => {

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id === id
                ? {
                    ...notification,
                    read: true,
                  }
                : notification
          )
      );

    };


  /* =======================================================
     READ ALL
  ======================================================= */

  const markAllNotificationsRead =
    () => {

      setNotifications(
        (current) =>
          current.map(
            (notification) => ({
              ...notification,
              read: true,
            })
          )
      );

    };


  /* =======================================================
     DELETE ONE
  ======================================================= */

  const deleteNotification =
    (id: number) => {

      setNotifications(
        (current) =>
          current.filter(
            (notification) =>
              notification.id !== id
          )
      );

    };


  /* =========================================================
     SIDEBAR LINKS
  ========================================================= */

  const linksByRole = {

    SUPER_ADMIN: [

      ["/", "Dashboard", LayoutDashboard],

      ["/pos", "Sales / POS", ShoppingCart],

      ["/web-orders", "Web Orders", ShoppingCart],

      ["/customers", "Customers", Users],

      ["/sales", "Sales History", Receipt],

      ["/products", "Products", Package],

      ["/warehouses", "Inventory", Warehouse],

      ["/purchase-orders", "Purchasing", Package],

      ["/receiving", "Stock Receiving", PackagePlus],

      ["/suppliers", "Suppliers", Truck],

      ["/payables", "Payments", Wallet],

      ["/returns", "Returns", Undo2],

      ["/employees", "Employees", UserCog],

    ],

    ADMIN: [

      ["/", "Dashboard", LayoutDashboard],

      ["/pos", "Sales / POS", ShoppingCart],

      ["/web-orders", "Web Orders", ShoppingCart],

      ["/customers", "Customers", Users],

      ["/sales", "Sales History", Receipt],

      ["/products", "Products", Package],

      ["/warehouses", "Inventory", Warehouse],

      ["/purchase-orders", "Purchasing", Package],

      ["/receiving", "Stock Receiving", PackagePlus],

      ["/suppliers", "Suppliers", Truck],

      ["/payables", "Payments", Wallet],

      ["/employees", "Employees", UserCog],

    ],

    MANAGER: [

      ["/", "Dashboard", LayoutDashboard],

      ["/sales", "Sales", Receipt],

      ["/web-orders", "Web Orders", ShoppingCart],

      ["/customers", "Customers", Users],

      ["/products", "Products", Package],

      ["/warehouses", "Inventory", Warehouse],

      ["/purchase-orders", "Purchasing", Package],

      ["/receiving", "Stock Receiving", PackagePlus],

      ["/suppliers", "Suppliers", Truck],

    ],

    SALES: [

      ["/", "Dashboard", LayoutDashboard],

      ["/pos", "POS", ShoppingCart],

      ["/web-orders", "Web Orders", ShoppingCart],

      ["/customers", "Customers", Users],

      ["/sales", "Sales History", Receipt],

      ["/payables", "Payments", Wallet],

    ],

    WAREHOUSE: [

      ["/", "Dashboard", LayoutDashboard],

      ["/warehouses", "Inventory", Warehouse],

      ["/receiving", "Receiving", PackagePlus],

      ["/products", "Products", Package],

      ["/purchase-orders", "Purchasing", Package],

      ["/suppliers", "Suppliers", Truck],

      ["/returns", "Stock Returns", Undo2],

    ],

    ACCOUNTING: [

      ["/", "Dashboard", LayoutDashboard],

      ["/sales", "Sales", Receipt],

      ["/payables", "Payments", Wallet],

      ["/customers", "Customers", Users],

      ["/suppliers", "Suppliers", Truck],

      ["/purchase-orders", "Invoices", Package],

    ],

  } as const;


  const links =
    linksByRole[
      user?.role as keyof typeof linksByRole
    ] ||
    linksByRole.SALES;


  return (

    <div className="app-shell">


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        {/* BRAND */}

        <div className="brand-area">

          <div className="brand-logo">

            <img
              src={ValueCareLogo}
              alt="ValueCare"
            />

          </div>

          <div>

            <div className="brand">
              ValueCare
            </div>

            <span className="brand-subtitle">
              Medical Supply System
            </span>

          </div>

        </div>


        {/* SECTION */}

        <div className="sidebar-section-title">
          WORKSPACE
        </div>


        {/* NAVIGATION */}

        <nav>

          {links.map(
            ([href, label, Icon]) => (

              <Link
                className={
                  location.pathname === href
                    ? "nav active"
                    : "nav"
                }
                to={href}
                key={href}
              >

                <Icon size={18} />

                <span className="nav-label">
                  {label}
                </span>


                {/* RED WEB ORDER COUNT */}

                {href === "/web-orders" &&
                  webOrderCount > 0 && (

                    <span className="notification-badge">

                      {webOrderCount > 99
                        ? "99+"
                        : webOrderCount}

                    </span>

                  )}

              </Link>

            )
          )}

        </nav>

      </aside>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="main">


        {/* TOP BAR */}

        <header className="topbar">

          {/* LEFT */}

          <div className="topbar-left">

            <LiveDateTime />

          </div>


          {/* RIGHT */}

          <div className="topbar-right">

            <ProfileDropdown
              webOrderCount={
                webOrderCount
              }
              onOpenNotifications={() =>
                setNotificationOpen(true)
              }
            />

          </div>

        </header>


        {/* PAGE CONTENT */}

        <div className="page-content">

          <Routes>

            <Route
              path="/"
              element={
                <DashboardPage />
              }
            />

            <Route
              path="/pos"
              element={
                <POSPage />
              }
            />

            <Route
              path="/customers"
              element={
                <CustomersPage />
              }
            />

            <Route
              path="/sales"
              element={
                <SalesPage />
              }
            />

            <Route
              path="/suppliers"
              element={
                <SuppliersPage />
              }
            />

            <Route
              path="/purchase-orders"
              element={
                <PurchaseOrdersPage />
              }
            />

            <Route
              path="/receiving"
              element={
                <ReceivingPage />
              }
            />

            <Route
              path="/payables"
              element={
                <PayablesPage />
              }
            />

            <Route
              path="/returns"
              element={
                <ReturnsPage />
              }
            />

            <Route
              path="/warehouses"
              element={
                <WarehousesPage />
              }
            />

            <Route
              path="/employees"
              element={
                <EmployeesPage />
              }
            />

            <Route
              path="/products"
              element={
                <ProductsPage />
              }
            />

            <Route
              path="/account"
              element={
                <AccountPage />
              }
            />

            <Route
              path="/web-orders"
              element={
                <WebOrdersPage />
              }
            />

          </Routes>

        </div>

      </main>


      {/* =====================================================
          NOTIFICATION MODAL
      ===================================================== */}

      {notificationOpen && (

        <NotificationModal
          notifications={
            notifications
          }

          onClose={() =>
            setNotificationOpen(false)
          }

          onReadAll={
            markAllNotificationsRead
          }

          onDelete={
            deleteNotification
          }

          onMarkRead={
            markNotificationRead
          }
        />

      )}

    </div>
  );
}


/* =========================================================
   APP
========================================================= */

export default function App() {

  return (

    <Routes>

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />

      <Route
        path="/*"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      />

    </Routes>

  );
}
