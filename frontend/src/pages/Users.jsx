import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Button,
  Switch,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Chip,
} from "@mui/material";
import { userAPI } from "../api/api";
import { handleApiError } from "../utils/errorHandler";
import { useAuth } from "../auth/AuthContext";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageContainer from "../components/layout/PageContainer";
import ConfirmPhraseDialog from "../components/dialogs/ConfirmPhraseDialog";

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    userId: null,
    username: "",
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      setUsers(response.data.users);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

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
    return <LoadingSpinner />;
  }

  const columns = [
    {
      field: "username",
      headerName: "Username",
      headerAlign: "center",
      width: 200,
      renderCell: (params) => (
        <>
          <span>{params.value}</span>
          {params.row.id === currentUser?.id && (
            <Chip label="You" size="small" sx={{ ml: 1 }} />
          )}
        </>
      ),
    },
    { field: "email", headerName: "Email", headerAlign: "center", flex: 1 },
    {
      field: "role",
      headerName: "Role",
      headerAlign: "center",
      align: "center",
      width: 200,
      renderCell: (params) => (
        <FormControl size="small" disabled={params.row.id === currentUser?.id}>
          <Select
            value={params.value}
            onChange={(e) => handleRoleChange(params.row.id, e.target.value)}
            size="small"
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </Select>
        </FormControl>
      ),
    },
    {
      field: "active",
      headerName: "Status",
      headerAlign: "center",
      align: "center",
      width: 100,
      type: "number",
      sortable: false,
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
      headerAlign: "center",
      align: "center",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          color="error"
          size="small"
          onClick={() => handleDeleteClick(params.row.id, params.row.username)}
          disabled={params.row.id === currentUser?.id}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <Box>
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

        <StyledDataGrid
          rows={users}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
        />
      </Box>

      <ConfirmPhraseDialog
        open={deleteDialog.open}
        title="Delete User"
        phrase={deleteDialog.username}
        description={`This will permanently delete user "${deleteDialog.username}" and all their data. Type the username to confirm.`}
        onConfirm={handleDeleteConfirm}
        onClose={handleDeleteCancel}
      />
    </PageContainer>
  );
};

export default Users;
