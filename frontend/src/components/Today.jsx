import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";

export default function Today() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: 0.5,
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <CalendarTodayRoundedIcon
        sx={{ fontSize: 13, color: "text.secondary" }}
      />
      <Typography
        variant="caption"
        sx={{ fontWeight: 500, color: "text.secondary", whiteSpace: "nowrap" }}
      >
        {new Date().toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </Typography>
    </Box>
  );
}
