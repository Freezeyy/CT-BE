const bcrypt = require('bcrypt');
const models = require('../models');
const Student = models.Student;
const Lecturer = models.Lecturer;

// Create a new lecturer (admin only) - no role assignment during creation
async function createLecturer(req, res) {
  try {
    const lecturerId = req.user.id;
    const userType = req.user.userType;
    
    // Verify user is admin
    if (userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can create lecturers' });
    }

    // Get admin's campus_id
    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer) {
      return res.status(404).json({ error: 'Admin lecturer not found' });
    }

    const adminCampusId = adminLecturer.campus_id;
    if (!adminCampusId) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }

    const {
      lecturer_name,
      lecturer_email,
      lecturer_password,
      lecturer_image,
      campus_id, // Should match admin's campus_id
      is_admin = false,
    } = req.body;

    // Validate required fields
    if (!lecturer_name || !lecturer_email || !lecturer_password) {
      return res.status(400).json({
        error: 'Missing required fields: lecturer_name, lecturer_email, and lecturer_password are required',
      });
    }

    // Ensure campus_id matches admin's campus_id
    const lecturerCampusId = campus_id ? parseInt(campus_id) : adminCampusId;
    if (lecturerCampusId !== adminCampusId) {
      return res.status(403).json({
        error: 'You can only create lecturers for your own campus',
      });
    }

    // Check if email already exists
    const existingStudent = await Student.findOne({ where: { student_email: lecturer_email } });
    const existingLecturer = await Lecturer.findOne({ where: { lecturer_email } });

    if (existingStudent || existingLecturer) {
      return res.status(409).json({ error: 'That email is already taken' });
    }

    // Hash password
    const hashpass = bcrypt.hashSync(lecturer_password, bcrypt.genSaltSync());

    // Create lecturer (always use admin's campus_id)
    const newLecturer = await Lecturer.create({
      lecturer_name,
      lecturer_email,
      lecturer_password: hashpass,
      lecturer_image: lecturer_image || null,
      is_admin: is_admin || false,
      campus_id: adminCampusId, // Always use admin's campus_id
    });

    // Return lecturer without password
    const lecturerResponse = {
      lecturer_id: newLecturer.lecturer_id,
      lecturer_name: newLecturer.lecturer_name,
      lecturer_email: newLecturer.lecturer_email,
      lecturer_image: newLecturer.lecturer_image,
      is_admin: newLecturer.is_admin,
      campus_id: newLecturer.campus_id,
    };

    res.status(201).json({ lecturer: lecturerResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get all lecturers (admin only) with pagination and search
async function getLecturers(req, res) {
  try {
    const lecturerId = req.user.id;
    const userType = req.user.userType;
    
    // Verify user is admin
    if (userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can view lecturers' });
    }

    // Get admin's campus_id
    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer) {
      return res.status(404).json({ error: 'Admin lecturer not found' });
    }

    const adminCampusId = adminLecturer.campus_id;
    if (!adminCampusId) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }

    // Get pagination and search parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Build where clause
    const { Op } = require('sequelize');
    const whereClause = {
      campus_id: adminCampusId,
    };

    // Add search filter if provided
    if (search.trim()) {
      whereClause[Op.or] = [
        { lecturer_name: { [Op.like]: `%${search.trim()}%` } },
        { lecturer_email: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    // Get total count for pagination
    const totalCount = await Lecturer.count({ where: whereClause });

    // Get lecturers with pagination
    const lecturers = await Lecturer.findAll({
      where: whereClause,
      attributes: { exclude: ['lecturer_password'] },
      include: [{
        model: models.Campus,
        as: 'campus',
        attributes: ['campus_id', 'campus_name'],
        required: false,
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      lecturers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get all students (admin only)
async function getStudents(req, res) {
  try {
    const students = await Student.findAll({
      attributes: { exclude: ['student_password'] },
      order: [['createdAt', 'DESC']],
    });
    res.json({ students });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Assign lecturer as Coordinator
async function assignCoordinator(req, res) {
  try {
    const { lecturer_id, program_id, start_date, end_date } = req.body;

    if (!lecturer_id || !program_id) {
      return res.status(400).json({
        error: 'Missing required fields: lecturer_id and program_id are required',
      });
    }

    // Verify lecturer exists
    const lecturer = await models.Lecturer.findByPk(lecturer_id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    // Verify program exists
    const program = await models.Program.findByPk(program_id);
    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Check if coordinator already exists for this lecturer and program
    const existingCoordinator = await models.Coordinator.findOne({
      where: {
        lecturer_id,
        program_id,
        end_date: null, // Active coordinator
      },
    });

    if (existingCoordinator) {
      return res.status(409).json({
        error: 'This lecturer is already a coordinator for this program',
      });
    }

    // Create coordinator assignment
    const coordinator = await models.Coordinator.create({
      lecturer_id,
      program_id,
      appointment_id: null,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : null,
    });

    res.status(201).json({
      message: 'Coordinator assigned successfully',
      coordinator,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Assign lecturer as Subject Method Expert
async function assignSubjectMethodExpert(req, res) {
  try {
    const { lecturer_id, course_id, start_date, end_date } = req.body;

    if (!lecturer_id || !course_id) {
      return res.status(400).json({
        error: 'Missing required fields: lecturer_id and course_id are required',
      });
    }

    // Verify lecturer exists
    const lecturer = await models.Lecturer.findByPk(lecturer_id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    // Verify course exists
    const course = await models.Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if SME already exists for this lecturer and course
    const existingSME = await models.SubjectMethodExpert.findOne({
      where: {
        lecturer_id,
        course_id,
        end_date: null, // Active SME
      },
    });

    if (existingSME) {
      return res.status(409).json({
        error: 'This lecturer is already a Subject Method Expert for this course',
      });
    }

    // Create SME assignment
    const sme = await models.SubjectMethodExpert.create({
      lecturer_id,
      course_id,
      application_id: null,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : null,
    });

    res.status(201).json({
      message: 'Subject Method Expert assigned successfully',
      sme,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Assign lecturer as Head of Section
async function assignHeadOfSection(req, res) {
  try {
    const { lecturer_id, start_date, end_date } = req.body;

    if (!lecturer_id) {
      return res.status(400).json({
        error: 'Missing required field: lecturer_id is required',
      });
    }

    // Verify lecturer exists
    const lecturer = await models.Lecturer.findByPk(lecturer_id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    // Check if HOS already exists for this lecturer
    const existingHOS = await models.HeadOfSection.findOne({
      where: {
        lecturer_id,
        end_date: null, // Active HOS
      },
    });

    if (existingHOS) {
      return res.status(409).json({
        error: 'This lecturer is already a Head of Section',
      });
    }

    // Create HOS assignment
    const hos = await models.HeadOfSection.create({
      lecturer_id,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : null,
    });

    res.status(201).json({
      message: 'Head of Section assigned successfully',
      hos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get all programs for admin's campus
async function getPrograms(req, res) {
  try {
    const lecturerId = req.user.id;
    const userType = req.user.userType;
    
    // Verify user is admin
    if (userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can view programs' });
    }

    // Get admin's campus_id
    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer) {
      return res.status(404).json({ error: 'Admin lecturer not found' });
    }

    const adminCampusId = adminLecturer.campus_id;
    if (!adminCampusId) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }

    // Get all programs for this campus
    const programs = await models.Program.findAll({
      where: { campus_id: adminCampusId },
      attributes: ['program_id', 'program_name', 'program_code', 'campus_id'],
      order: [['program_code', 'ASC']],
    });

    res.json({ programs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get all courses for admin's campus (for SME assignment - no program required)
async function getCourses(req, res) {
  try {
    const lecturerId = req.user.id;
    const userType = req.user.userType;
    
    // Verify user is admin
    if (userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can view courses' });
    }

    // Get admin's campus_id
    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer) {
      return res.status(404).json({ error: 'Admin lecturer not found' });
    }

    const adminCampusId = adminLecturer.campus_id;
    if (!adminCampusId) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }

    // Get all courses for this campus with their associated programs
    const courses = await models.Course.findAll({
      where: { campus_id: adminCampusId },
      attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
      include: [{
        model: models.Program,
        as: 'programs',
        attributes: ['program_id', 'program_name', 'program_code'],
        through: { attributes: [] }, // Exclude junction table attributes
        required: false,
      }],
      order: [['course_code', 'ASC']],
    });

    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get all staff role assignments
async function getStaffAssignments(req, res) {
  try {
    const coordinators = await models.Coordinator.findAll({
      where: { end_date: null }, // Active only
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
    });

    const smes = await models.SubjectMethodExpert.findAll({
      where: { end_date: null }, // Active only
      include: [
        {
          model: models.Lecturer,
          as: 'lecturer',
          attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
        },
        {
          model: models.Course,
          as: 'course',
          attributes: ['course_id', 'course_name', 'course_code'],
        },
      ],
    });

    const hos = await models.HeadOfSection.findAll({
      where: { end_date: null }, // Active only
      include: [
        {
          model: models.Lecturer,
          as: 'lecturer',
          attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
        },
      ],
    });

    res.json({
      coordinators,
      subjectMethodExperts: smes,
      headOfSections: hos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update lecturer role assignment (admin only)
async function updateLecturerRole(req, res) {
  try {
    const { lecturer_id } = req.params;
    const {
      role_type, // 'coordinator', 'sme', 'hos', or null to remove all roles
      program_id, // Required if role_type is 'coordinator'
      course_id, // Required if role_type is 'sme'
      start_date,
      end_date,
    } = req.body;

    // Debug logging
    console.log('=== updateLecturerRole CALLED ===');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('Lecturer ID:', lecturer_id);

    if (!lecturer_id) {
      return res.status(400).json({
        error: 'lecturer_id is required',
      });
    }

    // Verify lecturer exists
    const lecturer = await Lecturer.findByPk(lecturer_id);
    if (!lecturer) {
      return res.status(404).json({ error: 'Lecturer not found' });
    }

    // End all existing active roles for this lecturer
    const endDate = new Date();
    await models.Coordinator.update(
      { end_date: endDate },
      { where: { lecturer_id, end_date: null } }
    );
    await models.SubjectMethodExpert.update(
      { end_date: endDate },
      { where: { lecturer_id, end_date: null } }
    );
    await models.HeadOfSection.update(
      { end_date: endDate },
      { where: { lecturer_id, end_date: null } }
    );

    // If role_type is null or not provided, just end all roles
    if (!role_type) {
      return res.json({
        message: 'All roles ended successfully',
        lecturer_id,
      });
    }

    // Validate role-specific fields
    if (role_type === 'coordinator' && !program_id) {
      return res.status(400).json({
        error: 'program_id is required when role_type is "coordinator"',
      });
    }
    if (role_type === 'sme' && !course_id) {
      return res.status(400).json({
        error: 'course_id is required when role_type is "sme"',
      });
    }

    // Assign new role
    let roleAssignment = null;
    const roleStartDate = start_date ? new Date(start_date) : new Date();
    const roleEndDate = end_date ? new Date(end_date) : null;

    switch (role_type.toLowerCase()) {
      case 'coordinator':
        const program = await models.Program.findByPk(program_id);
        if (!program) {
          return res.status(404).json({ error: 'Program not found' });
        }
        roleAssignment = await models.Coordinator.create({
          lecturer_id,
          program_id,
          appointment_id: null,
          start_date: roleStartDate,
          end_date: roleEndDate,
        });
        break;

      case 'sme':
      case 'subjectmethodexpert':
        const course = await models.Course.findByPk(course_id);
        if (!course) {
          return res.status(404).json({ error: 'Course not found' });
        }
        roleAssignment = await models.SubjectMethodExpert.create({
          lecturer_id,
          course_id,
          application_id: null,
          start_date: roleStartDate,
          end_date: roleEndDate,
        });
        break;

      case 'hos':
      case 'headofsection':
        roleAssignment = await models.HeadOfSection.create({
          lecturer_id,
          start_date: roleStartDate,
          end_date: roleEndDate,
        });
        break;

      default:
        return res.status(400).json({
          error: 'Invalid role_type. Must be: coordinator, sme, or hos',
        });
    }

    res.json({
      message: 'Lecturer role updated successfully',
      lecturer_id,
      role_assignment: roleAssignment,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Remove/End staff role assignment (set end_date)
async function endStaffRole(req, res) {
  try {
    const { role_type, role_id } = req.body;

    if (!role_type || !role_id) {
      return res.status(400).json({
        error: 'Missing required fields: role_type and role_id are required',
      });
    }

    let result;
    const endDate = new Date();

    switch (role_type.toLowerCase()) {
      case 'coordinator':
        result = await models.Coordinator.update(
          { end_date: endDate },
          { where: { coordinator_id: role_id } }
        );
        if (result[0] === 0) {
          return res.status(404).json({ error: 'Coordinator assignment not found' });
        }
        break;

      case 'sme':
      case 'subjectmethodexpert':
        result = await models.SubjectMethodExpert.update(
          { end_date: endDate },
          { where: { sme_id: role_id } }
        );
        if (result[0] === 0) {
          return res.status(404).json({ error: 'Subject Method Expert assignment not found' });
        }
        break;

      case 'hos':
      case 'headofsection':
        result = await models.HeadOfSection.update(
          { end_date: endDate },
          { where: { hos_id: role_id } }
        );
        if (result[0] === 0) {
          return res.status(404).json({ error: 'Head of Section assignment not found' });
        }
        break;

      default:
        return res.status(400).json({
          error: 'Invalid role_type. Must be: coordinator, sme, or hos',
        });
    }

    res.json({
      message: `${role_type} role ended successfully`,
      end_date: endDate,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createLecturer,
  getLecturers,
  getStudents,
  getPrograms,
  getCourses,
  updateLecturerRole,
  getStaffAssignments,
  // Keep old endpoints for backward compatibility (optional - can remove later)
  assignCoordinator,
  assignSubjectMethodExpert,
  assignHeadOfSection,
  endStaffRole,
};

