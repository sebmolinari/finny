import React, { useState, useEffect, useCallback } from "react";
import { Typography, Paper, Chip, Grid, Button, Tooltip, Alert } from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import api from "../api/api";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import { ToolbarButton } from "@mui/x-data-grid";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { formatDatetimeInTimezone } from "../utils/dateUtils";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageContainer from "../components/layout/PageContainer";
import { useUserSettings } from "../hooks/useUserSettings";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [error, setError] = useState(null);
  const { timezone: userTimezone, dateFormat: userDateFormat, settingsLoading } = useUserSettings();

  const [selectedLog, setSelectedLog] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      setError(null);
      const params = {};

      const response = await api.get("/audit", { params });
      setLogs(response.data);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      setError(err.response?.data?.message || "Failed to fetch audit logs. Please try again.");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (actionType) => {
    switch (actionType) {
      case "login":
        return "success";
      case "logout":
        return "default";
      case "login_failed":
        return "error";
      case "create":
        return "info";
      case "update":
        return "warning";
      case "delete":
        return "error";
      default:
        return "default";
    }
  };

  const formatDate = (dateString) => {
    return formatDatetimeInTimezone(dateString, userDateFormat, userTimezone);
  };

  if (loadingAudit || settingsLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" action={<Button onClick={fetchLogs}>Retry</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  const openDetails = (log) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedLog(null);
    setDetailsOpen(false);
  };

  const columns = [
    {
      field: "created_at",
      headerName: "Timestamp",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => formatDate(params.value),
    },
    { field: "username", headerName: "User", headerAlign: "center", flex: 1 },
    {
      field: "action_type",
      headerName: "Action",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getActionColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "table_name",
      headerName: "Table",
      headerAlign: "center",
      flex: 1,
    },
    {
      field: "record_id",
      headerName: "Record ID",
      headerAlign: "center",
      flex: 1,
    },
    {
      field: "success",
      headerName: "Status",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => (
        <Chip
          label={params.value ? "Success" : "Failed"}
          color={params.value ? "success" : "error"}
          size="small"
          variant="outlined"
        />
      ),
    },
    { field: "ip_address", headerName: "IP", headerAlign: "center", flex: 1 },
    {
      field: "details",
      headerName: "Details",
      headerAlign: "center",
      flex: 1,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button size="small" onClick={() => openDetails(params.row)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <StyledDataGrid
        rows={logs}
        columns={columns}
        loading={loadingAudit}
        getRowId={(row) => row.id}
        pageSize={100}
        rowsPerPageOptions={[25, 50, 100]}
        slotProps={{
          toolbar: {
            actions: (
              <Tooltip title="Refresh">
                <ToolbarButton color="primary" onClick={() => fetchLogs()}>
                  <RefreshIcon fontSize="small" />
                </ToolbarButton>
              </Tooltip>
            ),
          },
        }}
      />
      <Dialog open={detailsOpen} onClose={closeDetails} maxWidth="md" fullWidth>
        <DialogTitle>Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Grid container spacing={2}>
              {selectedLog.user_agent && (
                <Grid size={12}>
                  <Typography variant="body2">
                    <strong>User Agent:</strong> {selectedLog.user_agent}
                  </Typography>
                </Grid>
              )}
              {selectedLog.error_message && (
                <Grid size={12}>
                  <Typography variant="body2" color="error">
                    <strong>Error:</strong> {selectedLog.error_message}
                  </Typography>
                </Grid>
              )}
              {selectedLog.old_values && (
                <Grid
                  size={{
                    xs: 12,
                    md: 6,
                  }}
                >
                  <Typography variant="body2">
                    <strong>Old Values:</strong>
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 1, mt: 1, maxHeight: 200, overflow: "auto" }}
                  >
                    <pre style={{ margin: 0, fontSize: "0.75rem" }}>
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
              {selectedLog.new_values && (
                <Grid
                  size={{
                    xs: 12,
                    md: 6,
                  }}
                >
                  <Typography variant="body2">
                    <strong>New Values:</strong>
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 1, mt: 1, maxHeight: 200, overflow: "auto" }}
                  >
                    <pre style={{ margin: 0, fontSize: "0.75rem" }}>
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={closeDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AuditLogs;
