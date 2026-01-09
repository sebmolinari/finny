import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import { analyticsAPI } from "../api/api";
import { formatCurrency, formatNumber } from "../utils/formatNumber";
import { StyledTable, StyledHeaderCell } from "../components/StyledTable";
import { StatCard } from "../components/StyledCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ReturnsDetails() {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await analyticsAPI.getReturnDetails();
      setDetails(res.data);
    };
    load();
  }, []);

  if (!details) {
    return <LoadingSpinner maxWidth="lg" />;
  }

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Return Calculations (MWRR & CAGR)
      </Typography>

      {/* Portfolio Totals */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <StatCard
            label="Holdings Market Value"
            value={formatCurrency(holdings_market_value)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard label="Cash Balance" value={formatCurrency(cash_balance)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <StatCard
            label="NAV (Net Asset Value)"
            value={formatCurrency(current_total_value)}
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
          <StatCard
            label="MWRR"
            value={`${formatNumber(mwrr, 2)}%`}
            sx={{ flex: 1, minWidth: 280 }}
          />
          <StatCard
            label="Cash Flows Count"
            value={mwrr_cash_flows.length}
            sx={{ flex: 1, minWidth: 280 }}
          />
          <StatCard
            label="Iterations"
            value={mwrr_iterations.length}
            sx={{ flex: 1, minWidth: 280 }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Cash Flows Used
        </Typography>
        <TableContainer>
          <StyledTable>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Date</StyledHeaderCell>
                <StyledHeaderCell>Type</StyledHeaderCell>
                <StyledHeaderCell align="right">Amount</StyledHeaderCell>
                <StyledHeaderCell align="right">Years Since</StyledHeaderCell>
                <StyledHeaderCell align="right">Signed Amount</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mwrr_cash_flows.map((cf, idx) => (
                <TableRow key={idx}>
                  <TableCell>{cf.date}</TableCell>
                  <TableCell>{cf.type}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(cf.amount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(cf.yearsSinceStart, 4)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(cf.signedAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StyledTable>
        </TableContainer>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Newton-Raphson Iterations
        </Typography>
        <TableContainer>
          <StyledTable>
            <TableHead>
              <TableRow>
                <StyledHeaderCell>Iteration</StyledHeaderCell>
                <StyledHeaderCell align="right">
                  Rate (decimal)
                </StyledHeaderCell>
                <StyledHeaderCell align="right">NPV</StyledHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mwrr_iterations.map((it) => (
                <TableRow key={it.iteration}>
                  <TableCell>{it.iteration}</TableCell>
                  <TableCell align="right">
                    {formatNumber(it.rate, 6)}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(it.npv)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </StyledTable>
        </TableContainer>
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
          <Grid item xs={12} md={3}>
            <StatCard label="CAGR" value={`${formatNumber(cagr, 2)}%`} />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              label="First Deposit Date"
              value={cagr_details.firstDate || "—"}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              label="Years"
              value={formatNumber(cagr_details.years, 4)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              label="Net Deposits"
              value={formatCurrency(cagr_details.netDeposits)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              label="Ending Value"
              value={formatCurrency(cagr_details.endingValue)}
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

          <TableContainer>
            <StyledTable>
              <TableHead>
                <TableRow>
                  <StyledHeaderCell>Year</StyledHeaderCell>
                  <StyledHeaderCell align="right">
                    MTM (Mark-to-Market)
                  </StyledHeaderCell>
                  <StyledHeaderCell align="right">
                    CAGR from Year 1
                  </StyledHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cagr_evolution.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell>{row.year}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(row.mtm)}
                    </TableCell>
                    <TableCell align="right">
                      {row.cagr !== null
                        ? formatNumber(row.cagr, 2) + "%"
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </StyledTable>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}
