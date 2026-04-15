const models = require('../models');

async function getCampusProcessWindow(campus_id) {
  if (!campus_id) return null;
  return await models.CampusProcessWindow.findOne({ where: { campus_id } });
}

function isNowWithinWindow(row) {
  if (!row) return true; // default open if not configured yet
  const now = Date.now();
  const start = row.ct_start_at ? new Date(row.ct_start_at).getTime() : null;
  const end = row.ct_end_at ? new Date(row.ct_end_at).getTime() : null;
  if (start != null && now < start) return false;
  if (end != null && now > end) return false;
  return true;
}

async function isCtProcessOpenForCampus(campus_id) {
  const row = await getCampusProcessWindow(campus_id);
  return isNowWithinWindow(row);
}

async function getSmeEvalDaysForCampus(campus_id, fallback = 14) {
  const row = await getCampusProcessWindow(campus_id);
  const days = row?.sme_eval_days;
  const n = Number(days);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

module.exports = {
  getCampusProcessWindow,
  isCtProcessOpenForCampus,
  getSmeEvalDaysForCampus,
};

