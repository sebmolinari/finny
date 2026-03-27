import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../api/api";
import PageContainer from "../components/layout/PageContainer";
import { fadeInUpSx } from "../utils/animations";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
    // Clear message when user starts typing
    if (message.text) {
      setMessage({ type: "", text: "" });
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({
        type: "error",
        text: "New passwords do not match",
      });
      return;
    }

    // Validate password requirements
    const passwordRegex = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (
      passwordData.newPassword.length < 8 ||
      !passwordRegex.test(passwordData.newPassword)
    ) {
      setMessage({
        type: "error",
        text: "New password must be at least 8 characters and contain uppercase, lowercase, and a number",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setMessage({
        type: "success",
        text: response.data.message || "Password changed successfully",
      });

      // Clear form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/profile");
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to change password",
      });
    } finally {
      setLoading(false);
    }
  };

  const showHideAdornment = (visible, toggle) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton onClick={toggle} edge="end" size="small" tabIndex={-1}>
          {visible ? (
            <VisibilityOffOutlinedIcon fontSize="small" />
          ) : (
            <VisibilityOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </InputAdornment>
    ),
  });

  return (
    <PageContainer
      title="Change Password"
      subtitle="Update your account password"
      maxWidth="sm"
    >
      <Paper sx={{ p: 4, ...fadeInUpSx(1) }}>
        {/* Lock icon header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <LockOutlinedIcon sx={{ color: "#fff", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              Security Update
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Choose a strong password with uppercase, lowercase, and number
            </Typography>
          </Box>
        </Box>

        <Box component="form" onSubmit={handlePasswordSubmit}>
          {message.text && (
            <Alert severity={message.type} sx={{ mb: 3 }}>
              {message.text}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                disabled={loading}
                InputProps={showHideAdornment(showCurrent, () =>
                  setShowCurrent((v) => !v),
                )}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type={showNew ? "text" : "password"}
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                disabled={loading}
                helperText="At least 8 characters with uppercase, lowercase, and a number"
                InputProps={showHideAdornment(showNew, () =>
                  setShowNew((v) => !v),
                )}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                disabled={loading}
                InputProps={showHideAdornment(showConfirm, () =>
                  setShowConfirm((v) => !v),
                )}
              />
            </Grid>
            <Grid size={12}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? "Saving…" : "Change Password"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/profile")}
                  disabled={loading}
                >
                  Back to Profile
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </PageContainer>
  );
};

export default ChangePassword;
