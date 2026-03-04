import { useState, useEffect, useCallback } from "react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Badge from "@mui/material/Badge";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ColorModeIconDropdown from "./ColorModeIconDropdown";
import NavbarBreadcrumbs from "./NavbarBreadcrumbs";
import MenuButton from "./MenuButton";
import Today from "./Today";
import { notificationsAPI, analyticsAPI, settingsAPI } from "../api/api";

export default function Header({ onOpenMobileNav }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // null = not yet loaded; defers interval setup until settings are known
  const [pollingEnabled, setPollingEnabled] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    settingsAPI
      .get()
      .then((res) => {
        const s = res.data;
        setPollingEnabled(s.notification_polling_enabled !== 0);
        setPollingInterval((s.notification_polling_interval || 60) * 1000);
      })
      .catch(() => {
        // fall back to defaults on error
        setPollingEnabled(true);
        setPollingInterval(60000);
      });
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (_) {
      // silently fail — header should not block on errors
    }
  }, []);

  // Poll cycle: ping drift-alerts (which creates new notifications if needed) then refresh the list.
  // Only called from the polling interval (and the initial tick when polling is enabled).
  const pollCycle = useCallback(async () => {
    analyticsAPI.getDriftAlerts().catch(() => {});
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (pollingEnabled === null) return; // wait for settings to load
    if (pollingEnabled) {
      pollCycle(); // initial tick with drift check
      const interval = setInterval(pollCycle, pollingInterval);
      return () => clearInterval(interval);
    } else {
      // Polling disabled: load existing notifications once, but do NOT ping drift-alerts
      fetchNotifications();
    }
  }, [pollCycle, fetchNotifications, pollingEnabled, pollingInterval]);

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    fetchNotifications();
  };
  const handleClose = () => setAnchorEl(null);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch (_) {}
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const open = Boolean(anchorEl);

  return (
    <Stack
      direction="row"
      sx={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: { sm: "100%", md: "1700px" },
        px: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Hamburger — mobile only */}
      {onOpenMobileNav && (
        <IconButton
          onClick={onOpenMobileNav}
          sx={{ display: { xs: "flex", md: "none" }, mr: 0.5 }}
          aria-label="Open navigation"
        >
          <MenuRoundedIcon />
        </IconButton>
      )}
      <NavbarBreadcrumbs />
      <Stack direction="row" sx={{ gap: 0.5, alignItems: "center" }}>
        <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center" }}>
          <Today />
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 0.5 }} />

        <MenuButton aria-label="Open notifications" onClick={handleOpen}>
          <Badge badgeContent={unreadCount || null} color="error" max={99}>
            <NotificationsRoundedIcon fontSize="small" />
          </Badge>
        </MenuButton>

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{ sx: { width: 360, maxHeight: 480 } }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Notifications
              {unreadCount > 0 && (
                <Chip
                  label={unreadCount}
                  size="small"
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            )}
          </Box>

          {notifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List
              dense
              disablePadding
              sx={{ overflow: "auto", maxHeight: 400 }}
            >
              {notifications.map((n) => (
                <ListItem
                  key={n.id}
                  alignItems="flex-start"
                  sx={{
                    bgcolor: n.is_read ? "transparent" : "action.hover",
                    borderBottom: 1,
                    borderColor: "divider",
                    cursor: n.is_read ? "default" : "pointer",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={n.is_read ? 400 : 600}
                      >
                        {n.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        {n.message && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {n.message}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled">
                          {new Date(n.created_at).toLocaleString()}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Popover>

        <ColorModeIconDropdown />
      </Stack>
    </Stack>
  );
}
