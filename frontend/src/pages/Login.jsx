import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  ShowChart as ShowChartIcon,
  LockOutlined,
  PersonOutline,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(formData.username, formData.password);
      navigate("/");
    } catch (err) {
      const responseData = err.response?.data;
      setError(responseData?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* â”€â”€ Decorative background orbs â”€â”€ */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          "& .orb": {
            position: "absolute",
            borderRadius: "50%",
            filter: "blur(80px)",
          },
          "& .orb-1": {
            width: 500,
            height: 500,
            top: "-120px",
            left: "-120px",
            background: (t) =>
              t.palette.mode === "light"
                ? "rgba(37,99,235,0.12)"
                : "rgba(37,99,235,0.18)",
          },
          "& .orb-2": {
            width: 400,
            height: 400,
            bottom: "-80px",
            right: "-80px",
            background: (t) =>
              t.palette.mode === "light"
                ? "rgba(147,51,234,0.09)"
                : "rgba(147,51,234,0.14)",
          },
          "& .orb-3": {
            width: 250,
            height: 250,
            top: "40%",
            right: "10%",
            background: (t) =>
              t.palette.mode === "light"
                ? "rgba(22,163,74,0.07)"
                : "rgba(22,163,74,0.1)",
          },
        }}
      >
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </Box>

      {/* â”€â”€ Centered card â”€â”€ */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
          px: 2,
          py: 4,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 400,
            bgcolor: "background.paper",
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: (t) =>
              t.palette.mode === "light"
                ? "0 24px 56px -12px rgba(0,0,0,0.14)"
                : "0 24px 56px -12px rgba(0,0,0,0.5)",
            p: { xs: 3, sm: 4 },
            animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 3.5,
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1.5,
                boxShadow: "0 4px 16px rgba(37,99,235,0.4)",
                animation: "pulseGlow 3s ease-in-out infinite",
              }}
            >
              <ShowChartIcon sx={{ color: "#fff", fontSize: 26 }} />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "text.primary",
              }}
            >
              Finny
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "text.disabled", mt: 0.25 }}
            >
              Welcome back â€” sign in to your portfolio
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2.5, animation: "fadeIn 0.25s ease both" }}
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              required
              fullWidth
              label="Username"
              name="username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline
                      sx={{ color: "text.disabled", fontSize: 20 }}
                    />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              required
              fullWidth
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined
                      sx={{ color: "text.disabled", fontSize: 20 }}
                    />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 0.5, py: 1.25, fontSize: "0.9375rem" }}
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                "Sign In"
              )}
            </Button>

            <Typography
              variant="body2"
              align="center"
              sx={{ color: "text.secondary" }}
            >
              Don&apos;t have an account?{" "}
              <Box
                component="span"
                onClick={() => navigate("/register")}
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Sign Up
              </Box>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
