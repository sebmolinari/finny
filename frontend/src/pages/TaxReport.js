import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
import {
  StyledTable,
  StyledHeaderCell,
  TruncatedCell,
} from "../components/StyledTable";

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

  if (loadingReport || userSettingsLoading) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Tax Report
      </Typography>
      <Paper sx={{ p: 3 }}>
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
            inputProps={{ min: 2000, max: 2100 }}
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

            <TableContainer>
              <StyledTable>
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell sx={{ width: 100 }}>
                      Asset
                    </StyledHeaderCell>
                    <StyledHeaderCell sx={{ width: 150 }}>
                      Name
                    </StyledHeaderCell>
                    <StyledHeaderCell sx={{ width: 80 }}>Type</StyledHeaderCell>
                    <StyledHeaderCell sx={{ width: 120 }}>
                      Broker
                    </StyledHeaderCell>
                    <StyledHeaderCell align="right" sx={{ width: 100 }}>
                      Quantity
                    </StyledHeaderCell>
                    <StyledHeaderCell align="right" sx={{ width: 110 }}>
                      Price (USD)
                    </StyledHeaderCell>
                    <StyledHeaderCell align="right" sx={{ width: 140 }}>
                      Market Value (USD)
                    </StyledHeaderCell>
                    <StyledHeaderCell align="right" sx={{ width: 90 }}>
                      FX Rate
                    </StyledHeaderCell>
                    <StyledHeaderCell align="right" sx={{ width: 110 }}>
                      Price (CCY)
                    </StyledHeaderCell>
                    <StyledHeaderCell align="right" sx={{ width: 140 }}>
                      Market Value (CCY)
                    </StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.holdings.map((holding, index) => (
                    <TableRow key={index}>
                      <TruncatedCell maxWidth={100} title={holding.asset}>
                        {holding.asset}
                      </TruncatedCell>
                      <TruncatedCell maxWidth={150} title={holding.asset_name}>
                        {holding.asset_name}
                      </TruncatedCell>
                      <TableCell>{holding.asset_type}</TableCell>
                      <TruncatedCell
                        maxWidth={120}
                        title={holding.broker || "N/A"}
                      >
                        {holding.broker || "N/A"}
                      </TruncatedCell>
                      <TableCell align="right">
                        {holding.quantity.toFixed(4)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(holding.price)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(holding.market_value)}
                      </TableCell>
                      <TableCell align="right">
                        {holding.usdars_bna.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(holding.price_in_ccy)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(holding.market_value_in_ccy)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ backgroundColor: "action.hover" }}>
                    <TableCell colSpan={6} sx={{ fontWeight: "bold" }}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {formatCurrency(reportData.total_market_value)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold" }}>
                      {formatCurrency(reportData.total_market_value_in_ccy)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </StyledTable>
            </TableContainer>

            {reportData.holdings.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No holdings found for the specified year.
              </Alert>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
}
