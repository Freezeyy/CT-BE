/** Campus-local display (Malaysia). Stored DB times are UTC; show what users picked in the UI. */
const CAMPUS_TIMEZONE = process.env.CAMPUS_TIMEZONE || 'Asia/Kuala_Lumpur';

function formatInCampusTimezone(dateInput, options = {}) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: CAMPUS_TIMEZONE,
    ...options,
  }).format(d);
}

/** e.g. 21 May 2026, 9:16 am */
function formatCampusDateTime(dateInput) {
  return formatInCampusTimezone(dateInput, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** e.g. 2026-05-21 (campus calendar date) */
function formatCampusDate(dateInput) {
  return formatInCampusTimezone(dateInput, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

module.exports = {
  CAMPUS_TIMEZONE,
  formatCampusDateTime,
  formatCampusDate,
};
