import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TablePagination,
  Typography,
  Box,
  Tooltip,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { schedulerAPI } from "../api/api";
import { handleApiError } from "../utils/errorHandler";
import LoadingSpinner from "./LoadingSpinner";

const SchedulerHistory = ({ scheduler, open, onClose }) => {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0 });

  useEffect(() => {
    if (open && scheduler) {
      fetchHistory(0);
    }
  }, [open, scheduler]);

  const fetchHistory = async (offset) => {
    try {
      setLoading(true);
      const response = await schedulerAPI.getInstances(scheduler.id, 10, offset);
      setInstances(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      handleApiError(err, "Failed to fetch execution history");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event, newPage) => {
    fetchHistory(newPage * pagination.limit);
  };

  const getStatusColor = (status) => {
    const colors = {
      success: "success",
      failed: "error",
      pending: "warning",
    };
    return colors[status] || "default";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Execution History: {scheduler?.name}
      </DialogTitle>
      <DialogContent sx={{ minHeight: "400px" }}>
        {loading ? (
          <LoadingSpinner />
        ) : instances.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              No execution history available yet
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "background.paper" }}>
                  <TableCell>Scheduled At</TableCell>
                  <TableCell>Executed At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Attempt</TableCell>
                  <TableCell>Error Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id} hover>
                    <TableCell sx={{ fontSize: "0.875rem" }}>
                      {formatDate(instance.scheduled_run_at)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.875rem" }}>
                      {instance.executed_at
                        ? formatDate(instance.executed_at)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={instance.status}
                        color={getStatusColor(instance.status)}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">{instance.attempt}</TableCell>
                    <TableCell>
                      {instance.error_message ? (
                        <Tooltip title={instance.error_message}>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              maxWidth: "300px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "error.main",
                            }}
                          >
                            {instance.error_message}
                          </Typography>
                        </Tooltip>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={pagination.total}
              page={Math.floor(pagination.offset / pagination.limit)}
              onPageChange={handleChangePage}
              rowsPerPage={pagination.limit}
              rowsPerPageOptions={[10]}
            />
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          startIcon={<CloseRoundedIcon />}
          onClick={onClose}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SchedulerHistory;
