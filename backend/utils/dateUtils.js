/**
 * Get today's date in YYYY-MM-DD format.
 * Uses provided timezone or server local timezone if omitted.
 *
 * @param {string} [timezone] - IANA timezone (e.g. 'UTC', 'America/Argentina/Buenos_Aires')
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getTodayInTimezone(timezone) {
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
}

/**
 * Get yesterday's date in YYYY-MM-DD format.
 * Uses provided timezone or server local timezone if omitted.
 *
 * @param {string} [timezone] - IANA timezone (e.g. 'UTC', 'America/Argentina/Buenos_Aires')
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getYesterdayInTimezone(timezone) {
  const now = new Date();

  // Create a copy so we don't mutate `now`
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  if (timezone) {
    options.timeZone = timezone;
  }

  return new Intl.DateTimeFormat("en-CA", options).format(yesterday);
}

/**
 * Get current datetime in ISO-8601.
 * Uses provided timezone or server local timezone if omitted.
 *
 * @param {string} [timezone] - IANA timezone (e.g. 'UTC', 'America/Argentina/Buenos_Aires')
 * @returns {string} Datetime string in ISO-8601 format
 */
function getNowInTimezoneISO(timezone) {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hour12: false,
    ...(timezone && { timeZone: timezone }),
    timeZoneName: "shortOffset",
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  return (
    `${get("year")}-${get("month")}-${get("day")}T` +
    `${get("hour")}:${get("minute")}:${get("second")}.` +
    `${get("fractionalSecond")}`
  );
}

module.exports = {
  getTodayInTimezone,
  getYesterdayInTimezone,
  getNowInTimezoneISO,
};
