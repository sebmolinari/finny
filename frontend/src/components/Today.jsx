import Typography from "@mui/material/Typography";

// TODO: use a date library to format the date in a more user-friendly way
export default function Today() {
  return (
    <Typography variant="body1" sx={{ alignSelf: "center" }}>
      {new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
    </Typography>
  );
}
