import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  CircularProgress,
  Paper,
  Chip,
  Alert,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import {
  settingsAPI,
  brokerAPI,
  assetAPI,
  transactionAPI,
  allocationAPI,
  schedulerAPI,
} from "../api/api";
import { useAuth } from "../auth/AuthContext";

const STEPS = [
  {
    id: "settings",
    title: "Review your display settings",
    description:
      "Configure your date format and timezone to match your preferences.",
    path: "/settings",
    isComplete: (data) => !!data.settings?.settings_reviewed,
  },
  {
    id: "brokers",
    title: "Create your first broker",
    description:
      "Add the brokers or platforms where your investments are held.",
    path: "/brokers",
    isComplete: (data) => (data.brokers?.length ?? 0) > 0,
  },
  {
    id: "assets",
    title: "Add your assets",
    description:
      "Define the stocks, ETFs, crypto, or other instruments you invest in.",
    path: "/assets",
    isComplete: (data) =>
      (data.assets?.filter(
        (a) => !["USD", "USDARS_BNA", "USDARS_CCL"].includes(a.symbol),
      ).length ?? 0) > 0,
  },
  {
    id: "transactions",
    title: "Record your first transaction",
    description:
      "Log a buy, sell, or deposit to start tracking your portfolio.",
    path: "/blotter",
    isComplete: (data) => (data.transactions?.length ?? 0) > 0,
  },
  {
    id: "allocation",
    title: "Set asset allocation targets",
    description:
      "Define your target portfolio weights to enable rebalancing alerts.",
    path: "/asset-allocation",
    isComplete: (data) => (data.targets?.length ?? 0) > 0,
  },
];

export default function GettingStarted() {
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        settingsRes,
        brokersRes,
        assetsRes,
        transactionsRes,
        targetsRes,
        schedulersRes,
      ] = await Promise.allSettled([
        settingsAPI.get(),
        brokerAPI.getAll(),
        assetAPI.getAll(),
        transactionAPI.getAll(),
        allocationAPI.getTargets(),
        schedulerAPI.getAll(),
      ]);

      setData({
        settings:
          settingsRes.status === "fulfilled" ? settingsRes.value.data : null,
        brokers: brokersRes.status === "fulfilled" ? brokersRes.value.data : [],
        assets: assetsRes.status === "fulfilled" ? assetsRes.value.data : [],
        transactions:
          transactionsRes.status === "fulfilled"
            ? (transactionsRes.value.data?.data ?? transactionsRes.value.data)
            : [],
        targets:
          targetsRes.status === "fulfilled"
            ? (targetsRes.value.data?.targets ?? targetsRes.value.data)
            : [],
        schedulers:
          schedulersRes.status === "fulfilled"
            ? (schedulersRes.value.data?.data ?? [])
            : [],
      });
    } catch (err) {
      setError("Failed to load progress data.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError("");
    try {
      await settingsAPI.markOnboardingComplete();
      await refreshUser();
      navigate("/");
    } catch (err) {
      setError("Failed to save. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const steps = [
    ...STEPS,
    ...(isAdmin
      ? [
          {
            id: "schedulers",
            title: "Set up automated schedulers",
            description:
              "Schedule automatic price updates and portfolio email reports.",
            path: "/schedulers",
            isComplete: (data) => (data.schedulers?.length ?? 0) > 0,
          },
        ]
      : []),
  ];

  const completedCount = steps.filter((s) => s.isComplete(data)).length;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", py: 4, px: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Welcome to Finny
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete these steps to get your portfolio up and running.
        </Typography>
        <Chip
          label={`${completedCount} of ${steps.length} completed`}
          size="small"
          color={completedCount === steps.length ? "success" : "default"}
          sx={{ mt: 1.5 }}
        />
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <List disablePadding>
          {steps.map((step, index) => {
            const done = step.isComplete(data);
            return (
              <ListItem
                key={step.id}
                divider={index < steps.length - 1}
                sx={{ py: 2, px: 2.5, gap: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {done ? (
                    <CheckCircleRoundedIcon color="success" />
                  ) : (
                    <RadioButtonUncheckedRoundedIcon color="disabled" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body1"
                      fontWeight={500}
                      sx={{
                        textDecoration: done ? "line-through" : "none",
                        color: done ? "text.disabled" : "text.primary",
                      }}
                    >
                      {step.title}
                    </Typography>
                  }
                  secondary={step.description}
                />
                <Button
                  size="small"
                  variant={done ? "text" : "outlined"}
                  endIcon={done ? null : <ArrowForwardRoundedIcon />}
                  onClick={() => navigate(step.path)}
                  disabled={done}
                  sx={{ flexShrink: 0 }}
                >
                  {done ? "Done" : "Go"}
                </Button>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {isAdmin && (
        <Alert
          severity="info"
          sx={{ mt: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate("/admin/overview")}>
              Go
            </Button>
          }
        >
          <strong>Just exploring?</strong> As an admin you can load sample brokers, assets, prices, and transactions from <strong>Admin Overview → Demo Data</strong> to see Finny in action without entering real data. You can delete it all just as easily when you're ready.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          onClick={handleComplete}
          disabled={completing}
          startIcon={
            completing ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {completing ? "Saving…" : "I'm all set"}
        </Button>
      </Box>
    </Box>
  );
}
