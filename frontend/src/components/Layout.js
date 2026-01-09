import React, { useState } from "react";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ChevronLeft as ChevronLeftIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon,
  AccountBalance as AccountBalanceIcon,
  Description as DescriptionIcon,
  ShowChart as ShowChartIcon,
  Lock as LockIcon,
  Inventory as InventoryIcon,
  Email as EmailIcon,
  PieChart as PieChartIcon,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { emailAPI } from "../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";

const drawerWidth = 240;

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDesktopDrawerToggle = () => {
    setDesktopOpen(!desktopOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleProfileClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileMenuClick = () => {
    navigate("/profile");
    handleMenuClose();
  };

  const handleChangePasswordClick = () => {
    navigate("/change-password");
    handleMenuClose();
  };

  const handleSendPortfolioEmail = async () => {
    handleMenuClose();
    try {
      const response = await emailAPI.sendPortfolioSummary();
      toast.success(`Portfolio email sent to ${response.data.email}`);
    } catch (error) {
      handleApiError(error, "Failed to send portfolio email");
    }
  };

  const isAdmin = user?.role === "admin";

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Holdings", icon: <InventoryIcon />, path: "/holdings" },
    { text: "Market Trends", icon: <TrendingUpIcon />, path: "/market-trends" },
    { text: "Blotter", icon: <ReceiptIcon />, path: "/blotter" },
    { type: "divider" },
    { text: "Assets", icon: <AssessmentIcon />, path: "/assets" },
    { text: "Brokers", icon: <BusinessIcon />, path: "/brokers" },
    {
      text: "Asset Allocation",
      icon: <PieChartIcon />,
      path: "/asset-allocation",
    },
    { type: "divider" },
    { text: "Return Details", icon: <TrendingUpIcon />, path: "/returns" },
    {
      text: "Cash Details",
      icon: <AccountBalanceIcon />,
      path: "/cash-details",
    },
    { text: "Tax Report", icon: <DescriptionIcon />, path: "/tax-report" },
    { type: "divider" },
    { text: "Settings", icon: <SettingsIcon />, path: "/settings" },
    ...(isAdmin
      ? [
          { type: "divider" },
          { text: "Users", icon: <PeopleIcon />, path: "/users" },
          { text: "Audit Logs", icon: <HistoryIcon />, path: "/audit" },
          { text: "Host Metrics", icon: <ShowChartIcon />, path: "/metrics" },
        ]
      : []),
  ];

  const drawer = (
    <Box>
      <Toolbar sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <ShowChartIcon
          sx={{
            fontSize: 32,
            color: "primary.main",
            transform: "rotate(-10deg)",
          }}
        />
        <Box sx={{ flexGrow: 1, textAlign: "center" }}>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              background: "linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.2,
            }}
          >
            Finny
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontSize: "0.65rem",
              letterSpacing: "0.5px",
              display: "block",
              marginTop: "-2px",
            }}
          >
            Know your worth
          </Typography>
        </Box>
        <IconButton
          onClick={handleDesktopDrawerToggle}
          sx={{ display: { xs: "none", md: "block" } }}
        >
          <ChevronLeftIcon />
        </IconButton>
      </Toolbar>
      <List>
        {menuItems.map((item, idx) =>
          item.type === "divider" ? (
            <Divider key={`divider-${idx}`} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          )
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: {
            md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : "100%",
          },
          ml: { md: desktopOpen ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={isMobile ? handleDrawerToggle : handleDesktopDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            color="inherit"
            onClick={handleProfileClick}
            sx={{ textTransform: "none" }}
            startIcon={<AccountCircleIcon />}
          >
            {user?.username}
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
          >
            <MenuItem onClick={handleProfileMenuClick}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleChangePasswordClick}>
              <ListItemIcon>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Change Password</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleSendPortfolioEmail}>
              <ListItemIcon>
                <EmailIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Send Portfolio Email</ListItemText>
            </MenuItem>
          </Menu>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            aria-label="logout"
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{
          width: { md: desktopOpen ? drawerWidth : 0 },
          flexShrink: { md: 0 },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="persistent"
          open={desktopOpen}
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            md: desktopOpen ? `calc(100% - ${drawerWidth}px)` : "100%",
          },
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
