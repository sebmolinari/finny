import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControlLabel,
  Switch,
} from "@mui/material";
import StyledDataGrid from "../components/StyledDataGrid";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { brokerAPI, settingsAPI } from "../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import { useAuth } from "../context/AuthContext";
import AuditFieldsDisplay from "../components/AuditFieldsDisplay";

export default function Brokers() {
  const { user } = useAuth();
  const [brokers, setBrokers] = useState([]);
  const [showInactiveBrokers, setShowInactiveBrokers] = useState(false);
  const [userTimezone, setUserTimezone] = useState(null);
  const [userDateFormat, setUserDateFormat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBroker, setEditingBroker] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    active: true,
  });

  const loadBrokers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await brokerAPI.getAll({
        includeInactive: showInactiveBrokers,
      });
      setBrokers(response.data);
    } catch (error) {
      console.error("Error loading brokers:", error);
      toast.error("Failed to load brokers");
    } finally {
      setLoading(false);
    }
  }, [showInactiveBrokers]);

  useEffect(() => {
    loadBrokers();
    if (user?.id) {
      loadUserSettings();
    }
  }, [user, showInactiveBrokers, loadBrokers]);

  const loadUserSettings = async () => {
    const response = await settingsAPI.get();
    setUserTimezone(response.data.timezone);
    setUserDateFormat(response.data.date_format);
  };

  const handleOpenDialog = (broker = null) => {
    if (broker) {
      setEditingBroker(broker);
      setFormData({
        name: broker.name,
        description: broker.description || "",
        website: broker.website || "",
        active: broker.active !== 0,
      });
    } else {
      setEditingBroker(null);
      setFormData({
        name: "",
        description: "",
        website: "",
        active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBroker(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingBroker) {
        await brokerAPI.update(editingBroker.id, formData);
        toast.success("Broker updated successfully");
      } else {
        await brokerAPI.create(formData);
        toast.success("Broker created successfully");
      }
      handleCloseDialog();
      loadBrokers();
    } catch (error) {
      handleApiError(error, "Failed to save broker");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this broker?")) {
      try {
        await brokerAPI.delete(id);
        toast.success("Broker deleted successfully");
        loadBrokers();
      } catch (error) {
        handleApiError(error, "Failed to delete broker");
      }
    }
  };

  const handleToggleActive = async (broker) => {
    try {
      await brokerAPI.update(broker.id, {
        ...broker,
        active: !broker.active,
      });
      toast.success(
        `Broker ${broker.active ? "deactivated" : "activated"} successfully`,
      );
      loadBrokers();
    } catch (error) {
      handleApiError(error, "Failed to update broker status");
    }
  };

  const columns = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <strong title={params.value}>{params.value}</strong>
      ),
    },
    {
      field: "website",
      headerName: "Website",
      flex: 1,
      minWidth: 200,
      renderCell: (params) =>
        params.value ? (
          <a href={params.value} target="_blank" rel="noopener noreferrer">
            {params.value}
          </a>
        ) : (
          "—"
        ),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      minWidth: 250,
      renderCell: (params) => (
        <div
          title={params.value || ""}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
        >
          {params.value || "—"}
        </div>
      ),
    },
    {
      field: "active",
      headerName: "Active",
      flex: 100,
      sortable: false,
      renderCell: (params) => (
        <Switch
          checked={!!params.value}
          onChange={() => handleToggleActive(params.row)}
          color={params.value ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog(params.row)}
            color="primary"
            title="Edit"
            sx={{ padding: "4px" }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            color="error"
            title="Delete"
            sx={{ padding: "4px" }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h4">Brokers</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={showInactiveBrokers}
                onChange={(e) => setShowInactiveBrokers(e.target.checked)}
                color="primary"
              />
            }
            label="Show Inactive"
            sx={{ ml: 2 }}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Broker
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <StyledDataGrid
          rows={brokers}
          columns={columns}
          getRowId={(row) => row.id}
          disableSelectionOnClick
          pageSize={25}
          rowsPerPageOptions={[10, 25, 50]}
          autoHeight
        />
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingBroker ? "Edit Broker" : "Add Broker"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="broker-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
          >
            <TextField
              label="Broker Name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
              required
              placeholder="e.g., Interactive Brokers, Fidelity, Questrade"
            />
            <TextField
              label="Website"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
              fullWidth
              placeholder="https://example.com"
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              fullWidth
              multiline
              rows={3}
              placeholder="Notes about this broker..."
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  color="success"
                />
              }
              label="Active"
            />
            {editingBroker && (
              <AuditFieldsDisplay
                item={editingBroker}
                userTimezone={userTimezone}
                userDateFormat={userDateFormat}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button type="submit" variant="contained" form="broker-form">
            {editingBroker ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
