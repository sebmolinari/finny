import React from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";

export default function StyledDataGrid(props) {
  const { disableToolbar = false } = props;

  const defaultSx = {
    border: "none",
    fontSize: 13,

    /* Header */
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: "#f5f5f5",
      borderBottom: "1px solid rgba(0,0,0,0.08)",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontWeight: 600,
    },

    /* Cells */
    "& .MuiDataGrid-cell": {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      padding: "6px 8px",
      borderRight: "none", // ⬅ remove vertical lines
    },

    /* 🔥 REMOVE ALL VERTICAL COLUMN LINES */
    "& .MuiDataGrid-columnSeparator": {
      display: "none",
    },
    "& .MuiDataGrid-columnHeader--withRightBorder": {
      borderRight: "none",
    },
    "& .MuiDataGrid-cell--withRightBorder": {
      borderRight: "none",
    },

    /* Rows */
    "& .MuiDataGrid-row": {
      maxHeight: 40,
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: "rgba(0,0,0,0.02)",
    },
  };

  const gridProps = {
    density: "compact",
    headerHeight: 40,
    rowHeight: 40,

    showColumnVerticalBorder: false, // ⬅ IMPORTANT

    ...props,
    sx: [defaultSx, props.sx],
  };

  if (!disableToolbar) {
    gridProps.slots = { toolbar: GridToolbar, ...(props.slots || {}) };
    gridProps.slotProps = {
      toolbar: {
        showQuickFilter: true,
        quickFilterProps: { debounceMs: 300 },
        ...(props.slotProps?.toolbar || {}),
      },
      ...(props.slotProps || {}),
    };
  }

  return <DataGrid {...gridProps} />;
}
