import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import Layout from "../layouts/Layout";
import RouteErrorBoundary from "../components/RouteErrorBoundary";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Holdings from "../pages/Holdings";
import Users from "../pages/Users";
import Profile from "../pages/Profile";
import Blotter from "../pages/Blotter";
import Assets from "../pages/Assets";
import ReturnDetails from "../pages/ReturnDetails";
import CashDetails from "../pages/CashDetails";
import IncomeAnalytics from "../pages/IncomeAnalytics";
import Brokers from "../pages/Brokers";
import Settings from "../pages/Settings";
import AuditLogs from "../pages/AuditLogs";
import HostMetrics from "../pages/HostMetrics";
import MarketTrends from "../pages/MarketTrends";
import TaxReport from "../pages/TaxReport";
import ChangePassword from "../pages/ChangePassword";
import AssetAllocation from "../pages/AssetAllocation";
import Changelog from "../pages/Changelog";
import RiskMetrics from "../pages/RiskMetrics";
import EconomicCalendar from "../pages/EconomicCalendar";
import AdminOverview from "../pages/AdminOverview";
import Scheduler from "../pages/Scheduler";
import GettingStarted from "../pages/GettingStarted";
import MissingPrices from "../pages/MissingPrices";
import Features from "../pages/Features";
import PerformanceAttribution from "../pages/PerformanceAttribution";

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "register",
        element: <Register />,
      },
      {
        element: (
          <ProtectedRoute>
            <Layout />
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
