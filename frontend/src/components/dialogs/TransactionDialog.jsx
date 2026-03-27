import { useState, useEffect, useCallback } from "react";
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
  FormHelperText,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { CloseRounded as CloseIcon } from "@mui/icons-material";
import { transactionAPI, assetAPI } from "../../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../../utils/errorHandler";
import { formatCurrency } from "../../utils/formatNumber";
import { getTodayInTimezone } from "../../utils/dateUtils";

const EMPTY_FORM = {
  asset_id: "",
  broker_id: "",
  destination_broker_id: "",
  date: "",
  transaction_type: "buy",
  quantity: "",
  price: "",
  total_amount: "",
  fee: "",
  notes: "",
};

/**
 * Self-contained dialog for creating / editing a transaction.
 * Keeping form state local here prevents Blotter (and its DataGrid)
 * from re-rendering on every keystroke.
 */
export default function TransactionDialog({
  open,
  editingTransaction,
  assets,
  brokers,
  validTransactionTypes,
  userTimezone,
  availableCash,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Initialise form whenever the dialog opens or the target transaction changes
  useEffect(() => {
    if (!open) return;

    if (editingTransaction) {
      const resolvedBrokerId =
        editingTransaction.broker_id ||
        (editingTransaction.broker_name
          ? brokers.find((b) => b.name === editingTransaction.broker_name)
              ?.id || ""
          : "");
      setFormData({
        asset_id: editingTransaction.asset_id,
        broker_id: resolvedBrokerId,
        destination_broker_id: editingTransaction.destination_broker_id || "",
        date: editingTransaction.date,
        transaction_type: editingTransaction.transaction_type,
        quantity: editingTransaction.quantity,
        price: editingTransaction.price,
        total_amount: editingTransaction.total_amount,
        fee: editingTransaction.fee || "",
        notes: editingTransaction.notes || "",
      });
    } else {
      setFormData({
        ...EMPTY_FORM,
        date: getTodayInTimezone(userTimezone),
      });
    }
  }, [open, editingTransaction, userTimezone, brokers]);

  // ── Derived flags ────────────────────────────────────────────────────────────
  const transactionType = formData.transaction_type;
  const isTransfer = transactionType === "transfer";
  const requiresBroker =
    transactionType !== "deposit" && transactionType !== "withdraw";
  const requiresAsset =
    transactionType !== "deposit" && transactionType !== "withdraw";
  const requiresQtyPrice = ["buy", "sell", "transfer"].includes(
    transactionType,
  );
  const feeEnabled = ["buy", "sell"].includes(transactionType);

  // ── Helper text ──────────────────────────────────────────────────────────────
  const brokerHelp = isTransfer
    ? "Source broker (where the asset currently is)"
    : requiresBroker
      ? "Broker is required for this transaction type"
      : "Broker not required for deposit/withdraw";

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

  // ── Auto-calculate total amount ──────────────────────────────────────────────
  const calculateAmount = useCallback(() => {
    const quantity = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.price) || 0;
    const fee = parseFloat(formData.fee) || 0;
    const baseAmount = quantity * price;
    if (transactionType === "buy") return (baseAmount + fee).toFixed(4);
    if (transactionType === "sell") return (baseAmount - fee).toFixed(4);
    return baseAmount.toFixed(4);
  }, [formData.quantity, formData.price, formData.fee, transactionType]);

  useEffect(() => {
    if (formData.quantity && formData.price) {
      setFormData((prev) => ({ ...prev, total_amount: calculateAmount() }));
    }
  }, [
    formData.quantity,
    formData.price,
    formData.fee,
    transactionType,
    calculateAmount,
  ]);

  // ── Auto-populate price when asset is selected ───────────────────────────────
  const handleAssetChange = async (assetId) => {
    setFormData((prev) => ({ ...prev, asset_id: assetId }));
    if (assetId && !editingTransaction) {
      // First try the currentPrice already embedded in the assets list (no extra call)
      const knownAsset = assets.find((a) => String(a.id) === String(assetId));
      if (knownAsset?.currentPrice) {
        setFormData((prev) => ({
          ...prev,
          asset_id: assetId,
          price: knownAsset.currentPrice,
        }));
        return;
      }
      // Fallback: fetch from API if not available (e.g. active-only list)
      try {
        const response = await assetAPI.getLatestPrice(assetId);
        if (response.data?.price) {
          setFormData((prev) => ({
            ...prev,
            asset_id: assetId,
            price: response.data.price,
          }));
        }
      } catch {
        console.error("No price available for asset");
      }
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (createAnother = false) => {
    try {
      const type = formData.transaction_type;

      if (type === "transfer") {
        if (!formData.destination_broker_id) {
          toast.error("Destination broker is required for transfers");
          return;
        }
        if (formData.broker_id === formData.destination_broker_id) {
          toast.error("Source and destination broker must be different");
          return;
        }
        await transactionAPI.transfer({
          asset_id: formData.asset_id,
          broker_id: formData.broker_id,
          destination_broker_id: formData.destination_broker_id,
          quantity: parseFloat(formData.quantity),
          date: formData.date,
          notes: formData.notes,
        });
        toast.success("Transfer created successfully");
        onClose();
        onSave();
        return;
      }

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
        onClose();
        onSave();
      } else {
        await transactionAPI.create(submitData);
        toast.success("Transaction created successfully");
        onSave();
        if (createAnother) {
          setFormData({ ...EMPTY_FORM, date: getTodayInTimezone(userTimezone) });
        } else {
          onClose();
        }
      }
    } catch (error) {
      handleApiError(error, "Failed to save transaction");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
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
        {editingTransaction ? "Edit Transaction" : "Add Transaction"}
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {availableCash !== null && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Available cash balance: {formatCurrency(availableCash)}
            </Typography>
          </Box>
        )}
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
              setFormData((prev) => ({ ...prev, date: e.target.value }))
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
                setFormData((prev) => ({
                  ...prev,
                  transaction_type: e.target.value,
                }))
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
              <InputLabel>{isTransfer ? "Source Broker" : "Broker"}</InputLabel>
              <Select
                value={formData.broker_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    broker_id: e.target.value,
                  }))
                }
                label={isTransfer ? "Source Broker" : "Broker"}
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

          {isTransfer && (
            <FormControl fullWidth required>
              <InputLabel>Destination Broker</InputLabel>
              <Select
                value={formData.destination_broker_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    destination_broker_id: e.target.value,
                  }))
                }
                label="Destination Broker"
              >
                {brokers
                  .filter((b) => b.id !== formData.broker_id)
                  .map((broker) => (
                    <MenuItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </MenuItem>
                  ))}
              </Select>
              <FormHelperText>
                Broker to receive the transferred asset
              </FormHelperText>
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
                  setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                }
                fullWidth
                required
                slotProps={{ step: "0.00000001", min: "0" }}
                helperText={
                  isTransfer ? "Number of units to transfer" : quantityHelp
                }
              />
              {!isTransfer && (
                <TextField
                  label="Price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  fullWidth
                  required
                  slotProps={{ step: "0.000001", min: "0" }}
                  helperText={priceHelp}
                />
              )}
            </>
          )}

          {feeEnabled && (
            <TextField
              label="Fee"
              type="number"
              value={formData.fee}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fee: e.target.value }))
              }
              fullWidth
              slotProps={{ step: "0.0001", min: "0" }}
              helperText={feeHelp}
            />
          )}

          {!isTransfer && (
            <TextField
              label="Total Amount"
              type="number"
              value={formData.total_amount}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  total_amount: e.target.value,
                }))
              }
              fullWidth
              required
              slotProps={{ step: "0.0001", min: "0" }}
              helperText={totalAmountHelp}
            />
          )}

          <TextField
            label="Notes"
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
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
        <Button color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" form="transaction-form">
          {editingTransaction ? "Update" : "Save"}
        </Button>
        {!editingTransaction && (
          <Button variant="outlined" onClick={() => handleSubmit(true)}>
            Save &amp; Add Another
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
