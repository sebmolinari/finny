import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Collapse,
  Button,
  Container,
} from "@mui/material";
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import api from "../api/api";
import { StyledTable, StyledHeaderCell } from "../components/StyledTable";
import { settingsAPI } from "../api/api";
import { formatDatetimeInTimezone } from "../utils/dateUtils";
import LoadingSpinner from "../components/LoadingSpinner";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [filters, setFilters] = useState({
    action_type: "",
    table_name: "",
    start_date: "",
    end_date: "",
    success: "",
    limit: 100,
  });

  const actionTypes = [
    "login",
    "logout",
    "login_failed",
    "create",
    "update",
    "delete",
    "export",
    "import",
    "settings_change",
  ];

  const tableNames = [
    "users",
    "assets",
    "brokers",
    "transactions",
    "price_data",
    "user_settings",
  ];

  const fetchLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const params = {};
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params[key] = filters[key];
      });

      const response = await api.get("/audit", { params });
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch audit logs"
      );
    } finally {
      setLoadingAudit(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      action_type: "",
      table_name: "",
      start_date: "",
      end_date: "",
      success: "",
      limit: 100,
    });
  };

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

  const [userTimezone, setUserTimezone] = useState();
  const [userDateFormat, setUserDateFormat] = useState();

  useEffect(() => {
    async function loadUserSettings() {
      setLoadingSettings(true);
      const response = await settingsAPI.get();
      setUserTimezone(response.data.timezone);
      setUserDateFormat(response.data.date_format);
      setLoadingSettings(false);
    }
    loadUserSettings();
  }, []);

  const formatDate = (dateString) => {
    return formatDatetimeInTimezone(dateString, userDateFormat, userTimezone);
  };

  if (loadingAudit || loadingSettings) {
    return <LoadingSpinner />;
  }

  const ExpandableRow = ({ log }) => {
    const [open, setOpen] = useState(false);

    return (
      <>
        <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
          <TableCell>
            <IconButton size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell>{log.id}</TableCell>
          <TableCell>{formatDate(log.created_at)}</TableCell>
          <TableCell>{log.username || "N/A"}</TableCell>
          <TableCell>
            <Chip
              label={log.action_type}
              color={getActionColor(log.action_type)}
              size="small"
            />
          </TableCell>
          <TableCell>{log.table_name || "N/A"}</TableCell>
          <TableCell>{log.record_id || "N/A"}</TableCell>
          <TableCell>
            <Chip
              label={log.success ? "Success" : "Failed"}
              color={log.success ? "success" : "error"}
              size="small"
              variant="outlined"
            />
          </TableCell>
          <TableCell>{log.ip_address || "N/A"}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 2 }}>
                <Typography variant="h6" gutterBottom component="div">
                  Details
                </Typography>
                <Grid container spacing={2}>
                  {log.user_agent && (
                    <Grid item xs={12}>
                      <Typography variant="body2">
                        <strong>User Agent:</strong> {log.user_agent}
                      </Typography>
                    </Grid>
                  )}
                  {log.error_message && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="error">
                        <strong>Error:</strong> {log.error_message}
                      </Typography>
                    </Grid>
                  )}
                  {log.old_values && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        <strong>Old Values:</strong>
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{ p: 1, mt: 1, maxHeight: 200, overflow: "auto" }}
                      >
                        <pre style={{ margin: 0, fontSize: "0.75rem" }}>
                          {JSON.stringify(log.old_values, null, 2)}
                        </pre>
                      </Paper>
                    </Grid>
                  )}
                  {log.new_values && (
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2">
                        <strong>New Values:</strong>
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{ p: 1, mt: 1, maxHeight: 200, overflow: "auto" }}
                      >
                        <pre style={{ margin: 0, fontSize: "0.75rem" }}>
                          {JSON.stringify(log.new_values, null, 2)}
                        </pre>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Audit Logs</Typography>
        <IconButton onClick={fetchLogs} color="primary">
          <RefreshIcon />
        </IconButton>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Action Type"
              value={filters.action_type}
              onChange={(e) =>
                handleFilterChange("action_type", e.target.value)
              }
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              {actionTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Table"
              value={filters.table_name}
              onChange={(e) => handleFilterChange("table_name", e.target.value)}
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              {tableNames.map((table) => (
                <MenuItem key={table} value={table}>
                  {table}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filters.success}
              onChange={(e) => handleFilterChange("success", e.target.value)}
              size="small"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Success</MenuItem>
              <MenuItem value="false">Failed</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              fullWidth
              label="Start Date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange("start_date", e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              type="date"
              fullWidth
              label="End Date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange("end_date", e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              type="number"
              fullWidth
              label="Limit"
              value={filters.limit}
              onChange={(e) => handleFilterChange("limit", e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              onClick={handleApplyFilters}
              fullWidth
              sx={{ height: "40px" }}
            >
              Apply Filters
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              onClick={handleClearFilters}
              fullWidth
              sx={{ height: "40px" }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <StyledTable>
          <TableHead>
            <TableRow>
              <StyledHeaderCell sx={{ width: 50 }} />
              <StyledHeaderCell sx={{ width: 60 }}>ID</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 150 }}>Timestamp</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 120 }}>User</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 100 }}>Action</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 100 }}>Table</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 90 }}>Record ID</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 100 }}>Status</StyledHeaderCell>
              <StyledHeaderCell sx={{ width: 120 }}>
                IP Address
              </StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingAudit && loadingSettings ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => <ExpandableRow key={log.id} log={log} />)
            )}
          </TableBody>
        </StyledTable>
      </TableContainer>
    </Container>
  );
};

export default AuditLogs;
