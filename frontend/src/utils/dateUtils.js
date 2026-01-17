/**
 * Format a UTC datetime from SQLite into user's date format + HH:MM:SS
 * using user's timezone.
 *
 * Input MUST be: YYYY-MM-DD HH:MM:SS (UTC)
 *
 * @param {string} utcDateTime
 * @param {"YYYY-MM-DD"|"DD/MM/YYYY"|"MM/DD/YYYY"} dateFormat
 * @param {string} timezone - IANA timezone (e.g. 'UTC', 'America/Argentina/Buenos_Aires')
 * @returns {string}
 */
export const formatDatetimeInTimezone = (utcDateTime, dateFormat, timezone) => {
  if (!utcDateTime || !dateFormat || !timezone) {
    throw new Error("utcDateTime, dateFormat and timezone are required");
  }

  // Validate SQLite UTC datetime
  const match = utcDateTime.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) {
    throw new Error(
      "Invalid UTC datetime format (expected YYYY-MM-DD HH:MM:SS)",
    );
  }

  // Parse as UTC instant
  const date = new Date(utcDateTime.replace(" ", "T") + "Z");
  if (isNaN(date)) {
    throw new Error("Invalid date");
  }

  // Map date format → locale
  let locale;
  switch (dateFormat) {
    case "YYYY-MM-DD":
      locale = "en-CA";
      break;
    case "DD/MM/YYYY":
      locale = "en-GB";
      break;
    case "MM/DD/YYYY":
      locale = "en-US";
      break;
    default:
      throw new Error(`Unsupported dateFormat: ${dateFormat}`);
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: timezone,
  });

  return formatter.format(date);
};

/**
 * Get today's date in YYYY-MM-DD format.
 * Uses provided timezone or server local timezone if omitted.
 *
 * @param {string} [timezone] - IANA timezone (e.g. 'UTC', 'America/Argentina/Buenos_Aires')
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getTodayInTimezone = (timezone) => {
  const now = new Date();

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  if (timezone) {
    options.timeZone = timezone;
  }

  return new Intl.DateTimeFormat("en-CA", options).format(now);
};

/**
 * Format a calendar date string according to user date format.
 * Pure formatting only — no timezone, no Date parsing.
 *
 * Input MUST be in YYYY-MM-DD format.
 *
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @param {"YYYY-MM-DD"|"DD/MM/YYYY"|"MM/DD/YYYY"} userDateFormat
 * @returns {string}
 * @throws {Error} If parameters are missing or invalid
 */
export const formatDate = (dateString, userDateFormat) => {
  if (!dateString || !userDateFormat) {
    throw new Error("dateString and userDateFormat are required");
  }

  // Validate input format explicitly
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error("Invalid dateString format (expected YYYY-MM-DD)");
  }

  const [, year, month, day] = match;

  switch (userDateFormat) {
    case "MM/DD/YYYY":
      return `${month}/${day}/${year}`;

    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;

    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;

    default:
      throw new Error(`Unsupported userDateFormat: ${userDateFormat}`);
  }
};
