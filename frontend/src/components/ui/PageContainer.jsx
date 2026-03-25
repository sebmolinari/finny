import React from "react";
import { Box, Container, Typography, Stack } from "@mui/material";
import { fadeInUpSx } from "../../utils/animations";

/**
 * PageContainer — consistent page-level wrapper used by all inner pages.
 *
 * Props:
 *   title       (string)  — page heading (optional)
 *   subtitle    (string)  — secondary label below title (optional)
 *   actions     (node)    — buttons / controls rendered top-right (optional)
 *   maxWidth    (string)  — MUI Container maxWidth (default "xl")
 *   children    (node)    — page content
 */
export default function PageContainer({
  title,
  subtitle,
  actions,
  maxWidth = "xl",
  children,
}) {
  return (
    <Container maxWidth={maxWidth} sx={{ pt: 0.5, pb: 4 }}>
      {(title || actions) && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{
            alignItems: { sm: "flex-end" },
            justifyContent: title ? "space-between" : "flex-end",
            mb: 3,
            gap: 1.5,
            ...fadeInUpSx(0),
          }}
        >
          {title && (
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.3,
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.25 }}
                >
                  {subtitle}
                </Typography>
              )}
            </Box>
          )}
          {actions && (
            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              {actions}
            </Stack>
          )}
        </Stack>
      )}
      {children}
    </Container>
  );
}
