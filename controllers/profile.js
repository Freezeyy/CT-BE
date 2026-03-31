const models = require('../models');

async function getLecturerProfile(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can view their profile' });
    }

    const lecturer = await models.Lecturer.findByPk(lecturerId, {
      attributes: [
        'lecturer_id',
        'lecturer_name',
        'lecturer_email',
        'lecturer_image',
        'campus_id',
        'is_admin',
        'is_superadmin',
      ],
      include: [
        {
          model: models.Campus,
          as: 'campus',
          attributes: ['campus_id', 'campus_name'],
          required: false,
        },
      ],
    });

    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    const [coordinators, subjectMethodExperts, headOfSections] = await Promise.all([
      models.Coordinator.findAll({
        where: { lecturer_id: lecturerId, end_date: null },
        include: [
          {
            model: models.Program,
            as: 'program',
            attributes: ['program_id', 'program_name', 'program_code', 'campus_id'],
            required: false,
          },
        ],
        order: [['coordinator_id', 'DESC']],
      }),
      models.SubjectMethodExpert.findAll({
        where: { lecturer_id: lecturerId, end_date: null },
        include: [
          {
            model: models.Course,
            as: 'course',
            attributes: ['course_id', 'course_name', 'course_code', 'campus_id'],
            required: false,
          },
        ],
        order: [['sme_id', 'DESC']],
      }),
      models.HeadOfSection.findAll({
        where: { lecturer_id: lecturerId, end_date: null },
        order: [['hos_id', 'DESC']],
      }),
    ]);

    res.json({
      lecturer,
      roles: {
        coordinators,
        subjectMethodExperts,
        headOfSections,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getLecturerProfile,
};

