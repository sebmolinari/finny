import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { StyledDataGridToolbar } from "./StyledDataGridToolbar";

export default function StyledDataGrid(props) {
  const { disableToolbar = false, label } = props;

  const defaultSx = {
    fontSize: 13,

    /* Header */
    "& .MuiDataGrid-columnHeader": {
      backgroundColor: "action.hover",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontWeight: "bold",
    },
    /* Cells */
    "& .MuiDataGrid-cell": {
      display: "flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      padding: "6px 8px",
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: "rgba(0,0,0,0.02)",
    },
  };
  const gridProps = {
    columnHeaderHeight: 40,
    rowHeight: 40,
    autoHeight: true,
    disableRowSelectionOnClick: true,

    ...props,

    initialState: {
      density: "compact", //compact, standard, comfortable
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

  return <DataGrid {...gridProps} />;
}
