import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
  TablePagination,
} from "@mui/material";
import { userAPI } from "../api/api";
import { handleApiError } from "../utils/errorHandler";
import { useAuth } from "../context/AuthContext";
import { StyledTable, StyledHeaderCell } from "../components/StyledTable";
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

  const handlePageChange = (event, newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    setPagination((prev) => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0,
    }));
  };

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

        <TableContainer component={Paper}>
          <StyledTable>
            <TableHead>
              <TableRow>
                <StyledHeaderCell sx={{ width: 60 }}>ID</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 150 }}>
                  Username
                </StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 200 }}>Email</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 120 }}>Role</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 120 }}>Status</StyledHeaderCell>
                <StyledHeaderCell align="center" sx={{ width: 100 }}>
                  Actions
                </StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell>
                    {user.username}
                    {user.id === currentUser?.id && (
                      <Chip label="You" size="small" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <FormControl
                      size="small"
                      disabled={user.id === currentUser?.id}
                    >
                      <Select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="superuser">Superuser</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.active === 1}
                      onChange={() =>
                        handleStatusToggle(user.id, user.active === 1)
                      }
                      disabled={user.id === currentUser?.id}
                      color={user.active === 1 ? "success" : "default"}
                    />
                    {user.active === 1 ? "Active" : "Disabled"}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(user.id, user.username)}
                      disabled={user.id === currentUser?.id}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StyledTable>
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page}
            onPageChange={handlePageChange}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TableContainer>
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
