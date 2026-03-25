import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import ProtectedRoute from "../auth/ProtectedRoute";
import Layout from "../layouts/Layout";
import RouteErrorBoundary from "../components/ui/RouteErrorBoundary";
import LoadingSpinner from "../components/ui/LoadingSpinner";

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
            handle: { title: "Dashboard" },
            element: <Dashboard />,
          },
          {
            path: "holdings",
            handle: { title: "Holdings" },
            element: <Holdings />,
          },
          {
            path: "market-trends",
            handle: { title: "Market Trends" },
            element: <MarketTrends />,
          },
          {
            path: "blotter",
            handle: { title: "Blotter" },
            element: <Blotter />,
          },
          {
            path: "return-details",
            handle: { title: "Return Details" },
            element: <ReturnDetails />,
          },
          {
            path: "cash-details",
            handle: { title: "Cash & Liquidity" },
            element: <CashDetails />,
          },
          {
            path: "income",
            handle: { title: "Income Analytics" },
            element: <IncomeAnalytics />,
          },
          {
            path: "tax-report",
            handle: { title: "Tax Report" },
            element: <TaxReport />,
          },
          {
            path: "asset-allocation",
            handle: { title: "Asset Allocation" },
            element: <AssetAllocation />,
          },
          {
            path: "assets",
            handle: { title: "Assets" },
            element: <Assets />,
          },
          {
            path: "brokers",
            handle: { title: "Brokers" },
            element: <Brokers />,
          },
          {
            path: "settings",
            handle: { title: "Settings" },
            element: <Settings />,
          },
          {
            path: "profile",
            handle: { title: "Profile" },
            element: <Profile />,
          },
          {
            path: "change-password",
            handle: { title: "Change Password" },
            element: <ChangePassword />,
          },
          {
            path: "changelog",
            handle: { title: "Changelog" },
            element: <Changelog />,
          },
          {
            path: "features",
            handle: { title: "Features" },
            element: <Features />,
          },
          {
            path: "getting-started",
            handle: { title: "Getting Started" },
            element: <GettingStarted />,
          },
          {
            path: "risk-metrics",
            handle: { title: "Risk Metrics" },
            element: <RiskMetrics />,
          },
          {
            path: "attribution",
            handle: { title: "Performance Attribution" },
            element: <PerformanceAttribution />,
          },
          {
            path: "economic-calendar",
            handle: { title: "Economic Calendar" },
            element: <EconomicCalendar />,
          },
          {
            path: "missing-prices",
            handle: { title: "Missing Prices" },
            element: <MissingPrices />,
          },
          {
            path: "users",
            handle: { title: "Users" },
            element: (
              <ProtectedRoute role="admin">
                <Users />
              </ProtectedRoute>
            ),
          },
          {
            path: "audit",
            handle: { title: "Audit Log" },
            element: (
              <ProtectedRoute role="admin">
                <AuditLogs />
              </ProtectedRoute>
            ),
          },
          {
            path: "schedulers",
            handle: { title: "Schedulers" },
            element: (
              <ProtectedRoute role="admin">
                <Scheduler />
              </ProtectedRoute>
            ),
          },
          {
            path: "host-metrics",
            handle: { title: "Host Metrics" },
            element: (
              <ProtectedRoute role="admin">
                <HostMetrics />
              </ProtectedRoute>
            ),
          },
          {
            path: "admin/overview",
            handle: { title: "Admin Overview" },
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
