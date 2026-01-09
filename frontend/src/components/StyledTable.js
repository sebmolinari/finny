import React from "react";
import { Table, TableCell, TableRow } from "@mui/material";

// Styled table with consistent size
export const StyledTable = ({ children, ...props }) => {
  return (
    <Table size="small" {...props}>
      {children}
    </Table>
  );
};

// Styled header cell with gray background
export const StyledHeaderCell = ({ children, sx = {}, ...props }) => {
  return (
    <TableCell
      sx={{
        backgroundColor: "#f5f5f5",
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

// Styled header row with gray background
export const StyledHeaderRow = ({ children, sx = {}, ...props }) => {
  return (
    <TableRow
      sx={{
        backgroundColor: "#f5f5f5",
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableRow>
  );
};

// Truncated cell for text that might overflow
export const TruncatedCell = ({
  children,
  title,
  maxWidth,
  sx = {},
  ...props
}) => {
  return (
    <TableCell
      sx={{
        maxWidth,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        ...sx,
      }}
      title={title || (typeof children === "string" ? children : "")}
      {...props}
    >
      {children}
    </TableCell>
  );
};

// Compact actions cell with reduced padding
export const ActionsCell = ({ children, sx = {}, ...props }) => {
  return (
    <TableCell
      sx={{
        whiteSpace: "nowrap",
        padding: "6px 8px",
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};
