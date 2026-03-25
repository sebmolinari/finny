import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "../auth/ProtectedRoute";
import Layout from "../layouts/Layout";
import RouteErrorBoundary from "../components/RouteErrorBoundary";
import LoadingSpinner from "../components/LoadingSpinner";

const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Holdings = lazy(() => import("../pages/Holdings"));
const Users = lazy(() => import("../pages/Users"));
const Profile = lazy(() => import("../pages/Profile"));
const Blotter = lazy(() => import("../pages/Blotter"));
const Assets = lazy(() => import("../pages/Assets"));
const ReturnDetails = lazy(() => import("../pages/ReturnDetails"));
const CashDetails = lazy(() => import("../pages/CashDetails"));
const IncomeAnalytics = lazy(() => import("../pages/IncomeAnalytics"));
const Brokers = lazy(() => import("../pages/Brokers"));
const Settings = lazy(() => import("../pages/Settings"));
const AuditLogs = lazy(() => import("../pages/AuditLogs"));
const HostMetrics = lazy(() => import("../pages/HostMetrics"));
const MarketTrends = lazy(() => import("../pages/MarketTrends"));
const TaxReport = lazy(() => import("../pages/TaxReport"));
const ChangePassword = lazy(() => import("../pages/ChangePassword"));
const AssetAllocation = lazy(() => import("../pages/AssetAllocation"));
const Changelog = lazy(() => import("../pages/Changelog"));
const RiskMetrics = lazy(() => import("../pages/RiskMetrics"));
const EconomicCalendar = lazy(() => import("../pages/EconomicCalendar"));
const AdminOverview = lazy(() => import("../pages/AdminOverview"));
const Scheduler = lazy(() => import("../pages/Scheduler"));
const GettingStarted = lazy(() => import("../pages/GettingStarted"));
const MissingPrices = lazy(() => import("../pages/MissingPrices"));
const Features = lazy(() => import("../pages/Features"));
const PerformanceAttribution = lazy(() => import("../pages/PerformanceAttribution"));

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "login",
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Login />
          </Suspense>
        ),
      },
      {
        path: "register",
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Register />
          </Suspense>
        ),
      },
      {
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>
              <Layout />
            </Suspense>
          </ProtectedRoute>
        ),
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: "holdings",
            element: <Holdings />,
          },
          {
            path: "market-trends",
            element: <MarketTrends />,
          },
          {
            path: "blotter",
            element: <Blotter />,
          },
          {
            path: "return-details",
            element: <ReturnDetails />,
          },
          {
            path: "cash-details",
            element: <CashDetails />,
          },
          {
            path: "income",
            element: <IncomeAnalytics />,
          },
          {
            path: "tax-report",
            element: <TaxReport />,
          },
          {
            path: "asset-allocation",
            element: <AssetAllocation />,
          },
          {
            path: "assets",
            element: <Assets />,
          },
          {
            path: "brokers",
            element: <Brokers />,
          },
          {
            path: "settings",
            element: <Settings />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "change-password",
            element: <ChangePassword />,
          },
          {
            path: "changelog",
            element: <Changelog />,
          },
          {
            path: "features",
            element: <Features />,
          },
          {
            path: "getting-started",
            element: <GettingStarted />,
          },
          {
            path: "risk-metrics",
            element: <RiskMetrics />,
          },
          {
            path: "attribution",
            element: <PerformanceAttribution />,
          },
          {
            path: "economic-calendar",
            element: <EconomicCalendar />,
          },
          {
            path: "missing-prices",
            element: <MissingPrices />,
          },
          {
            path: "users",
            element: (
              <ProtectedRoute role="admin">
                <Users />
              </ProtectedRoute>
            ),
          },
          {
            path: "audit",
            element: (
              <ProtectedRoute role="admin">
                <AuditLogs />
              </ProtectedRoute>
            ),
          },
          {
            path: "schedulers",
            element: (
              <ProtectedRoute role="admin">
                <Scheduler />
              </ProtectedRoute>
            ),
          },
          {
            path: "host-metrics",
            element: (
              <ProtectedRoute role="admin">
                <HostMetrics />
              </ProtectedRoute>
            ),
          },
          {
            path: "admin/overview",
            element: (
              <ProtectedRoute role="admin">
                <AdminOverview />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
]);
