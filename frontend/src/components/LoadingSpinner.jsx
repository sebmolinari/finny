import React from "react";
import { Container, Box, CircularProgress } from "@mui/material";

export default function LoadingSpinner({ maxWidth = "xl" }) {
  return (
    <Container maxWidth={maxWidth} sx={{ mt: 4, mb: 4 }}>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    </Container>
  );
}
