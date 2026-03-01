import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

// ── Section: Portfolio ────────────────────────────────────────────
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";

// ── Section: Analysis ─────────────────────────────────────────────
import AssetsIcon from "@mui/icons-material/InventoryRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";

// ── Section: Admin ────────────────────────────────────────────────
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ManageHistoryRoundedIcon from "@mui/icons-material/ManageHistoryRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";

import { NavLink, useLocation } from "react-router-dom";

const portfolioItems = [
  {
    text: "Dashboard",
    icon: <DashboardRoundedIcon fontSize="small" />,
    path: "/",
  },
  {
    text: "Holdings",
    icon: <AccountBalanceWalletRoundedIcon fontSize="small" />,
    path: "/holdings",
  },
  {
    text: "Market Trends",
    icon: <TrendingUpRoundedIcon fontSize="small" />,
    path: "/market-trends",
  },
  {
    text: "Blotter",
    icon: <ReceiptLongRoundedIcon fontSize="small" />,
    path: "/blotter",
  },
  {
    text: "Asset Allocation",
    icon: <PieChartRoundedIcon fontSize="small" />,
    path: "/asset-allocation",
  },
];

const analysisItems = [
  { text: "Assets", icon: <AssetsIcon fontSize="small" />, path: "/assets" },
  {
    text: "Brokers",
    icon: <BusinessRoundedIcon fontSize="small" />,
    path: "/brokers",
  },
  {
    text: "Cash Details",
    icon: <SavingsRoundedIcon fontSize="small" />,
    path: "/cash-details",
  },
  {
    text: "Return Details",
    icon: <QueryStatsRoundedIcon fontSize="small" />,
    path: "/return-details",
  },
  {
    text: "Tax Report",
    icon: <ArticleRoundedIcon fontSize="small" />,
    path: "/tax-report",
  },
];

const adminItems = [
  {
    text: "Users",
    icon: <PeopleAltRoundedIcon fontSize="small" />,
    path: "/users",
  },
  {
    text: "Audit Logs",
    icon: <ManageHistoryRoundedIcon fontSize="small" />,
    path: "/audit",
  },
  {
    text: "Host Metrics",
    icon: <SpeedRoundedIcon fontSize="small" />,
    path: "/host-metrics",
  },
  {
    text: "Changelog",
    icon: <UpdateRoundedIcon fontSize="small" />,
    path: "/changelog",
  },
];

function NavSection({ label, items, pathname }) {
  return (
    <>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.disabled",
          px: 1.5,
          pt: 1.5,
          pb: 0.5,
          display: "block",
        }}
      >
        {label}
      </Typography>
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              selected={pathname === item.path}
              sx={{ py: 0.75 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}

export default function MenuContent() {
  const location = useLocation();
  return (
    <Stack
      sx={{
        flexGrow: 1,
        px: 1,
        py: 1,
        justifyContent: "space-between",
        overflowY: "auto",
      }}
    >
      <div>
        <NavSection
          label="Portfolio"
          items={portfolioItems}
          pathname={location.pathname}
        />
        <Divider sx={{ my: 1 }} />
        <NavSection
          label="Analysis"
          items={analysisItems}
          pathname={location.pathname}
        />
        <Divider sx={{ my: 1 }} />
        <NavSection
          label="Admin"
          items={adminItems}
          pathname={location.pathname}
        />
      </div>
    </Stack>
  );
}
