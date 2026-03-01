import Typography from "@mui/material/Typography";

export default function Today() {
  const now = new Date();
  const formatted = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Typography
      variant="body2"
      sx={{ color: "text.secondary", whiteSpace: "nowrap", userSelect: "none" }}
    >
      {formatted}
    </Typography>
  );
}
