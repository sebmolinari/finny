import {
  Paper,
  Typography,
  Chip,
  Box,
  Avatar,
  Divider,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PageContainer from "../components/layout/PageContainer";
import { useAuth } from "../auth/AuthContext";
import { fadeInUpSx } from "../utils/animations";

const ProfileField = ({ label, children }) => (
  <Box>
    <Typography
      variant="overline"
      sx={{
        fontSize: "0.7rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "text.disabled",
        display: "block",
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = (user.username || "U")
    .split(/[\s_-]/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <PageContainer
      title="Profile"
      subtitle="Your account information"
      maxWidth="sm"
    >
      <Paper sx={{ p: 4, ...fadeInUpSx(1) }}>
        {/* Avatar + name header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 4 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              fontSize: "1.6rem",
              fontWeight: 700,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initials}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
              {user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {user.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Fields */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <ProfileField label="Username">
            <Typography variant="body1" fontWeight={500}>
              {user.username}
            </Typography>
          </ProfileField>

          <ProfileField label="Email Address">
            <Typography variant="body1" fontWeight={500}>
              {user.email}
            </Typography>
          </ProfileField>

          <ProfileField label="Role">
            <Chip
              label={user.role?.toUpperCase()}
              color={user.role === "admin" ? "primary" : "default"}
              size="small"
              sx={{ fontWeight: 700, letterSpacing: "0.04em" }}
            />
          </ProfileField>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Actions */}
        <Box sx={{ display: "flex" }}>
          <Button
            variant="outlined"
            startIcon={<LockOutlinedIcon />}
            onClick={() => navigate("/change-password")}
          >
            Change Password
          </Button>
        </Box>
      </Paper>
    </PageContainer>
  );
};

export default Profile;
