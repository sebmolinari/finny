import React, { useState } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const ChangePassword = () => {
  const navigate = useNavigate();
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

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

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Change Password
      </Typography>
      <Paper sx={{ p: 4, mt: 3 }}>
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
                type="password"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                required
                disabled={loading}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                required
                disabled={loading}
                helperText="At least 8 characters with uppercase, lowercase, and a number"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                required
                disabled={loading}
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
                  {loading ? "Changing Password..." : "Change Password"}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/profile")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChangePassword;
