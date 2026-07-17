const bcrypt = require('bcrypt');
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

async function updateLecturerPassword(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can change their password' });
    }

    const { current_password, new_password } = req.body || {};

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }

    if (String(new_password).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    if (current_password === new_password) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const lecturer = await models.Lecturer.findByPk(lecturerId);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    const valid = await bcrypt.compare(current_password, lecturer.lecturer_password);
    if (!valid) {
      return res.status(422).json({ error: 'Current password is incorrect' });
    }

    const hashed = bcrypt.hashSync(new_password, bcrypt.genSaltSync());
    await lecturer.update({ lecturer_password: hashed, reset_token: null });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getLecturerProfile,
  updateLecturerPassword,
};

