import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  FormHelperText,
  Pagination,
  Grid,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import {
  transactionAPI,
  assetAPI,
  brokerAPI,
  constantsAPI,
  settingsAPI,
} from "../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../utils/errorHandler";
import { formatNumber, formatCurrency } from "../utils/formatNumber";
import { getTodayInTimezone, formatDate } from "../utils/dateUtils";
import {
  StyledTable,
  StyledHeaderCell,
  ActionsCell,
} from "../components/StyledTable";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Blotter() {
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]); // Active only - for dialog
  const [brokers, setBrokers] = useState([]); // Active only - for dialog
  const [filterAssets, setFilterAssets] = useState([]); // All - for filters
  const [validTransactionTypes, setValidTransactionTypes] = useState([]);
  const [userTimezone, setUserTimezone] = useState(null);
  const [userDateFormat, setUserDateFormat] = useState();
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importResults, setImportResults] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    asset_id: "",
    broker_id: "",
    date: getTodayInTimezone(userTimezone),
    transaction_type: "buy",
    quantity: "",
    price: "",
    total_amount: "",
    fee: "",
    notes: "",
  });

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(50);

  // Filter state (edit and applied)
  const [filters, setFilters] = useState({
    asset_id: "",
    transaction_type: "",
    start_date: "",
    end_date: "",
  });
  const [pendingFilters, setPendingFilters] = useState({
    asset_id: "",
    transaction_type: "",
    start_date: "",
    end_date: "",
  });

  // Load transactions when page/filters change
  const loadTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      const params = {
        page,
        limit,
        ...(filters.asset_id && { assetId: filters.asset_id }),
        ...(filters.transaction_type && {
          transactionType: filters.transaction_type,
        }),
        ...(filters.start_date && { startDate: filters.start_date }),
        ...(filters.end_date && { endDate: filters.end_date }),
      };
      const response = await transactionAPI.getAll(params);
      setTransactions(response.data.data);
      setTotalPages(response.data.pagination.pages || 1);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [
    page,
    limit,
    filters.asset_id,
    filters.transaction_type,
    filters.start_date,
    filters.end_date,
  ]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);
  // Load static lists once
  const loadAssets = useCallback(async () => {
    try {
      // Load active only for dialog
      const response = await assetAPI.getAll();
      setAssets(response.data);
      // Load all (including inactive) for filters
      const filterResponse = await assetAPI.getAll({ includeInactive: true });
      setFilterAssets(filterResponse.data);
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

  const loadUserSettings = useCallback(async () => {
    setSettingsLoading(true);
    const response = await settingsAPI.get();
    setUserTimezone(response.data.timezone);
    setUserDateFormat(response.data.date_format);
    setSettingsLoading(false);
  }, []);

  useEffect(() => {
    loadAssets();
    loadBrokers();
    loadValidTransactionTypes();
    loadUserSettings();
  }, [loadAssets, loadBrokers, loadValidTransactionTypes, loadUserSettings]);

  // Update form date when timezone is loaded
  useEffect(() => {
    if (userTimezone) {
      setFormData((prev) => ({
        ...prev,
        date: getTodayInTimezone(userTimezone),
      }));
    }
  }, [userTimezone]);

  const handleOpenDialog = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      const resolvedBrokerId =
        transaction.broker_id ||
        (transaction.broker_name
          ? brokers.find((b) => b.name === transaction.broker_name)?.id || ""
          : "");
      setFormData({
        asset_id: transaction.asset_id,
        broker_id: resolvedBrokerId,
        date: transaction.date,
        transaction_type: transaction.transaction_type,
        quantity: transaction.quantity,
        price: transaction.price,
        total_amount: transaction.total_amount,
        fee: transaction.fee || "",
        notes: transaction.notes || "",
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        asset_id: "",
        broker_id: "",
        date: getTodayInTimezone(userTimezone),
        transaction_type: "buy",
        quantity: "",
        price: "",
        total_amount: "",
        fee: "",
        notes: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTransaction(null);
  };

  // Auto-populate price when asset is selected
  const handleAssetChange = async (assetId) => {
    setFormData({ ...formData, asset_id: assetId });

    if (assetId && !editingTransaction) {
      try {
        const response = await assetAPI.getLatestPrice(assetId);
        if (response.data?.price) {
          setFormData((prev) => ({
            ...prev,
            asset_id: assetId,
            price: response.data.price,
          }));
        }
      } catch (error) {
        // Price not available, just set the asset_id
        console.error("No price available for asset");
      }
    }
  };

  // Helper text per field based on transaction type
  const transactionType = formData.transaction_type;

  const requiresBroker =
    transactionType !== "deposit" && transactionType !== "withdraw";

  const brokerHelp = requiresBroker
    ? "Broker is required for this transaction type"
    : "Broker not required for deposit/withdraw";

  const requiresAsset =
    transactionType !== "deposit" && transactionType !== "withdraw";
  const requiresQtyPrice = ["buy", "sell"].includes(transactionType);
  const feeEnabled = ["buy", "sell"].includes(transactionType);

  const assetHelp = requiresAsset
    ? ["dividend", "coupon", "interest", "rental"].includes(transactionType)
      ? "Asset is required for dividend/coupon/interest/rental"
      : "Asset is required for buy/sell"
    : "";

  const quantityHelp = requiresQtyPrice
    ? "Enter a positive quantity of units"
    : "";

  const priceHelp = requiresQtyPrice ? "Enter a positive price" : "";

  const feeHelp = feeEnabled
    ? transactionType === "buy"
      ? "Fee increases cash outflow (added to total)"
      : transactionType === "sell"
        ? "Fee decreases cash inflow (subtracted from total)"
        : "Optional; enter 0 if none"
    : "";

  const totalAmountHelp =
    transactionType === "buy"
      ? "Calculated as Quantity × Price + Fee"
      : transactionType === "sell"
        ? "Calculated as Quantity × Price − Fee"
        : "Total cash amount for this transaction";

  const notesHelp =
    transactionType === "sell"
      ? "Notes are required for sell transactions"
      : "Optional notes or comments";

  const handleSubmit = async () => {
    try {
      const type = formData.transaction_type;

      // Validate notes for sell transactions
      if (type === "sell" && !formData.notes?.trim()) {
        toast.error("Notes are required for sell transactions");
        return;
      }

      const isCash = type === "deposit" || type === "withdraw";
      const incomeNoQtyPrice = [
        "dividend",
        "coupon",
        "interest",
        "rental",
      ].includes(type);

      // Prepare data, nulling out disabled fields
      const submitData = { ...formData };
      if (isCash) {
        submitData.asset_id = null;
        submitData.quantity = null;
        submitData.price = null;
        submitData.fee = null;
        submitData.broker_id = null;
      }

      if (incomeNoQtyPrice) {
        submitData.quantity = null;
        submitData.price = null;
        submitData.fee = null;
      }

      if (editingTransaction) {
        await transactionAPI.update(editingTransaction.id, submitData);
        toast.success("Transaction updated successfully");
      } else {
        await transactionAPI.create(submitData);
        toast.success("Transaction created successfully");
      }
      handleCloseDialog();
      loadTransactions();
    } catch (error) {
      handleApiError(error, "Failed to save transaction");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      try {
        await transactionAPI.delete(id);
        toast.success("Transaction deleted successfully");
        loadTransactions();
      } catch (error) {
        handleApiError(error, "Failed to delete transaction");
      }
    }
  };

  const handleExport = async () => {
    try {
      const exportParams = {
        ...(filters.asset_id && { assetId: filters.asset_id }),
        ...(filters.transaction_type && {
          transactionType: filters.transaction_type,
        }),
        ...(filters.start_date && { startDate: filters.start_date }),
        ...(filters.end_date && { endDate: filters.end_date }),
      };
      const response = await transactionAPI.exportTransactions(exportParams);
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions_${getTodayInTimezone(userTimezone)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Transactions exported successfully");
    } catch (error) {
      console.error("Error exporting transactions:", error);
      toast.error("Failed to export transactions");
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
        error.response?.data?.message || "Failed to import transactions"
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

  const calculateAmount = useCallback(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    const fee = parseFloat(formData.fee) || 0;
    const baseAmount = quantity * price;

    // For buy transactions, add fee to total
    // For sell transactions, subtract fee from total
    // For others (dividend, deposit, withdraw), just use base amount
    if (formData.transaction_type === "buy") {
      return (baseAmount + fee).toFixed(4);
    } else if (formData.transaction_type === "sell") {
      return (baseAmount - fee).toFixed(4);
    }

    return baseAmount.toFixed(4);
  }, [
    formData.quantity,
    formData.price,
    formData.fee,
    formData.transaction_type,
  ]);

  useEffect(() => {
    if (formData.quantity && formData.price) {
      setFormData((prev) => ({
        ...prev,
        total_amount: calculateAmount(),
      }));
    }
  }, [
    formData.quantity,
    formData.price,
    formData.fee,
    formData.transaction_type,
    calculateAmount,
  ]);

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Only update pendingFilters on change, not filters
  const handleFilterChange = (field, value) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Apply filters when button is clicked
  const applyFilters = () => {
    setFilters({ ...pendingFilters });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      asset_id: "",
      transaction_type: "",
      start_date: "",
      end_date: "",
    });
    setPendingFilters({
      asset_id: "",
      transaction_type: "",
      start_date: "",
      end_date: "",
    });
    setPage(1);
  };

  const LABELS = {
    realestate: "Real Estate",
    fixedincome: "Fixed Income",
  };

  if (transactionsLoading || settingsLoading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Blotter</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={handleOpenImportDialog}
          >
            Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>

      {/* Filters Section */}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Asset</InputLabel>
              <Select
                value={pendingFilters.asset_id}
                onChange={(e) => handleFilterChange("asset_id", e.target.value)}
                label="Asset"
              >
                <MenuItem value="">All Assets</MenuItem>
                {filterAssets.map((asset) => (
                  <MenuItem key={asset.id} value={asset.id}>
                    {asset.symbol} - {asset.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={pendingFilters.transaction_type}
                onChange={(e) =>
                  handleFilterChange("transaction_type", e.target.value)
                }
                label="Type"
              >
                <MenuItem value="">All Types</MenuItem>
                {validTransactionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {LABELS[type] ??
                      type.charAt(0).toUpperCase() +
                        type.slice(1).replace(/([A-Z])/g, " $1")}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              label="Start Date"
              type="date"
              value={pendingFilters.start_date}
              onChange={(e) => handleFilterChange("start_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2.5}>
            <TextField
              label="End Date"
              type="date"
              value={pendingFilters.end_date}
              onChange={(e) => handleFilterChange("end_date", e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={6} sm={6} md={1.5}>
            <Button
              variant="contained"
              onClick={applyFilters}
              fullWidth
              size="medium"
              sx={{ mb: { xs: 1, md: 0 } }}
            >
              Apply
            </Button>
          </Grid>
          <Grid item xs={6} sm={6} md={1.5}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
              size="medium"
            >
              Clear
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Transactions Table */}
      <Paper>
        <TableContainer>
          <StyledTable>
            <TableHead>
              <TableRow>
                <StyledHeaderCell sx={{ width: 100 }}>Date</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 100 }}>Asset</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 100 }}>Type</StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 120 }}>Broker</StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Quantity
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Price
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 80 }}>
                  Fee
                </StyledHeaderCell>
                <StyledHeaderCell align="right" sx={{ width: 100 }}>
                  Total
                </StyledHeaderCell>
                <StyledHeaderCell sx={{ width: 100 }}>Actions</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.date, userDateFormat)}</TableCell>
                  <TableCell>{tx.symbol || "-"}</TableCell>
                  <TableCell>{tx.transaction_type}</TableCell>
                  <TableCell>{tx.broker_name || "-"}</TableCell>
                  <TableCell align="right">
                    {tx.quantity ? formatNumber(tx.quantity, 4) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {tx.price ? formatCurrency(tx.price) : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(tx.fee || 0)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(tx.total_amount)}
                  </TableCell>
                  <ActionsCell>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(tx)}
                        color="primary"
                        title="Edit"
                        sx={{ padding: "4px" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(tx.id)}
                        color="error"
                        title="Delete"
                        sx={{ padding: "4px" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ActionsCell>
                </TableRow>
              ))}
            </TableBody>
          </StyledTable>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      </Paper>

      {/* Transaction Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingTransaction ? "Edit Transaction" : "Add Transaction"}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="transaction-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
          >
            <TextField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={formData.transaction_type}
                onChange={(e) =>
                  setFormData({ ...formData, transaction_type: e.target.value })
                }
                label="Transaction Type"
              >
                {validTransactionTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {requiresBroker && (
              <FormControl fullWidth required={requiresBroker}>
                <InputLabel>Broker</InputLabel>
                <Select
                  value={formData.broker_id}
                  onChange={(e) =>
                    setFormData({ ...formData, broker_id: e.target.value })
                  }
                  label="Broker"
                >
                  {brokers.map((broker) => (
                    <MenuItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{brokerHelp}</FormHelperText>
              </FormControl>
            )}
            {requiresAsset && (
              <FormControl fullWidth required>
                <InputLabel>Asset</InputLabel>
                <Select
                  value={formData.asset_id}
                  onChange={(e) => handleAssetChange(e.target.value)}
                  label="Asset"
                >
                  {assets.map((asset) => (
                    <MenuItem key={asset.id} value={asset.id}>
                      {asset.symbol} - {asset.name}
                    </MenuItem>
                  ))}
                </Select>
                {assetHelp && <FormHelperText>{assetHelp}</FormHelperText>}
              </FormControl>
            )}

            {requiresQtyPrice && (
              <>
                <TextField
                  label="Quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  fullWidth
                  required
                  inputProps={{
                    step: "0.00000001",
                    min: "0",
                  }}
                  helperText={quantityHelp}
                />
                <TextField
                  label="Price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  fullWidth
                  required
                  inputProps={{ step: "0.000001", min: "0" }}
                  helperText={priceHelp}
                />
              </>
            )}

            {feeEnabled && (
              <TextField
                label="Fee"
                type="number"
                value={formData.fee}
                onChange={(e) =>
                  setFormData({ ...formData, fee: e.target.value })
                }
                fullWidth
                inputProps={{ step: "0.0001", min: "0" }}
                helperText={feeHelp}
              />
            )}
            <TextField
              label="Total Amount"
              type="number"
              value={formData.total_amount}
              onChange={(e) =>
                setFormData({ ...formData, total_amount: e.target.value })
              }
              fullWidth
              required
              inputProps={{ step: "0.0001", min: "0" }}
              helperText={totalAmountHelp}
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              fullWidth
              multiline
              rows={2}
              required={transactionType === "sell"}
              helperText={notesHelp}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button type="submit" variant="contained" form="transaction-form">
            {editingTransaction ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={openImportDialog}
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Bulk Import Transactions</DialogTitle>
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
                <Typography variant="body2" color="success.main" gutterBottom>
                  ✓ {importResults.success.length} transactions imported
                  successfully
                </Typography>
                {importResults.errors.length > 0 && (
                  <Box>
                    <Typography variant="body2" color="error.main" gutterBottom>
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
          <Button onClick={handleCloseImportDialog} disabled={importing}>
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
    </Container>
  );
}
