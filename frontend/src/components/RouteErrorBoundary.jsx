import {
  useRouteError,
  isRouteErrorResponse,
  useNavigate,
} from "react-router-dom";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Error as ErrorIcon } from "@mui/icons-material";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Oops! Something went wrong";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, textAlign: "center" }}>
        <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />

        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>

        {import.meta.env.DEV && error instanceof Error && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "#eee",
              borderRadius: 1,
              textAlign: "left",
            }}
          >
            <Typography variant="subtitle2" color="error" gutterBottom>
              Dev details
            </Typography>
            <Typography
              component="pre"
              sx={{ fontSize: 11, fontFamily: "monospace" }}
            >
              {error.stack}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Button variant="outlined" onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
