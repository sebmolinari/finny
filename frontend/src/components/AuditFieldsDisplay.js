import React from "react";
import { Box, TextField, Typography } from "@mui/material";
import { formatDateInTimezone } from "../utils/dateUtils";

/**
 * Display read-only audit fields for edit dialogs
 * @param {Object} item - The item being edited with audit fields
 * @param {string} userTimezone - User's timezone from settings
 * @param {string} userDateFormat - User's date format from settings
 * @returns {React.ReactElement}
 */
export const AuditFieldsDisplay = ({
  item,
  userTimezone = "America/Argentina/Buenos_Aires",
  userDateFormat = "YYYY-MM-DD",
}) => {
  if (!item) return null;

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee" }}>
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, display: "block", mb: 2 }}
      >
        Audit Information
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 2,
        }}
      >
        {item.created_at && (
          <TextField
            label="Created At"
            value={formatDateInTimezone(
              item.created_at,
              userTimezone,
              userDateFormat
            )}
            fullWidth
            size="small"
            variant="outlined"
            disabled
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
        )}

        {item.created_by && (
          <TextField
            label="Created By"
            value={item.created_by_username || item.created_by}
            fullWidth
            size="small"
            variant="outlined"
            disabled
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
        )}

        {item.updated_at && (
          <TextField
            label="Updated At"
            value={formatDateInTimezone(
              item.updated_at,
              userTimezone,
              userDateFormat
            )}
            fullWidth
            size="small"
            variant="outlined"
            disabled
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
        )}

        {item.updated_by && (
          <TextField
            label="Updated By"
            value={item.updated_by_username || item.updated_by}
            fullWidth
            size="small"
            variant="outlined"
            disabled
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default AuditFieldsDisplay;
