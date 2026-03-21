import { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Switch,
  Box,
  Pagination,
  Typography,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { schedulerAPI } from "../api/api";
import { handleApiError } from "../utils/errorHandler";
import SchedulerHistory from "./SchedulerHistory";

const SchedulerList = ({
  schedulers,
  pagination,
  onEdit,
  onDelete,
  onPageChange,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedScheduler, setSelectedScheduler] = useState(null);

  const handleToggleEnabled = async (scheduler) => {
    try {
      await schedulerAPI.update(scheduler.id, {
        ...scheduler,
        enabled: scheduler.enabled ? 0 : 1,
        type: scheduler.type,
        frequency: scheduler.frequency,
        time_of_day: scheduler.time_of_day,
      });
      // Refresh the list
      onPageChange(pagination.limit, pagination.offset);
    } catch (err) {
      handleApiError(err, "Failed to toggle scheduler");
    }
  };

  const handleViewHistory = (scheduler) => {
    setSelectedScheduler(scheduler);
    setHistoryOpen(true);
  };

  const getTypeLabel = (type) => {
    const labels = {
      send_report: "Send Report",
      asset_refresh: "Asset Refresh",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      send_report: "primary",
      asset_refresh: "success",
    };
    return colors[type] || "default";
  };

  if (schedulers.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography color="text.secondary">
          No schedulers configured yet. Create one to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "background.paper" }}>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Time</TableCell>
              <TableCell align="center">Enabled</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedulers.map((scheduler) => (
              <TableRow key={scheduler.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{scheduler.name}</TableCell>
                <TableCell>
                  <Chip
                    label={getTypeLabel(scheduler.type)}
                    color={getTypeColor(scheduler.type)}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ textTransform: "capitalize" }}>
                  {scheduler.frequency}
                </TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>
                  {scheduler.time_of_day}
                </TableCell>
                <TableCell align="center">
                  <Switch
                    checked={scheduler.enabled === 1}
                    onChange={() => handleToggleEnabled(scheduler)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View history">
                    <IconButton
                      size="small"
                      onClick={() => handleViewHistory(scheduler)}
                      color="info"
                    >
                      <HistoryRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(scheduler)}
                      color="primary"
                    >
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(scheduler.id)}
                      color="error"
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination.total > pagination.limit && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={Math.ceil(pagination.total / pagination.limit)}
            onChange={(_e, page) =>
              onPageChange(pagination.limit, (page - 1) * pagination.limit)
            }
          />
        </Box>
      )}

      {selectedScheduler && (
        <SchedulerHistory
          scheduler={selectedScheduler}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </>
  );
};

export default SchedulerList;
