import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  FormControlLabel,
  Switch,
  Button,
  Box,
} from "@mui/material";
import { CloseRounded as CloseIcon } from "@mui/icons-material";
import { brokerAPI } from "../../api/api";
import { toast } from "react-toastify";
import { handleApiError } from "../../utils/errorHandler";
import AuditFieldsDisplay from "../data-display/AuditFieldsDisplay";

const EMPTY_FORM = { name: "", description: "", website: "", active: true };

/**
 * Self-contained dialog for creating / editing a broker.
 * Form state is local so Brokers page (and its DataGrid) never re-renders
 * on keystrokes.
 */
export default function BrokerDialog({
  open,
  editingBroker,
  userTimezone,
  userDateFormat,
  onClose,
  onSave,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const hasSavedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (editingBroker) {
      setFormData({
        name: editingBroker.name,
        description: editingBroker.description || "",
        website: editingBroker.website || "",
        active: editingBroker.active !== 0,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, editingBroker]);

  useEffect(() => {
    if (open) hasSavedRef.current = false;
  }, [open]);

  const handleClose = () => {
    if (hasSavedRef.current) onSave();
    onClose();
  };

  const handleSubmit = async (createAnother = false) => {
    try {
      if (editingBroker) {
        await brokerAPI.update(editingBroker.id, formData);
        toast.success("Broker updated successfully");
      } else {
        await brokerAPI.create(formData);
        toast.success("Broker created successfully");
      }
      hasSavedRef.current = true;
      if (createAnother) {
        setFormData(EMPTY_FORM);
      } else {
        handleClose();
      }
    } catch (error) {
      handleApiError(error, "Failed to save broker");
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pr: 1,
        }}
      >
        {editingBroker ? "Edit Broker" : "Add Broker"}
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
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
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            fullWidth
            required
            placeholder="e.g., Interactive Brokers, Fidelity, Questrade"
          />
          <TextField
            label="Website"
            value={formData.website}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, website: e.target.value }))
            }
            fullWidth
            placeholder="https://example.com"
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
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
                  setFormData((prev) => ({ ...prev, active: e.target.checked }))
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
        <Button color="inherit" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" form="broker-form">
          {editingBroker ? "Update" : "Create"}
        </Button>
        {!editingBroker && (
          <Button variant="outlined" onClick={() => handleSubmit(true)}>
            Save &amp; Add Another
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
