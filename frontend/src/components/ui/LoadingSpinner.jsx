import { Box, CircularProgress, Typography, Fade } from "@mui/material";

export default function LoadingSpinner({
  message = "Loading...",
  fullScreen = false,
  size = 48,
}) {
  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: fullScreen ? "100vh" : "300px",
          width: "100%",
          gap: 2,
        }}
      >
        {/* Spinner with subtle glow */}
        <Box
          sx={{
            position: "relative",
            display: "inline-flex",
          }}
        >
          <CircularProgress
            size={size}
            thickness={4}
            sx={{
              color: "primary.main",
            }}
          />

          {/* Optional soft background ring */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={size}
            thickness={4}
            sx={{
              color: "rgba(0,0,0,0.05)",
              position: "absolute",
              left: 0,
            }}
          />
        </Box>

        {/* Message */}
        {message && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: "0.9rem",
              letterSpacing: 0.3,
              textAlign: "center",
            }}
          >
            {message}
          </Typography>
        )}
      </Box>
    </Fade>
  );
}
