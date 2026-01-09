/**
 * Convert UTC datetime to user's timezone
 * @param {string|Date} dateString - ISO datetime string or Date object
 * @param {string} timezone - Timezone from user settings (e.g., 'UTC', 'America/Argentina/Buenos_Aires')
 * @param {string} dateFormat - Date format from user settings (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY')
 * @returns {string} Formatted date in user's timezone and format
 */
export const formatDateInTimezone = (
  dateString,
  timezone = "UTC",
  dateFormat = "YYYY-MM-DD"
) => {
  if (!dateString) return "—";

  try {
    const dateStringUTC = new Date(dateString.replace(" ", "T") + "Z");
    const date = new Date(dateStringUTC);

    // Map date format to locale and options
    let locale = "en-CA"; // Default for YYYY-MM-DD
    let dateOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    if (dateFormat === "MM/DD/YYYY") {
      locale = "en-US";
    } else if (dateFormat === "DD/MM/YYYY") {
      locale = "en-GB";
    }

    const formatter = new Intl.DateTimeFormat(locale, {
      ...dateOptions,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: timezone,
    });

    return formatter.format(date);
  } catch (error) {
    console.error(`Error formatting date with timezone ${timezone}:`, error);
    return dateString;
  }
};

/**
 * Format date with time for display (uses browser's default timezone)
 * @param {string|Date} dateString
 * @returns {string} Formatted date string
 */
export const formatDatetime = (dateString) => {
  if (!dateString) return "—";

  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Format date only (without time)
 * @param {string|Date} dateString
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return "—";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
};

/**
 * Get today's date in YYYY-MM-DD format for a specific timezone
 * @param {string} timezone - Timezone from user settings (e.g., 'UTC', 'America/Argentina/Buenos_Aires')
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getTodayInTimezone = (timezone = "UTC") => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: timezone,
    });
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch (error) {
    console.error(`Error getting today's date in timezone ${timezone}:`, error);
    return new Date().toISOString().split("T")[0];
  }
};
