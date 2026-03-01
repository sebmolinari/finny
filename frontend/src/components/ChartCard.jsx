import React from "react";
import { Card, CardContent, Box, Typography, Stack } from "@mui/material";
import { fadeInUpSx } from "../utils/animations";

/**
 * ChartCard — consistent chart container used across all chart components.
 *
 * Props:
 *   title         (string)   — chart title
 *   subtitle      (string)   — optional subtitle / caption
 *   actions       (node)     — optional controls rendered top-right
 *   height        (number)   — chart area height (default 300)
 *   animIndex     (number)   — stagger animation index (default 1)
 *   children      (node)     — the chart itself
 *   sx            (object)   — extra sx overrides
 */
export default function ChartCard({
  title,
  subtitle,
  actions,
  height = 300,
  animIndex = 1,
  children,
  sx = {},
}) {
  return (
    <Card
      sx={{ mt: 2.5, overflow: "visible", ...fadeInUpSx(animIndex), ...sx }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        {(title || actions) && (
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Box>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
          </Stack>
        )}
        <Box sx={{ height }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
