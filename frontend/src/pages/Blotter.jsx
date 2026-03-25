import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Skeleton,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  CloseRounded as CloseIcon,
} from "@mui/icons-material";
import {
  transactionAPI,
  assetAPI,
  brokerAPI,
  constantsAPI,
  analyticsAPI,
} from "../api/api";
import { useTheme } from "@mui/material/styles";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import { formatNumber, formatCurrency } from "../utils/formatNumber";
import { getTodayInTimezone, formatDate } from "../utils/dateUtils";
import StyledDataGrid from "../components/data-display/StyledDataGrid";
import TransactionDialog from "../components/dialogs/TransactionDialog";
import { ToolbarButton } from "@mui/x-data-grid";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import PageContainer from "../components/layout/PageContainer";
import ConfirmPhraseDialog from "../components/dialogs/ConfirmPhraseDialog";
import { useUserSettings } from "../hooks/useUserSettings";

export default function Blotter() {
  const theme = useTheme();
  const { timezone: userTimezone, dateFormat: userDateFormat, settingsLoading } = useUserSettings();
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]); // Active only - for dialog
  const [brokers, setBrokers] = useState([]); // Active only - for dialog
  const [validTransactionTypes, setValidTransactionTypes] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableCash, setAvailableCash] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResults, setImportResults] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      setError(null);
      const response = await transactionAPI.getAll();
      setTransactions(response.data.data);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setError("Failed to load transactions. Please try again.");
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);
  // Load static lists once
  const loadAssets = useCallback(async () => {
    try {
      // Load active only for dialog
      const response = await assetAPI.getAll();
      setAssets(response.data);
    } catch (error) {
      console.error("Error loading assets:", error);
    }
  }, []);

  const loadBrokers = useCallback(async () => {
    try {
      // Load active only for dialog
      const response = await brokerAPI.getAll();
      setBrokers(response.data);
    } catch (error) {
      console.error("Error loading brokers:", error);
    }
  }, []);

  const loadValidTransactionTypes = useCallback(async () => {
    try {
      const response = await constantsAPI.getByCategory("transaction_types");
      setValidTransactionTypes(response.data || []);
    } catch (error) {
      console.error("Failed to load valid transaction types:", error);
      toast.error("Failed to load valid transaction types");
      setValidTransactionTypes([]);
    }
  }, []);

  const loadCashBalance = useCallback(async () => {
    try {
      const res = await analyticsAPI.getCashBalanceDetails();
      setAvailableCash(res.data?.summary?.current_balance ?? null);
    } catch (error) {
      setAvailableCash(null);
    }
  }, []);

  useEffect(() => {
    loadAssets();
    loadBrokers();
    loadValidTransactionTypes();
  }, [loadAssets, loadBrokers, loadValidTransactionTypes]);

  const handleOpenDialog = (transaction = null) => {
    loadCashBalance();
    setEditingTransaction(transaction || null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTransaction(null);
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleDeleteConfirmed = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ open: false, id: null });
    try {
      await transactionAPI.delete(id);
      toast.success("Transaction deleted successfully");
      loadTransactions();
    } catch (error) {
      handleApiError(error, "Failed to delete transaction");
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

  const handleBulkImport = async () => {
    if (importing) return; // Prevent double imports

    try {
      setImporting(true);
      // Parse CSV text
      const lines = importText.trim().split("\n");
      if (lines.length < 2) {
        toast.error("CSV must have at least a header row and one data row");
        setImporting(false);
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const transactions = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));
        const tx = {};

        headers.forEach((header, index) => {
          const value = values[index];
          switch (header.toLowerCase()) {
            case "date":
              tx.date = value;
              break;
            case "asset symbol":
              tx.asset_symbol = value;
              break;
            case "transaction type":
              tx.transaction_type = value;
              break;
            case "quantity":
              tx.quantity = value ? parseFloat(value) : null;
              break;
            case "price":
              tx.price = value ? parseFloat(value) : null;
              break;
            case "fee":
              tx.fee = value ? parseFloat(value) : null;
              break;
            case "total amount":
              tx.total_amount = parseFloat(value);
              break;
            case "broker":
              tx.broker_name = value;
              break;
            case "notes":
              tx.notes = value;
              break;
            default:
              // Ignore unknown columns
              break;
          }
        });

        transactions.push(tx);
      }

      const response = await transactionAPI.bulkImport(transactions);
      setImportResults(response.data.results);
      toast.success(response.data.message);

      const totalRows = transactions.length;
      const successCount = response.data.results.success.length;
      const errorCount = response.data.results.errors.length;
      if (successCount === totalRows && errorCount === 0) {
        loadTransactions();
        setOpenImportDialog(false); // Only close if all succeeded
      } else {
        // Keep dialog open and show errors
        // Optionally, you could scroll to the error section or highlight it
      }
    } catch (error) {
      console.error("Error importing transactions:", error);
      toast.error(
        error.response?.data?.message || "Failed to import transactions",
      );
    } finally {
      setImporting(false);
    }
  };

  const getImportTemplate = () => {
    return `Date,Asset Symbol,Transaction Type,Quantity,Price,Fee,Total Amount,Broker,Notes
2024-01-15,AAPL,buy,10,150.00,5.00,1505.00,Fidelity,Initial purchase
2024-01-20,,deposit,,,0.00,25000.00,Fidelity,Cash deposit
2024-02-01,MSFT,buy,5,380.00,3.00,1903.00,Fidelity,Tech diversification
2024-02-10,,deposit,,,0.00,15000.00,Interactive Brokers,Additional funds
2024-02-15,VTI,buy,30,230.00,0.00,6900.00,Interactive Brokers,Index diversification
2024-03-01,BTC,buy,0.5,38000.00,0.00,19000.00,Vanguard,Crypto allocation
2024-03-10,GOOGL,buy,7,135.00,0.00,945.00,Vanguard,Tech exposure
2024-03-20,VTI,buy,15,242.50,0.00,3637.50,TD Ameritrade,Additional index fund`;
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case "deposit":
        return "success";
      case "withdraw":
      case "withdrawal":
        return "error";
      case "buy":
        return "info";
      case "sell":
        return "warning";
      case "dividend":
      case "interest":
      case "coupon":
      case "rental":
        return "secondary";
      case "transfer":
        return "default";
      default:
        return "default";
    }
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      headerAlign: "center",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => formatDate(params.value, userDateFormat),
    },
    {
      field: "symbol",
      headerName: "Asset",
      headerAlign: "center",
      flex: 1,
      minWidth: 140,
    },
    {
      field: "transaction_type",
      headerName: "Type",
      headerAlign: "center",
      align: "center",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getTypeColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: "broker_name",
      headerName: "Broker",
      headerAlign: "center",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => {
        const dest = params.row.destination_broker_name;
        if (dest) {
          return (
            <Tooltip title={`Source broker`}>
              <span>
                {params.value} → {dest}
              </span>
            </Tooltip>
          );
        }
        return params.value || "-";
      },
    },
    {
      field: "quantity",
      headerName: "Quantity",
      headerAlign: "center",
      align: "right",
      flex: 1,
      minWidth: 120,
      renderCell: (params) =>
        params.value ? formatNumber(params.value, 4) : "-",
    },
    {
      field: "price",
      headerName: "Price",
      headerAlign: "center",
      align: "right",
      flex: 1,
      minWidth: 120,
      renderCell: (params) =>
        params.value ? formatCurrency(params.value) : "-",
    },
    {
      field: "fee",
      headerName: "Fee",
      headerAlign: "center",
      align: "right",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => formatCurrency(params.value || 0),
    },
    {
      field: "total_amount",
      headerName: "Total",
      headerAlign: "center",
      align: "right",
      flex: 1,
      minWidth: 120,
      renderCell: (params) => formatCurrency(params.value),
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

  if (transactionsLoading || settingsLoading) {
    return (
      <PageContainer>
        <Skeleton variant="rounded" height={600} />
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" action={<Button onClick={loadTransactions}>Retry</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Transactions Grid */}
      <StyledDataGrid
        rows={transactions}
        columns={columns}
        loading={transactionsLoading}
        getRowId={(row) => row.id}
        slotProps={{
          toolbar: {
            actions: (
              <>
                <Tooltip title="Add transaction">
                  <ToolbarButton
                    color="primary"
                    onClick={() => handleOpenDialog()}
                  >
                    <AddIcon fontSize="small" />
                  </ToolbarButton>
                </Tooltip>
                <Tooltip title="Import">
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

      <TransactionDialog
        open={openDialog}
        editingTransaction={editingTransaction}
        assets={assets}
        brokers={brokers}
        validTransactionTypes={validTransactionTypes}
        userTimezone={userTimezone}
        availableCash={availableCash}
        onClose={handleCloseDialog}
        onSave={loadTransactions}
      />

      {/* Import Dialog */}
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
          Bulk Import Transactions
          <IconButton size="small" onClick={handleCloseImportDialog}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Paste CSV data below. The first row should be headers. Column:
              Date, Asset Symbol, Transaction Type, Quantity, Price, Fee, Total
              Amount, Broker, Notes
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
              placeholder="Date,Asset Symbol,Transaction Type,Quantity,Price,Fee,Total Amount,Broker,Notes"
            />
            {importing && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <LoadingSpinner maxWidth="sm" />
              </Box>
            )}
            {importResults && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Import Results:
                </Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.success.main}
                  gutterBottom
                >
                  ✓ {importResults.success.length} transactions imported
                  successfully
                </Typography>
                {importResults.errors.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      color={theme.palette.error.main}
                      gutterBottom
                    >
                      ✗ {importResults.errors.length} transactions failed:
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
      <ConfirmPhraseDialog
        open={deleteConfirm.open}
        title="Delete Transaction"
        phrase="delete"
        description={
          'This will permanently remove the transaction. Type "delete" to confirm.'
        }
        onConfirm={handleDeleteConfirmed}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
      />
    </PageContainer>
  );
}
