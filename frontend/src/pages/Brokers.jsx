import React, { useState, useEffect, useCallback } from "react";
import { Box, IconButton, Switch, Tooltip, Alert, Button } from "@mui/material";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import BrokerDialog from "../components/dialogs/BrokerDialog";
import { ToolbarButton } from "@mui/x-data-grid";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { brokerAPI } from "../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import { useAuth } from "../auth/AuthContext";
import PageContainer from "../components/layout/PageContainer";
import ConfirmPhraseDialog from "../components/dialogs/ConfirmPhraseDialog";
import { useUserSettings } from "../hooks/useUserSettings";

export default function Brokers() {
  const { user } = useAuth();
  const { timezone: userTimezone, dateFormat: userDateFormat } = useUserSettings();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBroker, setEditingBroker] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    id: null,
    name: "",
  });
  const loadBrokers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await brokerAPI.getAll({
        includeInactive: true,
      });
      setBrokers(response.data);
    } catch (err) {
      console.error("Error loading brokers:", err);
      setError("Failed to load brokers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrokers();
  }, [loadBrokers]);

  const handleOpenDialog = (broker = null) => {
    setEditingBroker(broker || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBroker(null);
  };

  const handleDelete = (id, name) => {
    setDeleteConfirm({ open: true, id, name });
  };

  const handleDeleteConfirmed = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ open: false, id: null, name: "" });
    try {
      await brokerAPI.delete(id);
      toast.success("Broker deleted successfully");
      loadBrokers();
    } catch (error) {
      handleApiError(error, "Failed to delete broker");
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
            onClick={() => handleDelete(params.row.id, params.row.name)}
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

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" action={<Button onClick={loadBrokers}>Retry</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <StyledDataGrid
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

      <BrokerDialog
        open={openDialog}
        editingBroker={editingBroker}
        userTimezone={userTimezone}
        userDateFormat={userDateFormat}
        onClose={handleCloseDialog}
        onSave={loadBrokers}
      />
      <ConfirmPhraseDialog
        open={deleteConfirm.open}
        title="Delete Broker"
        phrase={deleteConfirm.name}
        description="This will permanently delete the broker and may affect associated transactions. Type the broker name to confirm."
        onConfirm={handleDeleteConfirmed}
        onClose={() => setDeleteConfirm({ open: false, id: null, name: "" })}
      />
    </PageContainer>
  );
}
