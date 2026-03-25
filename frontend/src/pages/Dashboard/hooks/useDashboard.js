import { useState, useEffect, useCallback } from "react";
import { analyticsAPI } from "../../../api/api";
import { ASSET_TYPE_REALESTATE } from "../../../constants/assetTypes";

/**
 * Fetches all dashboard data: analytics, broker summary, sparklines, MTM evolution,
 * range-specific performance and metrics, and benchmarks.
 */
export function useDashboard(getActiveRange, activeRangeKey, benchmarkSymbol) {
  const [dashboard, setDashboard] = useState(null);
  const [brokerSummary, setBrokerSummary] = useState([]);
  const [sparklineData, setSparklineData] = useState([]);
  const [holdingsSparklineData, setHoldingsSparklineData] = useState([]);
  const [mtmEvolution, setMtmEvolution] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [rangeMetrics, setRangeMetrics] = useState(null);
  const [rangeMetricsLoading, setRangeMetricsLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [inceptionDate, setInceptionDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const response = await analyticsAPI.getPortfolioAnalytics([ASSET_TYPE_REALESTATE]);
      setDashboard(response.data);
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBrokerData = useCallback(async () => {
    try {
      const response = await analyticsAPI.getBrokerOverview();
      if (response.data && Array.isArray(response.data)) {
        const chartData = response.data
          .map((broker) => ({ name: broker.name, value: broker.current_value || 0 }))
          .filter((broker) => broker.value > 10)
          .sort((a, b) => b.value - a.value);
        setBrokerSummary(chartData);
      }
    } catch (error) {
      console.error("Error loading broker data:", error);
    }
  }, []);

  const loadInceptionDate = useCallback(async () => {
    try {
      const response = await analyticsAPI.getInceptionDate();
      setInceptionDate(response.data.inception_date || null);
    } catch (error) {
      console.error("Error loading inception date:", error);
    }
  }, []);

  const loadSparklineData = useCallback(async () => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance(31);
      setSparklineData(response.data.map((item) => ({ date: item.date, value: item.total_value })));
    } catch (error) {
      console.error("Error loading sparkline data:", error);
    }
  }, []);

  const loadHoldingsSparklineData = useCallback(async () => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance(31, [ASSET_TYPE_REALESTATE]);
      setHoldingsSparklineData(response.data.map((item) => ({ date: item.date, value: item.total_value })));
    } catch (error) {
      console.error("Error loading holdings sparkline data:", error);
    }
  }, []);

  const loadReturnDetails = useCallback(async () => {
    try {
      const response = await analyticsAPI.getReturnDetails();
      const details = response.data;
      if (details && Array.isArray(details.cagr_evolution)) {
        setMtmEvolution(
          details.cagr_evolution.map((r) => ({
            year: String(r.year),
            mtm: r.mtm || 0,
            cagr: r.cagr !== null && r.cagr !== undefined ? r.cagr : null,
          })),
        );
      }
    } catch (error) {
      console.error("Error loading return details:", error);
    }
  }, []);

  const loadPerformanceForRange = useCallback(async () => {
    const range = getActiveRange();
    if (!range) return;
    try {
      const response = await analyticsAPI.getPortfolioPerformance(
        undefined,
        undefined,
        range.startDate,
        range.endDate,
      );
      setPerformanceData(response.data.map((item) => ({ date: item.date, value: item.total_value })));
    } catch (error) {
      console.error("Error loading performance data:", error);
    }
  }, [getActiveRange]);

  const loadRangeMetrics = useCallback(async () => {
    const range = getActiveRange();
    if (!range) {
      setRangeMetrics(null);
      return;
    }
    try {
      setRangeMetricsLoading(true);
      const response = await analyticsAPI.getDateRangeMetrics(range.startDate, range.endDate);
      setRangeMetrics(response.data);
    } catch (error) {
      console.error("Error loading range metrics:", error);
      setRangeMetrics(null);
    } finally {
      setRangeMetricsLoading(false);
    }
  }, [getActiveRange]);

  // Initial load
  useEffect(() => {
    loadDashboard();
    loadBrokerData();
    loadSparklineData();
    loadHoldingsSparklineData();
    loadReturnDetails();
    loadInceptionDate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload performance + range metrics when range changes
  useEffect(() => {
    if (!activeRangeKey) return;
    loadPerformanceForRange();
    loadRangeMetrics();
  }, [activeRangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload benchmark when range or symbol changes
  useEffect(() => {
    if (!activeRangeKey || !benchmarkSymbol) {
      setBenchmarkData(null);
      return;
    }
    const range = getActiveRange();
    if (!range) return;
    analyticsAPI
      .getBenchmark({ symbol: benchmarkSymbol, startDate: range.startDate, endDate: range.endDate })
      .then((res) => setBenchmarkData(res.data || null))
      .catch(() => setBenchmarkData(null));
  }, [activeRangeKey, benchmarkSymbol]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    dashboard,
    brokerSummary,
    sparklineData,
    holdingsSparklineData,
    mtmEvolution,
    performanceData,
    rangeMetrics,
    rangeMetricsLoading,
    benchmarkData,
    inceptionDate,
    loading,
    error,
    reload: loadDashboard,
  };
}
