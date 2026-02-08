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

// Metric Card - displays a single key metric with label and value
export const MetricCard = ({
  label,
  value,
  icon,
  valueColor,
  subtitle,
  sx = {},
  ...props
}) => {
  return (
    <StyledCard sx={sx} {...props}>
      <CardContent>
        {icon && (
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            {icon}
            <Typography color="text.secondary" variant="body2" sx={{ ml: 1 }}>
              {label}
            </Typography>
          </Box>
        )}
        {!icon && (
          <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
            {label}
          </Typography>
        )}
        <Typography variant="h5" color={valueColor || "inherit"}>
          {value}
        </Typography>
        {subtitle && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </StyledCard>
  );
};

// Stat Card - displays label and value in a compact format
export const StatCard = ({ label, value, valueColor, sx = {}, ...props }) => {
  return (
    <StyledCard sx={sx} {...props}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom>
          {label}
        </Typography>
        <Typography variant="h5" color={valueColor || "inherit"}>
          {value}
        </Typography>
      </CardContent>
    </StyledCard>
  );
};
