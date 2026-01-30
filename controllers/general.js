const m = require('../models');

function index(req, res) {
  res.json({ message: 'Its Alive' });
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

module.exports = { index, staticdata };
