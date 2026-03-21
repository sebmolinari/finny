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
import PriceCheckRoundedIcon from "@mui/icons-material/PriceCheckRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ManageHistoryRoundedIcon from "@mui/icons-material/ManageHistoryRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import UpdateRoundedIcon from "@mui/icons-material/UpdateRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import TimerRoundedIcon from "@mui/icons-material/TimerRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

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
    text: "Blotter",
    icon: <ReceiptLongRoundedIcon fontSize="small" />,
    path: "/blotter",
  },
  { text: "Assets", icon: <AssetsIcon fontSize="small" />, path: "/assets" },
  {
    text: "Brokers",
    icon: <BusinessRoundedIcon fontSize="small" />,
    path: "/brokers",
  },
  {
    text: "Asset Allocation",
    icon: <PieChartRoundedIcon fontSize="small" />,
    path: "/asset-allocation",
  },
];

const analysisItems = [
  {
    text: "Market Trends",
    icon: <TrendingUpRoundedIcon fontSize="small" />,
    path: "/market-trends",
  },
  {
    text: "Risk Metrics",
    icon: <ShowChartRoundedIcon fontSize="small" />,
    path: "/risk-metrics",
  },
  {
    text: "Missing Prices",
    icon: <PriceCheckRoundedIcon fontSize="small" />,
    path: "/missing-prices",
  },
  {
    text: "Return Details",
    icon: <QueryStatsRoundedIcon fontSize="small" />,
    path: "/return-details",
  },
  {
    text: "Cash Details",
    icon: <SavingsRoundedIcon fontSize="small" />,
    path: "/cash-details",
  },
  {
    text: "Tax Report",
    icon: <ArticleRoundedIcon fontSize="small" />,
    path: "/tax-report",
  },
  {
    text: "Economic Calendar",
    icon: <CalendarMonthRoundedIcon fontSize="small" />,
    path: "/economic-calendar",
  },
];

const adminItems = [
  {
    text: "Schedulers",
    icon: <TimerRoundedIcon fontSize="small" />,
    path: "/schedulers",
  },
  {
    text: "Control Panel",
    icon: <DashboardCustomizeRoundedIcon fontSize="small" />,
    path: "/admin/overview",
  },
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
];

const otherItems = [
  {
    text: "Changelog",
    icon: <UpdateRoundedIcon fontSize="small" />,
    path: "/changelog",
  },
];

function NavSection({ label, items, pathname }) {
  return (
    <>
      {label && (
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
      )}
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const showGettingStarted = !user?.onboarding_completed;
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
        {isAdmin && (
          <NavSection
            label="Admin"
            items={adminItems}
            pathname={location.pathname}
          />
        )}
        <Divider sx={{ my: 1 }} />
        <NavSection
          label=""
          items={[
            ...(showGettingStarted
              ? [
                  {
                    text: "Getting Started",
                    icon: <RocketLaunchRoundedIcon fontSize="small" />,
                    path: "/getting-started",
                  },
                ]
              : []),
            ...otherItems,
          ]}
          pathname={location.pathname}
        />
      </div>
    </Stack>
  );
}
