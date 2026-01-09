/**
 * Get today's date in YYYY-MM-DD format for a specific timezone
 * @param {string} timezone - Timezone (e.g., 'UTC', 'America/Argentina/Buenos_Aires')
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getTodayInTimezone(timezone) {
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
}

module.exports = {
  getTodayInTimezone,
};
