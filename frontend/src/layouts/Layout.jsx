import { useState } from "react";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import UserMenu from "../components/UserMenu";
import Header from "../components/Header";
import Copyright from "../components/Copyright";
import MobileNavDrawer from "../components/MobileNavDrawer";
import { Outlet, useNavigate, useLocation } from "react-router-dom";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";

const BOTTOM_NAV_ITEMS = [
  { label: "Dashboard", icon: <DashboardRoundedIcon />, path: "/" },
  {
    label: "Holdings",
    icon: <AccountBalanceWalletRoundedIcon />,
    path: "/holdings",
  },
  {
    label: "Trends",
    icon: <TrendingUpRoundedIcon />,
    path: "/market-trends",
  },
  { label: "Blotter", icon: <ReceiptLongRoundedIcon />, path: "/blotter" },
  {
    label: "Allocation",
    icon: <PieChartRoundedIcon />,
    path: "/asset-allocation",
  },
];

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = BOTTOM_NAV_ITEMS.findIndex(
    (item) => item.path === location.pathname,
  );

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Desktop sidebar */}
      <UserMenu />

      {/* Mobile nav drawer */}
      <MobileNavDrawer
        open={mobileNavOpen}
        onOpen={() => setMobileNavOpen(true)}
        onClose={() => setMobileNavOpen(false)}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <Box
          sx={{
            flexGrow: 1,
            px: { md: 0.75 },
            pt: 0.5,
            // Extra bottom padding on mobile to avoid content going behind bottom nav
            pb: { xs: "72px", md: 2 },
          }}
        >
          <Outlet />
        </Box>
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <Copyright sx={{ mt: 2, mb: 2 }} />
        </Box>
      </Box>

      {/* ── Mobile Bottom Navigation ── */}
      <Paper
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
        elevation={3}
      >
        <BottomNavigation
          value={currentTab === -1 ? false : currentTab}
          onChange={(_, newValue) => {
            navigate(BOTTOM_NAV_ITEMS[newValue].path);
          }}
          showLabels
          sx={{ height: 64 }}
        >
          {BOTTOM_NAV_ITEMS.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              icon={item.icon}
              sx={{
                minWidth: 0,
                px: 0.5,
                "& .MuiBottomNavigationAction-label": {
                  fontSize: "0.6rem",
                },
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
