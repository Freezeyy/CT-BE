const models = require('../models');

function isSuperAdmin(req) {
  return req.user?.userType === 'lecturer' && (req.user?.is_superadmin === true || req.user?.is_superadmin === 1 || req.user?.is_superadmin === '1');
}

async function campusIdForRequester(req) {
  if (req.user?.userType === 'student') {
    const s = await models.Student.findByPk(req.user.id, { attributes: ['campus_id'] });
    return s?.campus_id || null;
  }
  if (req.user?.userType === 'lecturer') {
    const l = await models.Lecturer.findByPk(req.user.id, { attributes: ['campus_id'] });
    return l?.campus_id || null;
  }
  return null;
}

async function getMyProcessWindow(req, res) {
  try {
    const campus_id = await campusIdForRequester(req);
    if (!campus_id) return res.status(400).json({ error: 'Cannot determine campus' });

    const row = await models.CampusProcessWindow.findOne({ where: { campus_id } });
    res.json({
      campus_id,
      ct_start_at: row?.ct_start_at || null,
      ct_end_at: row?.ct_end_at || null,
      sme_eval_days: row?.sme_eval_days ?? 14,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || e });
  }
}

async function getProcessWindow(req, res) {
  try {
    // Admin: only their campus; Super Admin: can specify campus_id
    let campus_id = null;
    if (isSuperAdmin(req) && req.query.campus_id) {
      campus_id = parseInt(req.query.campus_id, 10);
    } else {
      const l = await models.Lecturer.findByPk(req.user.id, { attributes: ['campus_id'] });
      campus_id = l?.campus_id || null;
    }
    if (!campus_id) return res.status(400).json({ error: 'campus_id not found' });

    const row = await models.CampusProcessWindow.findOne({ where: { campus_id } });
    res.json({
      campus_id,
      ct_start_at: row?.ct_start_at || null,
      ct_end_at: row?.ct_end_at || null,
      sme_eval_days: row?.sme_eval_days ?? 14,
    });
  } catch (e) {
    res.status(500).json({ error: e?.message || e });
  }
}

async function upsertProcessWindow(req, res) {
  try {
    const { campus_id: campusIdFromBody, ct_start_at, ct_end_at, sme_eval_days } = req.body || {};

    // Admin: only their campus; Super Admin: can set chosen campus
    let campus_id = null;
    if (isSuperAdmin(req) && campusIdFromBody) {
      campus_id = parseInt(campusIdFromBody, 10);
    } else {
      const l = await models.Lecturer.findByPk(req.user.id, { attributes: ['campus_id'] });
      campus_id = l?.campus_id || null;
    }
    if (!campus_id) return res.status(400).json({ error: 'campus_id not found' });

    const payload = {
      campus_id,
      ct_start_at: ct_start_at ? new Date(ct_start_at) : null,
      ct_end_at: ct_end_at ? new Date(ct_end_at) : null,
      sme_eval_days: sme_eval_days != null ? parseInt(sme_eval_days, 10) : 14,
    };

    const existing = await models.CampusProcessWindow.findOne({ where: { campus_id } });
    const row = existing ? await existing.update(payload) : await models.CampusProcessWindow.create(payload);
    res.json({ message: 'Saved', window: row });
  } catch (e) {
    res.status(500).json({ error: e?.message || e });
  }
}

module.exports = {
  getMyProcessWindow,
  getProcessWindow,
  upsertProcessWindow,
};

