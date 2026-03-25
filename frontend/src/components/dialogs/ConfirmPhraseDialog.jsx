import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Button,
  Typography,
} from "@mui/material";

/**
 * ConfirmPhraseDialog — requires the user to type a confirmation phrase
 * before proceeding with a destructive action.
 *
 * Props:
 *   open       {boolean}   Whether the dialog is open
 *   title      {string}    Dialog title (e.g. "Delete Asset")
 *   phrase     {string}    The exact phrase the user must type (e.g. "AAPL")
 *   description {string}   Optional body text explaining the action
 *   onConfirm  {function}  Called when phrase matches and user clicks Confirm
 *   onClose    {function}  Called when dialog should close (Cancel or backdrop)
 *   confirmLabel {string}  Label for confirm button (default "Delete")
 *   confirmColor {string}  MUI color for confirm button (default "error")
 */
export default function ConfirmPhraseDialog({
  open,
  title = "Confirm Action",
  phrase,
  description,
  extraContent,
  onConfirm,
  onClose,
  confirmLabel = "Delete",
  confirmColor = "error",
}) {
  const [typed, setTyped] = useState("");

  // Reset typed value each time dialog opens
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const handleConfirm = () => {
    if (typed === phrase) {
      onConfirm();
      onClose();
    }
  };

  const matches = typed === phrase;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {extraContent && <>{extraContent}</>}
        {description && (
          <DialogContentText sx={{ mb: 2 }}>{description}</DialogContentText>
        )}
        <Typography variant="body2" sx={{ mb: 1 }}>
          To confirm, type{" "}
          <strong style={{ fontFamily: "monospace" }}>{phrase}</strong> below:
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && matches && handleConfirm()}
          placeholder={phrase}
          error={typed.length > 0 && !matches}
          helperText={typed.length > 0 && !matches ? "Text does not match" : ""}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={handleConfirm}
          disabled={!matches}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
