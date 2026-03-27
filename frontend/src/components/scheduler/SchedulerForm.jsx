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

const SchedulerForm = ({ scheduler, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "asset_refresh",
    frequency: "daily",
    time_of_day: "18:30",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (scheduler) {
      setFormData({
        name: scheduler.name,
        type: scheduler.type,
        frequency: scheduler.frequency,
        time_of_day: scheduler.time_of_day,
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
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
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

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
