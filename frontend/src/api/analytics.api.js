import api from "./client";

export const analyticsAPI = {
  getPortfolioAnalytics: (excludeTypes = [], signal) =>
    api.get("/analytics/portfolio/analytics", {
      params: excludeTypes.length ? { exclude: excludeTypes.join(",") } : {},
      signal,
    }),

  getPortfolioPerformance: (
    days = 30,
    excludeTypes = [],
    startDate = null,
    endDate = null,
    signal,
  ) => {
    const params = {};
    if (!startDate || !endDate) params.days = days;
    if (excludeTypes.length) params.exclude = excludeTypes.join(",");
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get("/analytics/portfolio/performance", { params, signal });
  },

  getDateRangeMetrics: (startDate, endDate, signal) =>
    api.get("/analytics/portfolio/performance/range", {
      params: { start_date: startDate, end_date: endDate },
      signal,
    }),

  getInceptionDate: (signal) =>
    api.get("/analytics/portfolio/inception-date", { signal }),

  getReturnDetails: (signal) =>
    api.get("/analytics/portfolio/returns/details", { signal }),

  getCashBalanceDetails: () => api.get("/analytics/portfolio/cash-details"),

  getBrokerOverview: (signal) =>
    api.get("/analytics/brokers/overview", { signal }),

  getMarketTrends: (days = 30) =>
    api.get("/analytics/market-trends", { params: { days } }),

  getTaxReport: (year, excludeAssetTypes = [], excludeBrokers = []) => {
    const params = { year };
    if (excludeAssetTypes.length > 0) {
      params.exclude_asset_types = excludeAssetTypes.join(",");
    }
    if (excludeBrokers.length > 0) {
      params.exclude_brokers = excludeBrokers.join(",");
    }
    return api.get("/analytics/tax-report", { params });
  },

  getRealizedGains: (year = null, ltDays = 365) => {
    const params = { lt_days: ltDays };
    if (year) params.year = year;
    return api.get("/analytics/realized-gains", { params });
  },

  getIncome: (year = null, startDate = null, endDate = null) => {
    const params = {};
    if (year !== null) params.year = year;
    if (startDate !== null) params.start_date = startDate;
    if (endDate !== null) params.end_date = endDate;
    return api.get("/analytics/income", { params });
  },

  getTaxHarvesting: (marginalRate = null, year = null) => {
    const params = {};
    if (marginalRate !== null) params.marginal_rate = marginalRate;
    if (year !== null) params.year = year;
    return api.get("/analytics/tax-harvesting", { params });
  },

  getRiskMetrics: (days = 365, startDate = null, endDate = null, signal) => {
    const params = {};
    if (!startDate || !endDate) params.days = days;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return api.get("/analytics/portfolio/risk-metrics", { params, signal });
  },

  getHistoricalHoldings: (asOf) =>
    api.get("/analytics/portfolio/historical-holdings", {
      params: { as_of: asOf },
    }),

  getEconomicCalendar: () => api.get("/analytics/economic-calendar"),

  getBenchmark: (params, signal) =>
    api.get("/analytics/portfolio/benchmark", { params, signal }),

  getAttribution: (startDate, endDate, signal) =>
    api.get("/analytics/portfolio/attribution", {
      params: { start_date: startDate, end_date: endDate },
      signal,
    }),

  getCorrelation: (days = 365, signal) =>
    api.get("/analytics/portfolio/correlation", { params: { days }, signal }),

  getAdminOverview: () => api.get("/analytics/admin/overview"),

  getMissingPrices: () => api.get("/analytics/missing-prices"),

  fetchMissingPrices: (items) =>
    api.post("/analytics/missing-prices/fetch", { items }, { timeout: 120000 }),

  applyMissingPrices: (items) =>
    api.post("/analytics/missing-prices/apply", { items }),
};
