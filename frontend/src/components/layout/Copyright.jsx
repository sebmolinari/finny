import Typography from "@mui/material/Typography";
import changelog from "../../assets/CHANGELOG.md?raw";

const version = changelog.match(/##\s+\[([^\]]+)\]/)?.[1] ?? "?";

export default function Copyright(props) {
  return (
    <Typography
      variant="caption"
      align="center"
      {...props}
      sx={[
        {
          color: "text.disabled",
          display: "block",
        },
        ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
      ]}
    >
      {"© "}
      {new Date().getFullYear()}
      {` Finny · Portfolio Manager · v${version}`}
    </Typography>
  );
}
