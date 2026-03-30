const m = require('../models');

function index(req, res) {
  res.json({ message: 'Its Alive' });
}

async function getUniTypes(req, res) {
  try {
    const uniTypes = await m.UniType.findAll({
      where: { is_active: true },
      attributes: ['uni_type_id', 'uni_type_code', 'uni_type_name'],
      order: [['uni_type_code', 'ASC']],
    });
    res.json({ uniTypes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getInstitutions(req, res) {
  try {
    const uniTypeId = req.query.uni_type_id ? parseInt(req.query.uni_type_id) : null;
    const where = { is_active: true };
    if (uniTypeId) where.uni_type_id = uniTypeId;

    const institutions = await m.Institution.findAll({
      where,
      attributes: ['institution_id', 'institution_name', 'uni_type_id'],
      order: [['institution_name', 'ASC']],
    });
    res.json({ institutions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getOldCampusesByInstitution(req, res) {
  try {
    const institutionId = req.query.institution_id ? parseInt(req.query.institution_id) : null;
    if (!institutionId) {
      return res.status(400).json({ error: 'institution_id is required' });
    }

    const oldCampuses = await m.StudentOldCampus.findAll({
      where: { institution_id: institutionId, is_active: true },
      attributes: ['old_campus_id', 'old_campus_name', 'institution_id'],
      order: [['old_campus_name', 'ASC']],
    });

    res.json({ oldCampuses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function staticdata(req, res) {
  try {
    const data = {};
    const campusId = req.query.campus_id ? parseInt(req.query.campus_id) : null;
    
    // Get all campuses (for registration)
    if (m.Campus) {
      data.campuses = await m.Campus.findAll({
        attributes: ['campus_id', 'campus_name'],
        order: [['campus_name', 'ASC']],
      });
    } else {
      data.campuses = [];
    }
    
    // Get programs (for registration) - filter by campus_id if provided
    if (m.Program) {
      const programWhere = campusId ? { campus_id: campusId } : {};
      data.programs = await m.Program.findAll({
        where: programWhere,
        attributes: ['program_id', 'program_name', 'program_code', 'campus_id'],
        order: [['program_code', 'ASC']],
      });
    } else {
      data.programs = [];
    }
    
    // Get all old campuses (for previous institution dropdown)
    if (m.StudentOldCampus) {
      data.oldCampuses = await m.StudentOldCampus.findAll({
        attributes: ['old_campus_id', 'old_campus_name'],
        order: [['old_campus_name', 'ASC']],
      });
    } else {
      data.oldCampuses = [];
    }
    
    // Role model doesn't exist in this system, so we skip it
    data.role = [];
    
    res.json(data);
  } catch (error) {
    console.error('Staticdata error:', error);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
    });
  }
}

module.exports = { index, staticdata, getUniTypes, getInstitutions, getOldCampusesByInstitution };

