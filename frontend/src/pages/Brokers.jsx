import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Alert,
} from "@mui/material";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import BrokerDialog from "../components/dialogs/BrokerDialog";
import { ToolbarButton } from "@mui/x-data-grid";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  CloseRounded as CloseIcon,
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
  const { timezone: userTimezone, dateFormat: userDateFormat } =
    useUserSettings();
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
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
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

  const handleOpenImportDialog = () => {
    setOpenImportDialog(true);
    setImportText("");
    setImportResults(null);
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
    setImportText("");
    setImportResults(null);
  };

  const getImportTemplate = () =>
    `Name,Description,Website
Fidelity,Main brokerage account,https://fidelity.com
Interactive Brokers,International trading,https://interactivebrokers.com
Vanguard,Index fund broker,`;

  const handleBulkImport = async () => {
    if (importing) return;
    try {
      setImporting(true);
      const lines = importText.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have at least a header row and one data row");
        return;
      }
      const headerRow = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      const brokers = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
        const broker = {};
        headerRow.forEach((header, index) => {
          const value = values[index];
          switch (header.toLowerCase()) {
            case "name":
              broker.name = value;
              break;
            case "description":
              broker.description = value || undefined;
              break;
            case "website":
              broker.website = value || undefined;
              break;
            default:
              break;
          }
        });
        brokers.push(broker);
      }
      const response = await brokerAPI.bulkImport(brokers);
      setImportResults(response.data.results);
      toast.success(response.data.message);
      const successCount = response.data.results.success.length;
      const errorCount = response.data.results.errors.length;
      if (successCount === brokers.length && errorCount === 0) {
        loadBrokers();
        setOpenImportDialog(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to import brokers");
    } finally {
      setImporting(false);
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
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <PageContainer>
        <Alert
          severity="error"
          action={<Button onClick={loadBrokers}>Retry</Button>}
        >
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
              <>
                <Tooltip title="Add broker">
                  <ToolbarButton
                    color="primary"
                    onClick={() => handleOpenDialog()}
                  >
                    <AddIcon fontSize="small" />
                  </ToolbarButton>
                </Tooltip>
                <Tooltip title="Import brokers">
                  <ToolbarButton
                    color="primary"
                    onClick={() => handleOpenImportDialog()}
                  >
                    <UploadIcon fontSize="small" />
                  </ToolbarButton>
                </Tooltip>
              </>
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
      <Dialog
        open={openImportDialog}
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pr: 1,
          }}
        >
          Bulk Import Brokers
          <IconButton size="small" onClick={handleCloseImportDialog}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Paste CSV data below. The first row should be headers. Columns:
              Name, Description, Website
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setImportText(getImportTemplate())}
            >
              Load Example CSV
            </Button>
            <TextField
              label="CSV Data"
              multiline
              rows={12}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              fullWidth
              placeholder="Name,Description,Website"
            />
            {importing && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <LoadingSpinner />
              </Box>
            )}
            {importResults && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Import Results:
                </Typography>
                <Typography
                  variant="body2"
                  color="success.main"
                  gutterBottom
                >
                  ✓ {importResults.success.length} brokers imported successfully
                </Typography>
                {importResults.errors.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      color="error.main"
                      gutterBottom
                    >
                      ✗ {importResults.errors.length} brokers failed:
                    </Typography>
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflow: "auto",
                        bgcolor: "#ffebee",
                        p: 1,
                        borderRadius: 1,
                      }}
                    >
                      {importResults.errors.map((err, idx) => (
                        <Typography
                          key={idx}
                          variant="body2"
                          sx={{ fontFamily: "monospace" }}
                        >
                          Row {err.row}: {err.error}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={handleCloseImportDialog}
            disabled={importing}
          >
            Close
          </Button>
          <Button
            onClick={handleBulkImport}
            variant="contained"
            disabled={!importText.trim() || importing}
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
