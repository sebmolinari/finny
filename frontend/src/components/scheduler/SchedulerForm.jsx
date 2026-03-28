import { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Stack,
  Alert,
} from "@mui/material";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const SchedulerForm = ({ scheduler, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "asset_refresh",
    frequency: "daily",
    time_of_day: "18:30",
    metadata: {},
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (scheduler) {
      setFormData({
        name: scheduler.name,
        type: scheduler.type,
        frequency: scheduler.frequency,
        time_of_day: scheduler.time_of_day,
        metadata: scheduler.metadata ? JSON.parse(scheduler.metadata) : {},
      });
    }
  }, [scheduler]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Scheduler name is required";
    }

    if (!/^\d{2}:\d{2}$/.test(formData.time_of_day)) {
      newErrors.time_of_day = "Time must be in HH:MM format (e.g., 09:30)";
    }

    if (formData.frequency === "weekly") {
      const dow = formData.metadata?.day_of_week;
      if (dow === undefined || !Number.isInteger(dow) || dow < 0 || dow > 6) {
        newErrors.day_of_week = "Please select a day of the week";
      }
    }

    if (formData.frequency === "monthly") {
      const dom = formData.metadata?.day_of_month;
      if (dom === undefined || !Number.isInteger(dom) || dom < 1 || dom > 31) {
        newErrors.day_of_month = "Please select a day of the month";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "frequency") {
      setFormData((prev) => ({ ...prev, frequency: value, metadata: {} }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleMetadataChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit(formData);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {scheduler && (
            <Alert severity="info">Editing scheduler: {scheduler.name}</Alert>
          )}

          <TextField
            label="Scheduler Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={!!errors.name}
            helperText={errors.name}
            placeholder="e.g., Daily Portfolio Email"
            fullWidth
            required
          />

          <FormControl fullWidth required>
            <InputLabel>Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              label="Type"
              onChange={handleChange}
            >
              <MenuItem value="asset_refresh">Asset Refresh</MenuItem>
              <MenuItem value="send_report">Send Report</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel>Frequency</InputLabel>
            <Select
              name="frequency"
              value={formData.frequency}
              label="Frequency"
              onChange={handleChange}
            >
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekdays">Weekdays (Mon–Fri)</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          {formData.frequency === "weekly" && (
            <FormControl fullWidth required error={!!errors.day_of_week}>
              <InputLabel>Day of Week</InputLabel>
              <Select
                value={formData.metadata?.day_of_week ?? 1}
                label="Day of Week"
                onChange={(e) => handleMetadataChange("day_of_week", e.target.value)}
              >
                {DAY_OF_WEEK_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.day_of_week && (
                <Box sx={{ color: "error.main", fontSize: "0.75rem", mt: 0.5, ml: 1.75 }}>
                  {errors.day_of_week}
                </Box>
              )}
            </FormControl>
          )}

          {formData.frequency === "monthly" && (
            <FormControl fullWidth required error={!!errors.day_of_month}>
              <InputLabel>Day of Month</InputLabel>
              <Select
                value={formData.metadata?.day_of_month ?? 1}
                label="Day of Month"
                onChange={(e) => handleMetadataChange("day_of_month", e.target.value)}
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {i + 1}
                  </MenuItem>
                ))}
              </Select>
              {errors.day_of_month && (
                <Box sx={{ color: "error.main", fontSize: "0.75rem", mt: 0.5, ml: 1.75 }}>
                  {errors.day_of_month}
                </Box>
              )}
            </FormControl>
          )}

          <TextField
            label="Time (HH:MM)"
            name="time_of_day"
            value={formData.time_of_day}
            onChange={handleChange}
            error={!!errors.time_of_day}
            helperText={errors.time_of_day || "e.g., 18:00 (6:00 PM)"}
            placeholder="HH:MM"
            fullWidth
            required
          />

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              startIcon={<CancelRoundedIcon />}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              startIcon={<SaveRoundedIcon />}
            >
              {scheduler ? "Update Scheduler" : "Create Scheduler"}
            </Button>
          </Box>
        </Stack>
      </form>
    </Paper>
  );
};

export default SchedulerForm;
