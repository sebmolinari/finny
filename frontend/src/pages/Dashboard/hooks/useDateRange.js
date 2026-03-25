import { useState, useCallback, useMemo, useEffect } from "react";
import { getTodayInTimezone } from "../../../utils/dateUtils";

/**
 * Manages the date-range selector state and derives the active start/end dates.
 * @param {string} timezone - IANA timezone string from user settings
 * @param {string|null} inceptionDate - earliest portfolio date, used for "All Time" mode
 */
export function useDateRange(timezone, inceptionDate) {
  const [rangeMode, setRangeMode] = useState("ytd");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(() => getTodayInTimezone("UTC"));

  // Sync customEnd whenever timezone loads / changes
  useEffect(() => {
    setCustomEnd(getTodayInTimezone(timezone || "UTC"));
  }, [timezone]);

  const getActiveRange = useCallback(() => {
    const todayStr = getTodayInTimezone(timezone || "UTC");
    switch (rangeMode) {
      case "ytd":
        return { startDate: `${todayStr.substring(0, 4)}-01-01`, endDate: todayStr };
      case "30d": {
        const s = new Date(todayStr);
        s.setDate(s.getDate() - 30);
        return { startDate: s.toISOString().split("T")[0], endDate: todayStr };
      }
      case "3m": {
        const s = new Date(todayStr);
        s.setMonth(s.getMonth() - 3);
        return { startDate: s.toISOString().split("T")[0], endDate: todayStr };
      }
      case "6m": {
        const s = new Date(todayStr);
        s.setMonth(s.getMonth() - 6);
        return { startDate: s.toISOString().split("T")[0], endDate: todayStr };
      }
      case "12m": {
        const s = new Date(todayStr);
        s.setFullYear(s.getFullYear() - 1);
        return { startDate: s.toISOString().split("T")[0], endDate: todayStr };
      }
      case "3y": {
        const s = new Date(todayStr);
        s.setFullYear(s.getFullYear() - 3);
        return { startDate: s.toISOString().split("T")[0], endDate: todayStr };
      }
      case "5y": {
        const s = new Date(todayStr);
        s.setFullYear(s.getFullYear() - 5);
        return { startDate: s.toISOString().split("T")[0], endDate: todayStr };
      }
      case "inception":
        return inceptionDate ? { startDate: inceptionDate, endDate: todayStr } : null;
      case "custom":
        return customStart && customEnd
          ? { startDate: customStart, endDate: customEnd }
          : null;
      default:
        return null;
    }
  }, [rangeMode, customStart, customEnd, inceptionDate, timezone]);

  // Stable key that only changes when the resolved range actually changes.
  const activeRangeKey = useMemo(() => {
    const range = getActiveRange();
    return range ? `${range.startDate}|${range.endDate}` : null;
  }, [getActiveRange]);

  const RANGE_LABELS = {
    ytd: "Year-to-Date",
    "30d": "Last 30 Days",
    "3m": "Last 3 Months",
    "6m": "Last 6 Months",
    "12m": "Last 12 Months",
    "3y": "Last 3 Years",
    "5y": "Last 5 Years",
    inception: "All Time",
    custom: "Custom Range",
  };

  const rangeLabel = RANGE_LABELS[rangeMode] ?? "Custom Range";

  return {
    rangeMode,
    setRangeMode,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    getActiveRange,
    activeRangeKey,
    rangeLabel,
  };
}
