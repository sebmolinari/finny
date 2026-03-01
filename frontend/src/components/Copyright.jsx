import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

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
      {" Finny · Portfolio Manager"}
    </Typography>
  );
}
