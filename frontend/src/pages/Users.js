import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from "@mui/material";
import { userAPI } from "../api/api";
import { handleApiError } from "../utils/errorHandler";
import { useAuth } from "../context/AuthContext";
import StyledDataGrid from "../components/StyledDataGrid";
import LoadingSpinner from "../components/LoadingSpinner";

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    userId: null,
    username: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
      };
      const response = await userAPI.getAllUsers(params);
      setUsers(response.data.users);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await userAPI.updateUserStatus(userId, newStatus);
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, active: newStatus ? 1 : 0 } : u,
        ),
      );
      setSuccess(`User ${newStatus ? "enabled" : "disabled"} successfully`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      handleApiError(err, "Failed to update user status");
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userAPI.updateUserRole(userId, newRole);
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      setSuccess("User role updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      handleApiError(err, "Failed to update user role");
    }
  };

  const handleDeleteClick = (userId, username) => {
    setDeleteDialog({ open: true, userId, username });
  };

  const handleDeleteConfirm = async () => {
    try {
      await userAPI.deleteUser(deleteDialog.userId);
      setUsers(users.filter((u) => u.id !== deleteDialog.userId));
      setSuccess("User deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
      setTimeout(() => setError(""), 3000);
    } finally {
      setDeleteDialog({ open: false, userId: null, username: "" });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, userId: null, username: "" });
  };

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper>
          <StyledDataGrid
            rows={users}
            columns={[
              {
                field: "username",
                headerName: "Username",
                flex: 1,
                renderCell: (params) => (
                  <>
                    <span>{params.value}</span>
                    {params.row.id === currentUser?.id && (
                      <Chip label="You" size="small" sx={{ ml: 1 }} />
                    )}
                  </>
                ),
              },
              { field: "email", headerName: "Email", flex: 1 },
              {
                field: "role",
                headerName: "Role",
                flex: 1,
                renderCell: (params) => (
                  <FormControl
                    size="small"
                    disabled={params.row.id === currentUser?.id}
                  >
                    <Select
                      value={params.value}
                      onChange={(e) =>
                        handleRoleChange(params.row.id, e.target.value)
                      }
                      size="small"
                    >
                      <MenuItem value="user">User</MenuItem>
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="superuser">Superuser</MenuItem>
                    </Select>
                  </FormControl>
                ),
              },
              {
                field: "active",
                headerName: "Status",
                flex: 1,
                renderCell: (params) => (
                  <>
                    <Switch
                      checked={params.value === 1}
                      onChange={() =>
                        handleStatusToggle(params.row.id, params.value === 1)
                      }
                      disabled={params.row.id === currentUser?.id}
                      color={params.value === 1 ? "success" : "default"}
                      size="small"
                    />
                    {params.value === 1 ? "Active" : "Disabled"}
                  </>
                ),
              },
              {
                field: "actions",
                headerName: "Actions",
                flex: 1,
                sortable: false,
                filterable: false,
                renderCell: (params) => (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() =>
                      handleDeleteClick(params.row.id, params.row.username)
                    }
                    disabled={params.row.id === currentUser?.id}
                  >
                    Delete
                  </Button>
                ),
              },
            ]}
            getRowId={(row) => row.id}
            paginationMode="server"
            page={pagination.page}
            pageSize={pagination.limit}
            rowCount={pagination.total}
            onPageChange={(newPage) =>
              setPagination((p) => ({ ...p, page: newPage }))
            }
            onPageSizeChange={(newPageSize) =>
              setPagination((p) => ({ ...p, limit: newPageSize, page: 0 }))
            }
          />
        </Paper>
      </Box>

      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete user "{deleteDialog.username}"? This
            action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Users;
