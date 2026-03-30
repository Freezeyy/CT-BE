const models = require('../models');

function isSuperAdmin(req) {
  const isAdmin = req.user?.is_admin === true || req.user?.is_admin === 1 || req.user?.is_admin === '1';
  const isSuper = req.user?.is_superadmin === true || req.user?.is_superadmin === 1 || req.user?.is_superadmin === '1';
  return req.user?.userType === 'lecturer' && isAdmin && isSuper;
}

// -----------------------
// UniTypes
// -----------------------
async function listUniTypes(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const uniTypes = await models.UniType.findAll({
    attributes: ['uni_type_id', 'uni_type_code', 'uni_type_name', 'is_active'],
    order: [['uni_type_code', 'ASC']],
  });
  res.json({ uniTypes });
}

async function createUniType(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const { uni_type_code, uni_type_name, is_active = true } = req.body;
  if (!uni_type_code || !uni_type_name) {
    return res.status(400).json({ error: 'uni_type_code and uni_type_name are required' });
  }
  const uniType = await models.UniType.create({
    uni_type_code,
    uni_type_name,
    is_active: !!is_active,
  });
  res.status(201).json({ uniType });
}

async function updateUniType(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const { uni_type_id } = req.params;
  const uniType = await models.UniType.findByPk(uni_type_id);
  if (!uniType) return res.status(404).json({ error: 'UniType not found' });

  const { uni_type_code, uni_type_name, is_active } = req.body;
  await uniType.update({
    ...(uni_type_code !== undefined ? { uni_type_code } : {}),
    ...(uni_type_name !== undefined ? { uni_type_name } : {}),
    ...(is_active !== undefined ? { is_active: !!is_active } : {}),
  });
  res.json({ uniType });
}

// -----------------------
// Institutions
// -----------------------
async function listInstitutions(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const institutions = await models.Institution.findAll({
    attributes: ['institution_id', 'institution_name', 'uni_type_id', 'is_active'],
    include: [{ model: models.UniType, as: 'uniType', attributes: ['uni_type_id', 'uni_type_code', 'uni_type_name'] }],
    order: [['institution_name', 'ASC']],
  });
  res.json({ institutions });
}

async function createInstitution(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const { institution_name, uni_type_id, is_active = true } = req.body;
  if (!institution_name || !uni_type_id) {
    return res.status(400).json({ error: 'institution_name and uni_type_id are required' });
  }
  const uniType = await models.UniType.findByPk(uni_type_id);
  if (!uniType) return res.status(404).json({ error: 'UniType not found' });

  const institution = await models.Institution.create({
    institution_name,
    uni_type_id: parseInt(uni_type_id),
    is_active: !!is_active,
  });
  res.status(201).json({ institution });
}

async function updateInstitution(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const { institution_id } = req.params;
  const inst = await models.Institution.findByPk(institution_id);
  if (!inst) return res.status(404).json({ error: 'Institution not found' });

  const { institution_name, uni_type_id, is_active } = req.body;
  if (uni_type_id !== undefined) {
    const uniType = await models.UniType.findByPk(uni_type_id);
    if (!uniType) return res.status(404).json({ error: 'UniType not found' });
  }
  await inst.update({
    ...(institution_name !== undefined ? { institution_name } : {}),
    ...(uni_type_id !== undefined ? { uni_type_id: parseInt(uni_type_id) } : {}),
    ...(is_active !== undefined ? { is_active: !!is_active } : {}),
  });
  res.json({ institution: inst });
}

// -----------------------
// StudentOldCampuses
// -----------------------
async function listOldCampuses(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const oldCampuses = await models.StudentOldCampus.findAll({
    attributes: ['old_campus_id', 'old_campus_name', 'institution_id', 'is_active'],
    include: [{
      model: models.Institution,
      as: 'institution',
      attributes: ['institution_id', 'institution_name', 'uni_type_id'],
      include: [{ model: models.UniType, as: 'uniType', attributes: ['uni_type_id', 'uni_type_code'] }],
    }],
    order: [['old_campus_name', 'ASC']],
  });
  res.json({ oldCampuses });
}

async function createOldCampus(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const { old_campus_name, institution_id, is_active = true } = req.body;
  if (!old_campus_name || !institution_id) {
    return res.status(400).json({ error: 'old_campus_name and institution_id are required' });
  }
  const inst = await models.Institution.findByPk(institution_id);
  if (!inst) return res.status(404).json({ error: 'Institution not found' });

  const oldCampus = await models.StudentOldCampus.create({
    old_campus_name,
    institution_id: parseInt(institution_id),
    is_active: !!is_active,
  });
  res.status(201).json({ oldCampus });
}

async function updateOldCampus(req, res) {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: 'Super Admin only' });
  const { old_campus_id } = req.params;
  const oldCampus = await models.StudentOldCampus.findByPk(old_campus_id);
  if (!oldCampus) return res.status(404).json({ error: 'StudentOldCampus not found' });

  const { old_campus_name, institution_id, is_active } = req.body;
  if (institution_id !== undefined) {
    const inst = await models.Institution.findByPk(institution_id);
    if (!inst) return res.status(404).json({ error: 'Institution not found' });
  }
  await oldCampus.update({
    ...(old_campus_name !== undefined ? { old_campus_name } : {}),
    ...(institution_id !== undefined ? { institution_id: parseInt(institution_id) } : {}),
    ...(is_active !== undefined ? { is_active: !!is_active } : {}),
  });
  res.json({ oldCampus });
}

module.exports = {
  listUniTypes,
  createUniType,
  updateUniType,
  listInstitutions,
  createInstitution,
  updateInstitution,
  listOldCampuses,
  createOldCampus,
  updateOldCampus,
};

