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
  const [pnlSparklineData, setPnlSparklineData] = useState([]);
  const [mtmEvolution, setMtmEvolution] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [rangeMetrics, setRangeMetrics] = useState(null);
  const [rangeMetricsLoading, setRangeMetricsLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [inceptionDate, setInceptionDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async (signal) => {
    try {
      setError(null);
      const response = await analyticsAPI.getPortfolioAnalytics([ASSET_TYPE_REALESTATE], signal);
      setDashboard(response.data);
    } catch (err) {
      if (err.name === "CanceledError") return;
      console.error("Error loading dashboard:", err);
      setError("Failed to load dashboard data. Please try again.");
    }
  }, []);

  const loadBrokerData = useCallback(async (signal) => {
    try {
      const response = await analyticsAPI.getBrokerOverview(signal);
      if (response.data && Array.isArray(response.data)) {
        const chartData = response.data
          .map((broker) => ({ name: broker.name, value: broker.current_value || 0 }))
          .filter((broker) => broker.value > 10)
          .sort((a, b) => b.value - a.value);
        setBrokerSummary(chartData);
      }
    } catch (error) {
      if (error.name === "CanceledError") return;
      console.error("Error loading broker data:", error);
    }
  }, []);

  const loadInceptionDate = useCallback(async (signal) => {
    try {
      const response = await analyticsAPI.getInceptionDate(signal);
      setInceptionDate(response.data.inception_date || null);
    } catch (error) {
      if (error.name === "CanceledError") return;
      console.error("Error loading inception date:", error);
    }
  }, []);

  const loadSparklineData = useCallback(async (signal) => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance(31, [], null, null, signal);
      setSparklineData(response.data.map((item) => ({ date: item.date, value: item.total_value })));
    } catch (error) {
      if (error.name === "CanceledError") return;
      console.error("Error loading sparkline data:", error);
    }
  }, []);

  const loadHoldingsSparklineData = useCallback(async (signal) => {
    try {
      const response = await analyticsAPI.getPortfolioPerformance(31, [ASSET_TYPE_REALESTATE], null, null, signal);
      setHoldingsSparklineData(response.data.map((item) => ({ date: item.date, value: item.total_value })));
    } catch (error) {
      if (error.name === "CanceledError") return;
      console.error("Error loading holdings sparkline data:", error);
    }
  }, []);

  const loadPnlSparklineData = useCallback(async (signal) => {
    try {
      const response = await analyticsAPI.getUnrealizedPnlHistory(31, [ASSET_TYPE_REALESTATE], signal);
      setPnlSparklineData(response.data.map((item) => ({ date: item.date, value: item.unrealized_gain })));
    } catch (error) {
      if (error.name === "CanceledError") return;
      console.error("Error loading P&L sparkline data:", error);
    }
  }, []);

  const loadReturnDetails = useCallback(async (signal) => {
    try {
      const response = await analyticsAPI.getReturnDetails(signal);
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
      if (error.name === "CanceledError") return;
      console.error("Error loading return details:", error);
    }
  }, []);

  const loadPerformanceForRange = useCallback(async (signal) => {
    const range = getActiveRange();
    if (!range) return;
    try {
      const response = await analyticsAPI.getPortfolioPerformance(
        undefined,
        undefined,
        range.startDate,
        range.endDate,
        signal,
      );
      setPerformanceData(response.data.map((item) => ({ date: item.date, value: item.total_value })));
    } catch (error) {
      if (error.name === "CanceledError") return;
      console.error("Error loading performance data:", error);
    }
  }, [getActiveRange]);

  const loadRangeMetrics = useCallback(async (signal) => {
    const range = getActiveRange();
    if (!range) {
      setRangeMetrics(null);
      return;
    }
    try {
      setRangeMetricsLoading(true);
      const response = await analyticsAPI.getDateRangeMetrics(range.startDate, range.endDate, signal);
      setRangeMetrics(response.data);
    } catch (error) {
      if (error.name === "CanceledError") return;
      console.error("Error loading range metrics:", error);
      setRangeMetrics(null);
    } finally {
      if (!signal?.aborted) setRangeMetricsLoading(false);
    }
  }, [getActiveRange]);

  // Initial load — wait for all 6 calls before clearing the skeleton
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.allSettled([
      loadDashboard(signal),
      loadBrokerData(signal),
      loadSparklineData(signal),
      loadHoldingsSparklineData(signal),
      loadPnlSparklineData(signal),
      loadReturnDetails(signal),
      loadInceptionDate(signal),
    ]).then(() => {
      if (!signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload performance + range metrics when range changes
  useEffect(() => {
    if (!activeRangeKey) return;
    const controller = new AbortController();
    loadPerformanceForRange(controller.signal);
    loadRangeMetrics(controller.signal);
    return () => controller.abort();
  }, [activeRangeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload benchmark when range or symbol changes
  useEffect(() => {
    if (!activeRangeKey || !benchmarkSymbol) {
      setBenchmarkData(null);
      return;
    }
    const range = getActiveRange();
    if (!range) return;
    const controller = new AbortController();
    analyticsAPI
      .getBenchmark({ symbol: benchmarkSymbol, start_date: range.startDate, end_date: range.endDate }, controller.signal)
      .then((res) => setBenchmarkData(res.data || null))
      .catch((err) => {
        if (err.name !== "CanceledError") setBenchmarkData(null);
      });
    return () => controller.abort();
  }, [activeRangeKey, benchmarkSymbol]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    dashboard,
    brokerSummary,
    sparklineData,
    holdingsSparklineData,
    pnlSparklineData,
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
