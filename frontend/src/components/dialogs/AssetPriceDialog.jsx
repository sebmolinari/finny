import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Button,
  Box,
  Paper,
  Typography,
} from "@mui/material";
import {
  CloseRounded as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { assetAPI } from "../../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../../utils/errorHandler";
import { getTodayInTimezone, formatDate } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/formatNumber";
import { formatDatetimeInTimezone } from "../../utils/dateUtils";
import StyledDataGrid from "../data-display/StyledDataGrid";
import AuditFieldsDisplay from "../data-display/AuditFieldsDisplay";
import ConfirmPhraseDialog from "./ConfirmPhraseDialog";

/**
 * Self-contained dialog for managing price history of a single asset.
 * All form state is local so the Assets page DataGrid never re-renders
 * on keystrokes here.
 */
export default function AssetPriceDialog({
  open,
  asset,
  userTimezone,
  userDateFormat,
  isAdmin,
  onClose,
  onPriceChange,
}) {
  const [priceData, setPriceData] = useState([]);
  const [editingPrice, setEditingPrice] = useState(null);
  const [priceFormData, setPriceFormData] = useState({
    date: getTodayInTimezone(userTimezone),
    price: "",
  });
  const [deletePriceConfirm, setDeletePriceConfirm] = useState({
    open: false,
    priceId: null,
  });

  // Load prices whenever the dialog opens for a new asset
  useEffect(() => {
    if (!open || !asset) return;
    loadPrices();
    setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
    setEditingPrice(null);
  }, [open, asset]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPrices = async () => {
    try {
      const response = await assetAPI.getPrices(asset.id);
      setPriceData(response.data);
    } catch (error) {
      handleApiError(error, "Failed to load price data");
    }
  };

  const handleAddPrice = async () => {
    try {
      if (editingPrice) {
        await assetAPI.updatePrice(asset.id, editingPrice.id, priceFormData);
        toast.success("Price updated successfully");
        setEditingPrice(null);
      } else {
        await assetAPI.addPrice(asset.id, priceFormData);
        toast.success("Price added successfully");
      }
      setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
      await loadPrices();
      onPriceChange();
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        responseData.errors.forEach((err) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        toast.error(
          responseData?.message ||
            (editingPrice ? "Failed to update price" : "Failed to add price"),
        );
      }
    }
  };

  const handleEditPrice = (price) => {
    setEditingPrice(price);
    setPriceFormData({
      date: price.date,
      price: price.price,
      source: "manual",
    });
  };

  const handleCancelEdit = () => {
    setEditingPrice(null);
    setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
  };

  const handleDeletePrice = (priceId) => {
    setDeletePriceConfirm({ open: true, priceId });
  };

  const handleDeletePriceConfirmed = async () => {
    const { priceId } = deletePriceConfirm;
    setDeletePriceConfirm({ open: false, priceId: null });
    try {
      await assetAPI.deletePrice(asset.id, priceId);
      toast.success("Price deleted successfully");
      await loadPrices();
      onPriceChange();
    } catch (error) {
      handleApiError(error, "Failed to delete price");
    }
  };

  const handleClose = () => {
    setEditingPrice(null);
    setPriceData([]);
    setPriceFormData({ date: getTodayInTimezone(userTimezone), price: "" });
    onClose();
  };

  const columns = [
    {
      field: "date",
      headerName: "Date",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => formatDate(params.row.date, userDateFormat),
    },
    {
      field: "updated_at",
      headerName: "Last Updated",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) =>
        formatDatetimeInTimezone(
          params.row.updated_at || params.row.created_at,
          userDateFormat,
          userTimezone,
        ),
    },
    {
      field: "price",
      headerName: "Price",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatCurrency(parseFloat(params.row.price), 4),
    },
    {
      field: "actions",
      headerName: "Actions",
      headerAlign: "center",
      align: "center",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) =>
        isAdmin ? (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => handleEditPrice(params.row)}
              title="Edit"
              color="primary"
              sx={{ padding: "4px" }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDeletePrice(params.row.id)}
              title="Delete"
              color="error"
              sx={{ padding: "4px" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        ),
    },
  ];

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pr: 1,
          }}
        >
          Manage Prices — {asset?.symbol} ({asset?.name})
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {isAdmin && (
              <>
                <Typography variant="h6" gutterBottom>
                  {editingPrice ? "Edit Price" : "Add New Price"}
                </Typography>
                <Box
                  component="form"
                  id="price-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddPrice();
                  }}
                  sx={{ display: "flex", gap: 2, mb: 3 }}
                >
                  <TextField
                    label="Date"
                    type="date"
                    value={priceFormData.date}
                    onChange={(e) =>
                      setPriceFormData((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                  <TextField
                    label="Price"
                    type="number"
                    value={priceFormData.price}
                    onChange={(e) =>
                      setPriceFormData((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    slotProps={{ step: "0.01", min: "0" }}
                    required
                  />
                  <Button type="submit" variant="contained" form="price-form">
                    {editingPrice ? "Update" : "Add"}
                  </Button>
                  {editingPrice && (
                    <Button variant="outlined" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  )}
                </Box>
                {editingPrice && (
                  <AuditFieldsDisplay
                    item={editingPrice}
                    userTimezone={userTimezone}
                    userDateFormat={userDateFormat}
                  />
                )}
              </>
            )}

            <Paper sx={{ width: "100%" }}>
              <div style={{ height: 400, width: "100%" }}>
                <StyledDataGrid
                  label="Price History"
                  rows={priceData}
                  columns={columns}
                  autoHeight
                  disableRowSelectionOnClick
                  getRowId={(row) => row.id}
                  pageSize={25}
                  rowsPerPageOptions={[10, 25, 50]}
                />
              </div>
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button color="inherit" onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmPhraseDialog
        open={deletePriceConfirm.open}
        title="Delete Price Entry"
        phrase="delete"
        description="This will permanently remove this price data point."
        confirmLabel="Delete"
        onConfirm={handleDeletePriceConfirmed}
        onClose={() => setDeletePriceConfirm({ open: false, priceId: null })}
      />
    </>
  );
}
