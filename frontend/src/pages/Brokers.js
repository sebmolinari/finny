import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControlLabel,
  Switch,
  Tooltip,
} from "@mui/material";
import StyledDataGrid from "../components/StyledDataGrid";
import { ToolbarButton } from "@mui/x-data-grid";
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
        includeInactive: true,
      });
      setBrokers(response.data);
    } catch (error) {
      console.error("Error loading brokers:", error);
      toast.error("Failed to load brokers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrokers();
    if (user?.id) {
      loadUserSettings();
    }
  }, [user, loadBrokers]);

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
      headerAlign: "center",
      flex: 1,
      minWidth: 150,
    },
    {
      field: "website",
      headerName: "Website",
      headerAlign: "center",
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
      headerAlign: "center",
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
      headerAlign: "center",
      align: "center",
      width: 100,
      type: "number",
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
      headerAlign: "center",
      align: "center",
      width: 100,
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper>
        <StyledDataGrid
          label="Brokers"
          rows={brokers}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          pageSize={25}
          rowsPerPageOptions={[10, 25, 50]}
          initialState={{
            filter: {
              filterModel: {
                items: [
                  {
                    field: "active",
                    operator: "=",
                    value: 1,
                  },
                ],
              },
            },
          }}
          slotProps={{
            toolbar: {
              actions: (
                <Tooltip title="Add broker">
                  <ToolbarButton
                    color="primary"
                    onClick={() => handleOpenDialog()}
                  >
                    <AddIcon fontSize="small" />
                  </ToolbarButton>
                </Tooltip>
              ),
            },
          }}
        />
      </Paper>

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
