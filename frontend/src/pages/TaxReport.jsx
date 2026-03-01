import React, { useState, useEffect, useCallback } from "react";
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
} from "@mui/material";
import { Preview as PreviewIcon } from "@mui/icons-material";
import { analyticsAPI, assetAPI, brokerAPI, settingsAPI } from "../api/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { formatDate } from "../utils/dateUtils";

import { handleApiError } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatNumber";
import StyledDataGrid from "../components/StyledDataGrid";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export default function TaxReport() {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [assetTypes, setAssetTypes] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [excludeAssetTypes, setExcludeAssetTypes] = useState([]);
  const [excludeBrokers, setExcludeBrokers] = useState([]);
  const [userDateFormat, setUserDateFormat] = useState(null);
  const [userSettingsLoading, setUserSettingsLoading] = useState(true);

  // Load user settings
  const loadUserSettings = useCallback(async () => {
    setUserSettingsLoading(true);
    try {
      const res = await settingsAPI.get();
      setUserDateFormat(res.data.date_format);
    } catch (error) {
      setUserDateFormat(null);
    } finally {
      setUserSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConstants();
    loadBrokers();
    loadUserSettings();
  }, [loadUserSettings]);

  const loadConstants = async () => {
    try {
      const response = await assetAPI.getAll();
      // Extract unique asset types
      const uniqueTypes = [...new Set(response.data.map((a) => a.asset_type))];
      setAssetTypes(uniqueTypes);
    } catch (error) {
      console.error("Error loading asset types:", error);
    }
  };

  const loadBrokers = async () => {
    try {
      const response = await brokerAPI.getAll();
      setBrokers(response.data);
    } catch (error) {
      console.error("Error loading brokers:", error);
    }
  };

  const handlePreview = async () => {
    if (!year) {
      setError("Please enter a year");
      return;
    }

    setLoadingReport(true);
    setError(null);
    setReportData(null);

    try {
      const response = await analyticsAPI.getTaxReport(
        year,
        excludeAssetTypes,
        excludeBrokers,
      );
      setReportData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tax report");
      handleApiError(err, "Failed to load tax report");
    } finally {
      setLoadingReport(false);
    }
  };

  const columns = [
    {
      field: "asset",
      headerName: "Asset",
      headerAlign: "center",
      width: 80,
    },
    {
      field: "asset_name",
      headerName: "Name",
      headerAlign: "center",
      width: 150,
    },
    {
      field: "asset_type",
      headerName: "Type",
      headerAlign: "center",
      width: 100,
    },
    {
      field: "broker",
      headerName: "Broker",
      headerAlign: "center",
      width: 100,
    },
    {
      field: "quantity",
      headerName: "Quantity",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => Number(p.row.quantity).toFixed(4),
    },
    {
      field: "price",
      headerName: "Price (USD)",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => formatCurrency(p.row.price),
    },
    {
      field: "market_value",
      headerName: "Market Value (USD)",
      headerAlign: "center",
      align: "right",
      minWidth: 150,
      flex: 1,
      renderCell: (p) => formatCurrency(p.row.market_value),
    },
    {
      field: "usdars_bna",
      headerName: "FX Rate",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => Number(p.row.usdars_bna).toFixed(2),
    },
    {
      field: "price_in_ccy",
      headerName: "Price (CCY)",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (p) => formatCurrency(p.row.price_in_ccy),
    },
    {
      field: "market_value_in_ccy",
      headerName: "Market Value (CCY)",
      headerAlign: "center",
      align: "right",
      minWidth: 150,
      flex: 1,
      renderCell: (p) => formatCurrency(p.row.market_value_in_ccy),
    },
  ];

  if (loadingReport || userSettingsLoading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <PageContainer
      title="Tax Report"
      subtitle="Capital gains & year-end holdings"
    >
      <Paper sx={{ p: 3, ...fadeInUpSx(1) }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Generate a tax report showing your holdings at year-end with values
          converted to local currency using the configured FX rate
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            type="number"
            label="Year"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            slotProps={{ min: 2000, max: 2100 }}
            sx={{ width: 150 }}
          />

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Exclude Asset Types</InputLabel>
            <Select
              multiple
              value={excludeAssetTypes}
              onChange={(e) => setExcludeAssetTypes(e.target.value)}
              input={<OutlinedInput label="Exclude Asset Types" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {assetTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Exclude Brokers</InputLabel>
            <Select
              multiple
              value={excludeBrokers}
              onChange={(e) => setExcludeBrokers(e.target.value)}
              input={<OutlinedInput label="Exclude Brokers" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {brokers.map((broker) => (
                <MenuItem key={broker.id} value={broker.name}>
                  {broker.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
          <Button
            variant="contained"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            disabled={!year}
          >
            Preview Report
          </Button>
        </Box>

        {loadingReport && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {reportData && !loadingReport && (
          <>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Report for Year {reportData.year}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Year-End Date:{" "}
                {formatDate(reportData.year_end_date, userDateFormat)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                FX Rate Asset: {reportData.fx_rate_asset} ={" "}
                {reportData.fx_rate.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Total Market Value (USD):{" "}
                {formatCurrency(reportData.total_market_value)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Market Value (Local CCY):{" "}
                {formatCurrency(reportData.total_market_value_in_ccy)}
              </Typography>
            </Box>

            <Paper sx={{ width: "100%", mb: 2 }}>
              <div style={{ width: "100%" }}>
                <StyledDataGrid
                  label="Holdings"
                  rows={reportData.holdings.map((h, i) => ({
                    ...h,
                    id: h.id ?? `${h.asset}-${h.broker || "nobroker"}-${i}`,
                  }))}
                  columns={columns}
                  loading={loadingReport}
                  getRowId={(row) => row.id}
                />
              </div>
            </Paper>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 3,
                mt: 1,
              }}
            >
              <Typography variant="subtitle2">
                Total Market Value (USD):
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold">
                {formatCurrency(reportData.total_market_value)}
              </Typography>
              <Typography variant="subtitle2" sx={{ ml: 3 }}>
                Total Market Value (Local CCY):
              </Typography>
              <Typography variant="subtitle2" fontWeight="bold">
                {formatCurrency(reportData.total_market_value_in_ccy)}
              </Typography>
            </Box>

            {reportData.holdings.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No holdings found for the specified year.
              </Alert>
            )}
          </>
        )}
      </Paper>
    </PageContainer>
  );
}
