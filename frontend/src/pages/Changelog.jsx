import { Paper, Box } from "@mui/material";
import PageContainer from "../components/PageContainer";
import ReactMarkdown from "react-markdown";
import changelog from "../assets/CHANGELOG.md?raw";
import { fadeInUpSx } from "../utils/animations";

export default function Changelog() {
  return (
    <PageContainer maxWidth="md">
      <Paper sx={{ p: 3, ...fadeInUpSx(1) }}>
        <Box sx={{ fontSize: "0.95rem" }}>
          <ReactMarkdown>{changelog}</ReactMarkdown>
        </Box>
      </Paper>
    </PageContainer>
  );
}
