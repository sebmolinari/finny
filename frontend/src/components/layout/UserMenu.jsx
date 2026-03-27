import { styled } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import MuiDrawer, { drawerClasses } from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import MenuContent from "./MenuContent";
import UserOptionsMenu from "./UserOptionsMenu";
import { useAuth } from "../../auth/AuthContext";
import ShowChartIcon from "@mui/icons-material/ShowChart";

const drawerWidth = 248;

const Drawer = styled(MuiDrawer)({
  width: drawerWidth,
  flexShrink: 0,
  boxSizing: "border-box",
  mt: 10,
  [`& .${drawerClasses.paper}`]: {
    width: drawerWidth,
    boxSizing: "border-box",
  },
});

export default function UserMenu() {
  const { user } = useAuth();

  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        [`& .${drawerClasses.paper}`]: {
          backgroundColor: "background.paper",
        },
      }}
    >
      {/* ── App Branding ── */}
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

      <Box
        sx={{
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <MenuContent />
      </Box>

      {/* ── User Footer ── */}
      <Divider />
      <Stack
        direction="row"
        sx={{
          p: 2,
          gap: 1,
          alignItems: "center",
        }}
      >
        <Avatar
          sizes="small"
          alt={user.username}
          src="/static/images/avatar/7.jpg"
          sx={{
            width: 34,
            height: 34,
            fontSize: 13,
            fontWeight: 700,
            bgcolor: "primary.main",
          }}
        >
          {user.username?.[0]?.toUpperCase()}
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
            {user.username}
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
            {user.email}
          </Typography>
        </Box>
        <UserOptionsMenu />
      </Stack>
    </Drawer>
  );
}
