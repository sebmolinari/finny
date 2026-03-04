import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Chip,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  EventNote as EventNoteIcon,
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { analyticsAPI } from "../api/api";
import { formatCurrency } from "../utils/formatNumber";
import PageContainer from "../components/PageContainer";
import StyledDataGrid from "../components/StyledDataGrid";
import { fadeInUpSx } from "../utils/animations";
import { StyledCard } from "../components/StyledCard";

const EVENT_CONFIG = {
  earnings: {
    label: "Earnings",
    color: "primary",
    icon: <TrendingUpIcon fontSize="small" />,
  },
  earnings_call: {
    label: "Earnings Call",
    color: "info",
    icon: <TrendingUpIcon fontSize="small" />,
  },
  dividend_ex_date: {
    label: "Ex-Dividend",
    color: "success",
    icon: <AttachMoneyIcon fontSize="small" />,
  },
  dividend_payment: {
    label: "Dividend Payment",
    color: "warning",
    icon: <AttachMoneyIcon fontSize="small" />,
  },
};

const today = new Date().toISOString().split("T")[0];

export default function EconomicCalendar() {
  const theme = useTheme();
  const [events, setEvents] = useState([]);
  const [fundStats, setFundStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsAPI.getEconomicCalendar();
      setEvents(res.data.events ?? []);
      setFundStats(res.data.fund_stats ?? []);
    } catch (err) {
      setError("Failed to load economic calendar. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const columns = [
    {
      field: "date",
      headerName: "Date",
      width: 120,
      headerAlign: "center",
      renderCell: (params) => {
        const isPast = params.value < today;
        return (
          <Typography
            variant="body2"
            sx={{
              color: isPast ? "text.disabled" : "text.primary",
              fontWeight: 500,
            }}
          >
            {params.value}
          </Typography>
        );
      },
    },
    {
      field: "symbol",
      headerName: "Symbol",
      width: 100,
      headerAlign: "center",
      renderCell: (params) => (
        <Chip label={params.value} size="small" variant="outlined" />
      ),
    },
    {
      field: "type",
      headerName: "Event Type",
      width: 160,
      headerAlign: "center",
      renderCell: (params) => {
        const cfg = EVENT_CONFIG[params.value] ?? {
          label: params.value,
          color: "default",
        };
        return (
          <Chip
            label={cfg.label}
            size="small"
            color={cfg.color}
            variant="filled"
          />
        );
      },
    },
    {
      field: "description",
      headerName: "Description",
      flex: 1,
      headerAlign: "left",
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography variant="body2">{params.value}</Typography>
          {params.row.is_estimate && (
            <Chip
              label="est."
              size="small"
              variant="outlined"
              color="default"
              sx={{
                height: 16,
                fontSize: 10,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
        </Box>
      ),
    },
    {
      field: "eps_estimate",
      headerName: "EPS Est.",
      width: 130,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        if (params.value == null) {
          // Show dividend amount here for non-earnings events
          const amt = params.row.amount;
          return amt != null ? (
            <Typography
              variant="body2"
              sx={{ color: theme.palette.success.main, fontWeight: 500 }}
            >
              {formatCurrency(amt)}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          );
        }
        const low = params.row.eps_low;
        const high = params.row.eps_high;
        const rangeText =
          low != null && high != null
            ? `Range: $${low.toFixed(2)} – $${high.toFixed(2)}`
            : "";
        return (
          <Tooltip title={rangeText} arrow>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 500,
                cursor: rangeText ? "help" : "default",
              }}
            >
              ${params.value.toFixed(2)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      field: "revenue_estimate",
      headerName: "Rev. Est.",
      width: 130,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        if (params.value == null)
          return (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          );
        const billions = params.value / 1e9;
        return (
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            ${billions.toFixed(1)}B
          </Typography>
        );
      },
    },
  ];

  const rows = events.map((e, i) => ({ ...e, id: i }));

  return (
    <PageContainer>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {events.length === 0 && fundStats.length === 0 ? (
            <Box sx={fadeInUpSx(2)}>
              <StyledCard>
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <EventNoteIcon
                    sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                  />
                  <Typography color="text.secondary">
                    No calendar events found for your current holdings.
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    Yahoo Finance may not have calendar data for all asset types
                    (crypto, real estate, etc.).
                  </Typography>
                </Box>
              </StyledCard>
            </Box>
          ) : (
            <>
              {events.length > 0 && (
                <Box sx={fadeInUpSx(2)}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Upcoming Events
                  </Typography>
                  <StyledDataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={25}
                    rowsPerPageOptions={[25, 50, 100]}
                    autoHeight
                    disableRowSelectionOnClick
                    initialState={{
                      sorting: { sortModel: [{ field: "date", sort: "asc" }] },
                    }}
                    getRowClassName={(params) =>
                      params.row.date < today ? "past-event" : ""
                    }
                    sx={{ "& .past-event": { opacity: 0.55 } }}
                  />
                </Box>
              )}

              {fundStats.length > 0 && (
                <Box sx={{ mt: 4, ...fadeInUpSx(3) }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Asset Statistics
                  </Typography>
                  {fundStats.map((f) => (
                    <StyledCard key={f.symbol} sx={{ mb: 2, p: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1.5,
                        }}
                      >
                        <Chip
                          label={f.symbol}
                          size="small"
                          variant="outlined"
                        />
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600 }}
                        >
                          {f.legal_type ?? "Equity"} Statistics
                        </Typography>
                        {f.fund_family && (
                          <Typography variant="caption" color="text.disabled">
                            · {f.fund_family}
                          </Typography>
                        )}
                        {f.inception_date && (
                          <Typography variant="caption" color="text.disabled">
                            · Inception {f.inception_date}
                          </Typography>
                        )}
                      </Box>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {[
                              "NAV",
                              "AUM",
                              "Yield",
                              "YTD",
                              "3Y Avg",
                              "5Y Avg",
                              "52W Low",
                              "52W High",
                              "50D Avg",
                              "200D Avg",
                            ].map((h) => (
                              <TableCell
                                key={h}
                                align="right"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: 11,
                                  color: "text.secondary",
                                  border: 0,
                                  pb: 0.5,
                                }}
                              >
                                {h}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            {[
                              f.nav_price != null
                                ? `$${f.nav_price.toFixed(2)}`
                                : "—",
                              f.total_assets != null
                                ? `$${(f.total_assets / 1e9).toFixed(1)}B`
                                : "—",
                              f.yield != null
                                ? `${(f.yield * 100).toFixed(2)}%`
                                : "—",
                              f.ytd_return != null
                                ? `${(f.ytd_return * 100).toFixed(2)}%`
                                : "—",
                              f.three_year_avg_return != null
                                ? `${(f.three_year_avg_return * 100).toFixed(2)}%`
                                : "—",
                              f.five_year_avg_return != null
                                ? `${(f.five_year_avg_return * 100).toFixed(2)}%`
                                : "—",
                              f.fifty_two_week_low != null
                                ? `$${f.fifty_two_week_low.toFixed(2)}`
                                : "—",
                              f.fifty_two_week_high != null
                                ? `$${f.fifty_two_week_high.toFixed(2)}`
                                : "—",
                              f.fifty_day_avg != null
                                ? `$${f.fifty_day_avg.toFixed(2)}`
                                : "—",
                              f.two_hundred_day_avg != null
                                ? `$${f.two_hundred_day_avg.toFixed(2)}`
                                : "—",
                            ].map((val, i) => (
                              <TableCell
                                key={i}
                                align="right"
                                sx={{
                                  border: 0,
                                  fontWeight: 500,
                                  fontSize: 13,
                                }}
                              >
                                {val}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </StyledCard>
                  ))}
                </Box>
              )}
            </>
          )}
        </>
      )}
    </PageContainer>
  );
}
