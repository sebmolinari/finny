import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Holdings from "./pages/Holdings";
import Users from "./pages/Users";
import Profile from "./pages/Profile";
import Blotter from "./pages/Blotter";
import Assets from "./pages/Assets";
import ReturnsDetails from "./pages/ReturnsDetails";
import CashDetails from "./pages/CashDetails";
import Brokers from "./pages/Brokers";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";
import Metrics from "./pages/Metrics";
import MarketTrends from "./pages/MarketTrends";
import TaxReport from "./pages/TaxReport";
import ChangePassword from "./pages/ChangePassword";
import AssetAllocation from "./pages/AssetAllocation";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
        />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/holdings" element={<Holdings />} />
                <Route path="/market-trends" element={<MarketTrends />} />
                <Route path="/blotter" element={<Blotter />} />
                <Route path="/returns" element={<ReturnsDetails />} />
                <Route path="/cash-details" element={<CashDetails />} />
                <Route path="/tax-report" element={<TaxReport />} />
                <Route path="/asset-allocation" element={<AssetAllocation />} />
                <Route path="/assets" element={<Assets />} />
                <Route path="/brokers" element={<Brokers />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route
                  path="/users"
                  element={
                    <AdminRoute>
                      <Users />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/audit"
                  element={
                    <AdminRoute>
                      <AuditLogs />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/metrics"
                  element={
                    <AdminRoute>
                      <Metrics />
                    </AdminRoute>
                  }
                />
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
