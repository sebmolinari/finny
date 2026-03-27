import Typography from "@mui/material/Typography";
import { useMatches } from "react-router-dom";

export default function NavbarBreadcrumbs() {
  const matches = useMatches();
  const match = [...matches].reverse().find((m) => m.handle?.title);
  const title = match?.handle?.title ?? "Finny";

  return (
    <Typography
      variant="h6"
      sx={{ fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}
    >
      {title}
    </Typography>
  );
}
