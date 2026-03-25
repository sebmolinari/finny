import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import MenuContent from "./MenuContent";
import UserOptionsMenu from "./UserOptionsMenu";
import { useAuth } from "../../auth/AuthContext";

export default function MobileNavDrawer({ open, onOpen, onClose }) {
  const { user } = useAuth();

  return (
    <SwipeableDrawer
      anchor="left"
      open={open}
      onOpen={onOpen}
      onClose={onClose}
      disableBackdropTransition={false}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: {
          width: 260,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Branding */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
          }}
        >
          <ShowChartIcon sx={{ color: "#fff", fontSize: 18 }} />
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              color: "text.primary",
              letterSpacing: "-0.01em",
            }}
          >
            Finny
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", lineHeight: 1 }}
          >
            Portfolio Manager
          </Typography>
        </Box>
      </Box>

      <Divider />

      {/* Nav content */}
      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={onClose}
      >
        <MenuContent />
      </Box>

      {/* User footer */}
      <Divider />
      <Stack direction="row" sx={{ p: 2, gap: 1, alignItems: "center" }}>
        <Avatar
          sizes="small"
          alt={user?.username}
          sx={{
            width: 34,
            height: 34,
            fontSize: 13,
            fontWeight: 700,
            bgcolor: "primary.main",
          }}
        >
          {user?.username?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ mr: "auto", minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              lineHeight: "16px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.username}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
          >
            {user?.email}
          </Typography>
        </Box>
        <UserOptionsMenu />
      </Stack>
    </SwipeableDrawer>
  );
}
