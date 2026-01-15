import React, { useEffect, useState } from "react";
import { Container, Paper, Box } from "@mui/material";
import ReactMarkdown from "react-markdown";

export default function Changelog() {
  const [changelog, setChangelog] = useState("");

  useEffect(() => {
    fetch("/CHANGELOG.md")
      .then((res) => res.text())
      .then(setChangelog)
      .catch(() => setChangelog("Unable to load changelog."));
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ fontSize: "0.95rem" }}>
          <ReactMarkdown children={changelog} />
        </Box>
      </Paper>
    </Container>
  );
}
