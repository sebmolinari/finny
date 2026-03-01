import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function LoadingSpinner({ maxWidth = "xl", message }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "400px",
        gap: 2,
      }}
    >
      <CircularProgress
        size={40}
        thickness={3.5}
        sx={{ color: "primary.main" }}
      />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
}
