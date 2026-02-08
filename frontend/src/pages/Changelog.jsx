import { Container, Paper, Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import changelog from "../assets/CHANGELOG.md?raw";

export default function Changelog() {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ fontSize: "0.95rem" }}>
          <ReactMarkdown>{changelog}</ReactMarkdown>
        </Box>
      </Paper>
    </Container>
  );
}
