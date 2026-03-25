import { Paper, Box } from "@mui/material";
import PageContainer from "../components/layout/PageContainer";
import ReactMarkdown from "react-markdown";
import changelog from "../assets/CHANGELOG.md?raw";
import { fadeInUpSx } from "../utils/animations";

const mdSx = {
  "& h1": { fontSize: "1.25rem", fontWeight: 700, mt: 0, mb: 1.5, lineHeight: 1.4 },
  "& h2": { fontSize: "0.95rem", fontWeight: 700, mt: 2.5, mb: 0.75, lineHeight: 1.4 },
  "& h3": { fontSize: "0.875rem", fontWeight: 600, mt: 2, mb: 0.5 },
  "& p": { fontSize: "0.875rem", mt: 0, mb: 0.75, lineHeight: 1.6 },
  "& li": { fontSize: "0.875rem", lineHeight: 1.6 },
  "& ul, & ol": { pl: 2.5, mt: 0, mb: 0.75 },
  "& hr": { my: 2, borderColor: "divider" },
};

export default function Changelog() {
  return (
    <PageContainer maxWidth="md">
      <Paper sx={{ p: 3, ...fadeInUpSx(1) }}>
        <Box sx={mdSx}>
          <ReactMarkdown>{changelog}</ReactMarkdown>
        </Box>
      </Paper>
    </PageContainer>
  );
}
