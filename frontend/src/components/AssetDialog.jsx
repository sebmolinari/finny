import React, { useState, useEffect } from "react";
import {
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
  FormControlLabel,
  Switch,
  Button,
  Box,
} from "@mui/material";
import { CloseRounded as CloseIcon } from "@mui/icons-material";
import { assetAPI } from "../api/api";
import { toast } from "react-toastify";
import AuditFieldsDisplay from "./AuditFieldsDisplay";

const LABELS = {
  realestate: "Real Estate",
  fixedincome: "Fixed Income",
};

const SUGGESTED_PRICE_SOURCE = {
  crypto: "coingecko",
  currency: "dolarapi",
  equity: "yahoo",
  fixedincome: "yahoo",
  realestate: "manual",
};

const EMPTY_FORM = {
  symbol: "",
  name: "",
  asset_type: "",
  currency: "USD",
  price_source: "",
  price_symbol: "",
  price_factor: "",
  active: true,
};

/**
 * Self-contained dialog for creating / editing an asset.
 * Form state is local so Assets page (and its DataGrid) never re-renders
 * on keystrokes.
 */
export default function AssetDialog({
  open,
  editingAsset,
  validAssetTypes,
  validPriceSources,
  userTimezone,
  userDateFormat,
  isAdmin,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (editingAsset) {
      setFormData({
        symbol: editingAsset.symbol,
        name: editingAsset.name,
        asset_type: editingAsset.asset_type,
        currency: editingAsset.currency,
        price_source: editingAsset.price_source,
        price_symbol: editingAsset.price_symbol,
        price_factor: editingAsset.price_factor,
        active: editingAsset.active !== 0,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editingAsset]);

  const handleSubmit = async () => {
    try {
      if (editingAsset) {
        await assetAPI.update(editingAsset.id, formData);
        toast.success("Asset updated successfully");
      } else {
        await assetAPI.create(formData);
        toast.success("Asset created successfully");
      }
      onClose();
      onSave();
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.errors && Array.isArray(responseData.errors)) {
        responseData.errors.forEach((err) => {
          toast.error(`${err.field}: ${err.message}`);
        });
      } else {
        toast.error(responseData?.message || "Failed to save asset");
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pr: 1,
        }}
      >
        {editingAsset ? "Edit Asset" : "Add Asset"}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box
          component="form"
          id="asset-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
        >
          <TextField
            label="Symbol"
            value={formData.symbol}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                symbol: e.target.value.toUpperCase(),
              }))
            }
            fullWidth
            required
            disabled={!!editingAsset}
            helperText="Ticker symbol (e.g., AAPL, VTSAX, BTC)"
          />
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            fullWidth
            required
            helperText="Full name of the asset"
          />
          <FormControl fullWidth required>
            <InputLabel>Asset Type</InputLabel>
            <Select
              value={formData.asset_type}
              onChange={(e) => {
                const type = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  asset_type: type,
                  price_source: SUGGESTED_PRICE_SOURCE[type] ?? prev.price_source,
                }));
              }}
              label="Asset Type"
            >
              {validAssetTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {LABELS[type] ??
                    type.charAt(0).toUpperCase() +
                      type.slice(1).replace(/([A-Z])/g, " $1")}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, currency: e.target.value }))
              }
              label="Currency"
            >
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="ARS">ARS</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth required>
            <InputLabel>Price Source</InputLabel>
            <Select
              value={formData.price_source}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  price_source: e.target.value,
                }))
              }
              label="Price Source"
            >
              {validPriceSources.map((src) => (
                <MenuItem key={src} value={src}>
                  {src}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Price Symbol"
            value={formData.price_symbol}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, price_symbol: e.target.value }))
            }
            fullWidth
            helperText="Alias Symbol used by the price source API (e.g., BTC for Yahoo, bitcoin for CoinGecko)"
          />
          <TextField
            label="Price Factor"
            type="number"
            value={formData.price_factor}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, price_factor: e.target.value }))
            }
            fullWidth
            slotProps={{ step: "0.01", min: "0" }}
            helperText="Factor to divide the fetched price by"
          />
          {isAdmin && (
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.active}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      active: e.target.checked,
                    }))
                  }
                  color="primary"
                />
              }
              label={formData.active ? "Active" : "Inactive"}
            />
          )}
          {editingAsset && (
            <AuditFieldsDisplay
              item={editingAsset}
              userTimezone={userTimezone}
              userDateFormat={userDateFormat}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" form="asset-form">
          {editingAsset ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
