import Typography from "@mui/material/Typography";
import { useLocation } from "react-router-dom";

const routeTitles = {
  "/": "Dashboard",
  "/holdings": "Holdings",
  "/market-trends": "Market Trends",
  "/blotter": "Blotter",
  "/asset-allocation": "Asset Allocation",
  "/assets": "Assets",
  "/brokers": "Brokers",
  "/cash-details": "Cash Details",
  "/return-details": "Return Details",
  "/allocation": "Allocation",
  "/analytics": "Analytics",
  "/cash": "Cash",
  "/settings": "Settings",
  "/changelog": "Changelog",
  "/tax-report": "Tax Report",
  "/users": "Users",
  "/audit": "Audit Logs",
  "/host-metrics": "Host Metrics",
  "/profile": "Profile",
  "/metrics": "Metrics",
  "/change-password": "Change Password",
  "/risk-metrics": "Risk Metrics",
  "/economic-calendar": "Economic Calendar",
  "/missing-prices": "Missing Prices",
  "/admin/overview": "Control Panel",
  "/schedulers": "Schedulers",
};

export default function NavbarBreadcrumbs() {
  const location = useLocation();
  const title = routeTitles[location.pathname] ?? "Finny";

  return (
    <Typography
      variant="h6"
      sx={{ fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}
    >
      {title}
    </Typography>
  );
}
