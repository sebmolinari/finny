import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { StyledDataGridToolbar } from "./StyledDataGridToolbar";
import { Box } from "@mui/material";
import { fadeInUpSx } from "../utils/animations";

export default function StyledDataGrid(props) {
  const { disableToolbar = false, label, animIndex = 1 } = props;

  const defaultSx = {
    border: "none",
    fontSize: 13,
    "& .MuiDataGrid-root": { border: "none" },

    /* Column headers */
    "& .MuiDataGrid-columnHeaders": {
      borderBottom: "1px solid",
      borderColor: "divider",
    },
    "& .MuiDataGrid-columnHeader": {
      backgroundColor: "action.hover",
      "&:focus, &:focus-within": { outline: "none" },
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontWeight: 700,
      fontSize: "0.75rem",
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: "text.secondary",
    },
    "& .MuiDataGrid-sortIcon": { opacity: 1 },

    /* Cells */
    "& .MuiDataGrid-cell": {
      display: "flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      padding: "0 10px",
      borderColor: "divider",
      "&:focus, &:focus-within": { outline: "none" },
    },

    /* Rows */
    "& .MuiDataGrid-row": {
      transition: "background-color 0.12s ease",
      "&:hover": {
        backgroundColor: "action.hover",
      },
      "&.Mui-selected": {
        backgroundColor: "rgba(37,99,235,0.07)",
        "&:hover": { backgroundColor: "rgba(37,99,235,0.11)" },
      },
    },

    /* Footer */
    "& .MuiDataGrid-footerContainer": {
      borderTop: "1px solid",
      borderColor: "divider",
      minHeight: 44,
    },

    /* Misc */
    "& .MuiDataGrid-filler": { display: "none" },
    "& .MuiDataGrid-scrollbarFiller": { display: "none" },
    "& .MuiDataGrid-overlay": { bgcolor: "background.paper" },
  };

  const gridProps = {
    columnHeaderHeight: 40,
    rowHeight: 42,
    autoHeight: true,
    disableRowSelectionOnClick: true,
    ...props,
    initialState: {
      density: "compact",
      ...(props.initialState || {}),
    },
    sx: [defaultSx, props.sx],
  };

  if (!disableToolbar) {
    gridProps.showToolbar = true;
    gridProps.slots = {
      toolbar: StyledDataGridToolbar,
      ...(props.slots || {}),
    };
    gridProps.slotProps = {
      ...(props.slotProps || {}),
      toolbar: {
        label,
        ...(props.slotProps?.toolbar || {}),
      },
    };
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        ...fadeInUpSx(animIndex),
      }}
    >
      <DataGrid {...gridProps} />
    </Box>
  );
}
