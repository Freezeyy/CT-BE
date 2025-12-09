const models = require('../models');

// Get available coordinators for student's campus
async function getAvailableCoordinators(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can view coordinators' });
    }

    // Get student's campus_id
    const student = await models.Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get coordinators from the same campus as the student
    // Coordinators are lecturers, and we need to filter by lecturer's campus_id
    const coordinators = await models.Coordinator.findAll({
      where: {
        end_date: null, // Active coordinators only
      },
      include: [
        {
          model: models.Lecturer,
          as: 'lecturer',
          where: {
            campus_id: student.campus_id, // Filter by student's campus
          },
          attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
          required: true,
        },
        {
          model: models.Program,
          as: 'program',
          attributes: ['program_id', 'program_name', 'program_code'],
        },
      ],
    });

    res.json({ coordinators });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create appointment
async function createAppointment(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can create appointments' });
    }

    const { coordinator_id, appointment_start, appointment_end, appointment_notes } = req.body;

    if (!coordinator_id || !appointment_start) {
      return res.status(400).json({
        error: 'Missing required fields: coordinator_id and appointment_start are required',
      });
    }

    // Get student's campus_id
    const student = await models.Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Verify coordinator exists and is from the same campus
    const coordinator = await models.Coordinator.findOne({
      where: {
        coordinator_id,
        end_date: null, // Active coordinator
      },
      include: [
        {
          model: models.Lecturer,
          as: 'lecturer',
          where: {
            campus_id: student.campus_id, // Must be from same campus
          },
          required: true,
        },
      ],
    });

    if (!coordinator) {
      return res.status(404).json({
        error: 'Coordinator not found or not available for your campus',
      });
    }

    // Create appointment
    const appointment = await models.Appointment.create({
      appointment_status: 'scheduled',
      appointment_notes: appointment_notes || null,
      appointment_start: new Date(appointment_start),
      appointment_end: appointment_end ? new Date(appointment_end) : null,
      student_id: studentId,
      coordinator_id,
    });

    res.status(201).json({
      message: 'Appointment created successfully',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get student's appointments
async function getStudentAppointments(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can view their appointments' });
    }

    const appointments = await models.Appointment.findAll({
      where: { student_id: studentId },
      include: [
        {
          model: models.Coordinator,
          as: 'coordinator',
          include: [
            {
              model: models.Lecturer,
              as: 'lecturer',
              attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
            },
            {
              model: models.Program,
              as: 'program',
              attributes: ['program_id', 'program_name', 'program_code'],
            },
          ],
        },
      ],
      order: [['appointment_start', 'DESC']],
    });

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get coordinator's appointments
async function getCoordinatorAppointments(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can view coordinator appointments' });
    }

    // Get coordinator record
    const coordinator = await models.Coordinator.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
    });

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator not found' });
    }

    const appointments = await models.Appointment.findAll({
      where: { coordinator_id: coordinator.coordinator_id },
      include: [
        {
          model: models.Student,
          as: 'student',
          attributes: ['student_id', 'student_name', 'student_email', 'student_phone'],
        },
      ],
      order: [['appointment_start', 'DESC']],
    });

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update appointment (status, notes, etc.)
async function updateAppointment(req, res) {
  try {
    const { appointmentId } = req.params;
    const { appointment_status, appointment_notes, appointment_start, appointment_end } = req.body;

    // Get appointment
    const appointment = await models.Appointment.findByPk(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if user is the student or coordinator
    const userId = req.user.id;
    const isStudent = req.user.userType === 'student' && appointment.student_id === userId;
    
    let isCoordinator = false;
    if (req.user.userType === 'lecturer') {
      const coordinator = await models.Coordinator.findOne({
        where: { lecturer_id: userId, coordinator_id: appointment.coordinator_id },
      });
      isCoordinator = !!coordinator;
    }

    if (!isStudent && !isCoordinator) {
      return res.status(403).json({ error: 'You can only update your own appointments' });
    }

    // Update appointment
    const updateData = {};
    if (appointment_status) updateData.appointment_status = appointment_status;
    if (appointment_notes !== undefined) updateData.appointment_notes = appointment_notes;
    if (appointment_start) updateData.appointment_start = new Date(appointment_start);
    if (appointment_end) updateData.appointment_end = new Date(appointment_end);

    await appointment.update(updateData);

    res.json({
      message: 'Appointment updated successfully',
      appointment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getAvailableCoordinators,
  createAppointment,
  getStudentAppointments,
  getCoordinatorAppointments,
  updateAppointment,
};

