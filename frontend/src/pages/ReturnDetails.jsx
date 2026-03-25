import { useEffect, useState, useCallback } from "react";
import { Typography, Paper, Box, Grid, Divider, Alert, Button } from "@mui/material";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatNumber } from "../utils/formatNumber";
import StyledDataGrid from "../components/StyledDataGrid";
import PageContainer from "../components/PageContainer";
import { fadeInUpSx } from "../utils/animations";
import { useTheme } from "@mui/material/styles";
import { CompactCard } from "../components/StyledCard";
import { formatDate } from "../utils/dateUtils";
import LoadingSpinner from "../components/LoadingSpinner";
import { useUserSettings } from "../hooks/useUserSettings";

export default function ReturnDetails() {
  const theme = useTheme();
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { dateFormat, settingsLoading } = useUserSettings();

  // Load return details
  const loadDetails = useCallback(async () => {
    setDetailsLoading(true);
    try {
      const res = await analyticsAPI.getReturnDetails();
      setDetails(res.data);
    } catch (err) {
      console.error("Error loading return details:", err);
      setError("Failed to load data. Please try again.");
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  if (detailsLoading || settingsLoading || !details) {
    return <LoadingSpinner maxWidth="lg" />;
  }

  if (error) {
    return (
      <PageContainer>
        <Alert severity="error" action={<Button onClick={loadDetails}>Retry</Button>}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  const columnsMwrrCashFlows = [
    {
      field: "date",
      headerName: "Date",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) =>
        formatDate(params.row.date, dateFormat),
    },
    { field: "type", headerName: "Type", headerAlign: "center", width: 120 },
    {
      field: "amount",
      headerName: "Amount",
      headerAlign: "center",
      flex: 1,
      align: "right",
      renderCell: (params) => formatCurrency(params.row.amount),
    },
    {
      field: "yearsSinceStart",
      headerName: "Years Since",
      headerAlign: "center",
      flex: 1,
      align: "right",
      renderCell: (params) => formatNumber(params.row.yearsSinceStart, 4),
    },
    {
      field: "signedAmount",
      headerName: "Signed Amount",
      headerAlign: "center",
      flex: 1,
      align: "right",
      renderCell: (params) => {
        const val = params.row.signedAmount;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        return <span style={{ color }}>{formatCurrency(val)}</span>;
      },
    },
  ];

  const columnsMwrrIterations = [
    { field: "iteration", headerName: "Iteration", flex: 1 },
    {
      field: "rate",
      headerName: "Rate (decimal)",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => formatNumber(params.row.rate, 6),
    },
    {
      field: "npv",
      headerName: "NPV",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => {
        const val = params.row.npv;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        return <span style={{ color }}>{formatCurrency(val)}</span>;
      },
    },
  ];

  const columnsCagrEvolution = [
    { field: "year", headerName: "Year", headerAlign: "center", flex: 1 },
    {
      field: "mtm",
      headerName: "MTM (Mark-to-Market)",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) => {
        const val = params.row.mtm;
        const color =
          val >= 0 ? theme.palette.success.main : theme.palette.error.main;
        return <span style={{ color }}>{formatCurrency(val)}</span>;
      },
    },
    {
      field: "cagr",
      headerName: "CAGR from Year 1",
      headerAlign: "center",
      align: "right",
      flex: 1,
      renderCell: (params) =>
        params.row.cagr !== null ? formatNumber(params.row.cagr, 2) + "%" : "—",
    },
  ];

  const {
    current_total_value,
    cash_balance,
    holdings_market_value,
    mwrr,
    mwrr_cash_flows,
    cagr_evolution,
    mwrr_iterations,
    cagr,
    cagr_details,
  } = details;

  return (
    <PageContainer>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <CompactCard
            title="Net Asset Value"
            value={formatCurrency(current_total_value)}
            valueColor={theme.palette.primary.main}
            sx={{ ...fadeInUpSx(1) }}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <CompactCard
            title="Cash Balance"
            value={formatCurrency(cash_balance)}
            valueColor={theme.palette.primary.main}
            sx={{ ...fadeInUpSx(2) }}
          />
        </Grid>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <CompactCard
            title="Holdings Market Value"
            value={formatCurrency(holdings_market_value)}
            valueColor={theme.palette.primary.main}
            sx={{ ...fadeInUpSx(3) }}
          />
        </Grid>
      </Grid>
      {/* MWRR Details */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          MWRR (Money-Weighted Rate of Return)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          MWRR is the internal rate of return (IRR) that sets the net present
          value (NPV) of all cash flows to zero. We use deposits as negative
          cash flows (money invested) and withdrawals as positive cash flows
          (money returned), with the current portfolio value treated as a final
          positive cash flow today.
        </Typography>

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <CompactCard
            title="MWRR"
            value={`${formatNumber(mwrr, 2)}%`}
            sx={{ flex: 1, minWidth: 280 }}
            valueColor={
              mwrr >= 0 ? theme.palette.success.main : theme.palette.error.main
            }
          />
          <CompactCard
            title="Cash Flows Count"
            value={mwrr_cash_flows.length}
            sx={{ flex: 1, minWidth: 280 }}
          />
          <CompactCard
            title="Iterations"
            value={mwrr_iterations.length}
            sx={{ flex: 1, minWidth: 280 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />
        <StyledDataGrid
          label="Cash Flows Used"
          rows={mwrr_cash_flows.map((r, i) => ({
            ...r,
            id: r.id ?? `${r.date}-${r.type}-${i}`,
          }))}
          loading={detailsLoading}
          columns={columnsMwrrCashFlows}
          pageSize={25}
          rowsPerPageOptions={[25, 50]}
        />

        <Divider sx={{ my: 2 }} />
        <StyledDataGrid
          rows={mwrr_iterations}
          columns={columnsMwrrIterations}
          loading={detailsLoading}
          getRowId={(row) => row.iteration}
          pageSize={25}
          rowsPerPageOptions={[25, 50]}
          disableToolbar
        />
      </Paper>
      {/* CAGR Details */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          CAGR (Compound Annual Growth Rate)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          CAGR measures annualized growth from the first year-end to the current
          year-end, based on mark-to-market (MTM) portfolio values. We calculate
          the portfolio value at each year-end (cash + holdings at latest
          prices) and apply the formula: (Latest Year MTM / First Year
          MTM)^(1/years) - 1. This matches the final year in the evolution table
          below.
        </Typography>

        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              md: 3,
            }}
          >
            <CompactCard
              title="CAGR"
              value={`${formatNumber(cagr, 2)}%`}
              valueColor={
                cagr >= 0
                  ? theme.palette.success.main
                  : theme.palette.error.main
              }
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 3,
            }}
          >
            <CompactCard
              title="First Deposit Date"
              value={cagr_details.firstDate || "—"}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 3,
            }}
          >
            <CompactCard
              title="Years"
              value={formatNumber(cagr_details.years, 4)}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 3,
            }}
          >
            <CompactCard
              title="Net Deposits"
              value={formatCurrency(cagr_details.netDeposits)}
              valueColor={theme.palette.primary.main}
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              md: 3,
            }}
          >
            <CompactCard
              title="Ending Value"
              value={formatCurrency(cagr_details.endingValue)}
              valueColor={theme.palette.primary.main}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Formula</Typography>
          <Typography variant="body2">{cagr_details.formula}</Typography>
        </Box>
      </Paper>
      {/* CAGR Evolution */}
      {cagr_evolution && cagr_evolution.length > 0 && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            CAGR Evolution (Year-over-Year)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This table shows the portfolio's mark-to-market value at the end of
            each calendar year and the annualized CAGR growth rate from the
            first year to each subsequent year. Note: Uses latest prices for
            year-end holdings; historical accuracy limited without EOY price
            data.
          </Typography>

          <StyledDataGrid
            rows={cagr_evolution}
            columns={columnsCagrEvolution}
            getRowId={(row) => row.year}
            pageSize={25}
            rowsPerPageOptions={[25, 50]}
          />
        </Paper>
      )}
    </PageContainer>
  );
}
