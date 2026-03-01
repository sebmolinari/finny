import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";

// Standard Card with optional custom styling
export const StyledCard = ({ children, sx = {}, ...props }) => {
  return (
    <Card sx={{ ...sx }} {...props}>
      {children}
    </Card>
  );
};

// Metric Card - displays a single key metric with label, icon, and value
export const MetricCard = ({
  label,
  value,
  icon,
  valueColor,
  subtitle,
  valueFontWeight = 700,
  sx = {},
  ...props
}) => {
  return (
    <StyledCard sx={{ height: "100%", ...sx }} {...props}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          {icon && (
            <Box sx={{ mr: 1, display: "flex", alignItems: "center" }}>
              {icon}
            </Box>
          )}
          <Typography
            color="text.secondary"
            variant="caption"
            sx={{
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </Typography>
        </Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: valueFontWeight,
            color: valueColor || "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </Typography>
        {subtitle && <Box sx={{ mt: 0.75 }}>{subtitle}</Box>}
      </CardContent>
    </StyledCard>
  );
};

// Stat Card - displays label and value in a compact format
export const StatCard = ({ label, value, valueColor, sx = {}, ...props }) => {
  return (
    <StyledCard sx={{ ...sx }} {...props}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Typography
          color="text.secondary"
          variant="caption"
          sx={{
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
          gutterBottom
        >
          {label}
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: valueColor || "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </StyledCard>
  );
};
