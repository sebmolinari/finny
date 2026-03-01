import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  useTheme,
} from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const theme = useTheme();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      await register(formData.username, formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      const responseData = err.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        setError(
          responseData.errors.map((e) => `${e.field}: ${e.message}`).join(", "),
        );
      } else {
        setError(
          responseData?.message || "Registration failed. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        position: "relative",
        overflow: "hidden",
        px: 2,
      }}
    >
      {/* Background orbs */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          "& .orb": {
            position: "absolute",
            borderRadius: "50%",
            filter: "blur(80px)",
          },
          "& .orb-1": {
            width: 520,
            height: 520,
            top: "-160px",
            right: "-100px",
            background: isDark
              ? "rgba(37,99,235,0.13)"
              : "rgba(37,99,235,0.09)",
          },
          "& .orb-2": {
            width: 400,
            height: 400,
            bottom: "-120px",
            left: "-80px",
            background: isDark
              ? "rgba(124,58,237,0.11)"
              : "rgba(124,58,237,0.07)",
          },
          "& .orb-3": {
            width: 260,
            height: 260,
            top: "50%",
            left: "42%",
            background: isDark
              ? "rgba(16,185,129,0.08)"
              : "rgba(16,185,129,0.05)",
          },
        }}
      >
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </Box>

      {/* Card */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          bgcolor: "background.paper",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.55)"
            : "0 24px 64px rgba(37,99,235,0.10)",
          p: { xs: 3, sm: 4 },
          animation: "fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Logo */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3 }}>
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
              boxShadow: "0 8px 24px rgba(37,99,235,0.35)",
              animation: "pulseGlow 3s ease-in-out infinite",
            }}
          >
            <ShowChartIcon sx={{ color: "#fff", fontSize: 26 }} />
          </Box>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em">
            Create account
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Start managing your portfolio today
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
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
            id="username"
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
                  <PersonOutlineIcon sx={{ fontSize: 20, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            required
            fullWidth
            id="email"
            label="Email address"
            name="email"
            autoComplete="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((p) => !p)}
                    edge="end"
                    size="small"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            required
            fullWidth
            name="confirmPassword"
            label="Confirm password"
            type={showConfirm ? "text" : "password"}
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirm((p) => !p)}
                    edge="end"
                    size="small"
                    tabIndex={-1}
                  >
                    {showConfirm ? (
                      <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.25, mt: 0.5, fontSize: "0.9375rem" }}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: "inherit" }} />
            ) : (
              "Create Account"
            )}
          </Button>

          <Box sx={{ textAlign: "center", pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary" component="span">
              Already have an account?{" "}
            </Typography>
            <Box
              component="span"
              onClick={() => !loading && navigate("/login")}
              sx={{
                color: "primary.main",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: loading ? "default" : "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              Sign In
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Register;
