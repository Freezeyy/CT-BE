const bcrypt = require('bcrypt');
const models = require('../models');
const Student = models.Student;
const Lecturer = models.Lecturer;

function isSuperAdmin(req) {
  const isAdmin = req.user?.is_admin === true || req.user?.is_admin === 1 || req.user?.is_admin === '1';
  const isSuper = req.user?.is_superadmin === true || req.user?.is_superadmin === 1 || req.user?.is_superadmin === '1';
  return req.user?.userType === 'lecturer' && isAdmin && isSuper;
}

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

    // Campus admins can only create lecturers for their own campus.
    // Super Admin can create for any campus (must provide campus_id).
    let lecturerCampusId = adminCampusId;
    if (isSuperAdmin(req)) {
      if (!campus_id) {
        return res.status(400).json({ error: 'campus_id is required for Super Admin' });
      }
      lecturerCampusId = parseInt(campus_id);
    } else {
      lecturerCampusId = campus_id ? parseInt(campus_id) : adminCampusId;
      if (lecturerCampusId !== adminCampusId) {
        return res.status(403).json({
          error: 'You can only create lecturers for your own campus',
        });
      }
      lecturerCampusId = adminCampusId;
    }

    // Check if email already exists
    const existingStudent = await Student.findOne({ where: { student_email: lecturer_email } });
    const existingLecturer = await Lecturer.findOne({ where: { lecturer_email } });

    if (existingStudent || existingLecturer) {
      return res.status(409).json({ error: 'That email is already taken' });
    }

    // Hash password
    const hashpass = bcrypt.hashSync(lecturer_password, bcrypt.genSaltSync());

    // Create lecturer
    const newLecturer = await Lecturer.create({
      lecturer_name,
      lecturer_email,
      lecturer_password: hashpass,
      lecturer_image: lecturer_image || null,
      is_admin: is_admin || false,
      campus_id: lecturerCampusId,
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
    const campusFilter = req.query.campus_id ? parseInt(req.query.campus_id) : null;

    // Build where clause
    const { Op } = require('sequelize');
    const whereClause = isSuperAdmin(req) ? {} : { campus_id: adminCampusId };

    // Optional campus filter (Super Admin only)
    if (isSuperAdmin(req) && campusFilter) {
      whereClause.campus_id = campusFilter;
    }

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

// Assign lecturer as Subject Matter Expert
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
        error: 'This lecturer is already a Subject Matter Expert for this course',
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
      message: 'Subject Matter Expert assigned successfully',
      sme,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Assign lecturer as Head of Section
async function assignHeadOfSection(req, res) {
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

    // Check if HOS already exists for this lecturer + program
    const existingHOS = await models.HeadOfSection.findOne({
      where: {
        lecturer_id,
        program_id,
        end_date: null, // Active HOS
      },
    });

    if (existingHOS) {
      return res.status(409).json({ error: 'This lecturer is already a Head of Section for this program' });
    }

    // Create HOS assignment
    const hos = await models.HeadOfSection.create({
      lecturer_id,
      program_id,
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

    // Optional campus filter (Super Admin only)
    const campusFilter = req.query.campus_id ? parseInt(req.query.campus_id) : null;
    const whereClause = isSuperAdmin(req)
      ? (campusFilter ? { campus_id: campusFilter } : {})
      : { campus_id: adminCampusId };

    // Get all programs for this campus (Super Admin sees all campuses)
    const programs = await models.Program.findAll({
      where: whereClause,
      attributes: ['program_id', 'program_name', 'program_code', 'campus_id'],
      include: [{
        model: models.Campus,
        as: 'campus',
        attributes: ['campus_name'],
      }],
      order: [['program_code', 'ASC']],
    });

    res.json({ programs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create a program (admin only; campus admins only for own campus)
async function createProgram(req, res) {
  try {
    const lecturerId = req.user.id;
    const userType = req.user.userType;

    if (userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can create programs' });
    }

    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer?.campus_id) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }

    const adminCampusId = adminLecturer.campus_id;
    const { program_name, program_code, campus_id, program_structure } = req.body;

    if (!program_name || !program_code) {
      return res.status(400).json({ error: 'program_name and program_code are required' });
    }

    let programCampusId = adminCampusId;
    if (isSuperAdmin(req)) {
      if (!campus_id) {
        return res.status(400).json({ error: 'campus_id is required for Super Admin' });
      }
      programCampusId = parseInt(campus_id);
    } else if (campus_id && parseInt(campus_id) !== adminCampusId) {
      return res.status(403).json({ error: 'You can only create programs for your own campus' });
    }

    const campus = await models.Campus.findByPk(programCampusId);
    if (!campus) {
      return res.status(404).json({ error: 'Campus not found' });
    }

    const program = await models.Program.create({
      program_name: String(program_name).trim(),
      program_code: String(program_code).trim(),
      program_structure: program_structure ?? null,
      campus_id: programCampusId,
    });

    res.status(201).json({ program });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update a program (admin only; campus admins only for own campus)
async function updateProgram(req, res) {
  try {
    const lecturerId = req.user.id;
    const userType = req.user.userType;

    if (userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can update programs' });
    }

    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer?.campus_id) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }
    const adminCampusId = adminLecturer.campus_id;

    const { program_id } = req.params;
    const program = await models.Program.findByPk(program_id);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    if (!isSuperAdmin(req) && program.campus_id !== adminCampusId) {
      return res.status(403).json({ error: 'You can only update programs for your own campus' });
    }

    const { program_name, program_code, program_structure, campus_id } = req.body;

    if (!isSuperAdmin(req) && campus_id && parseInt(campus_id) !== adminCampusId) {
      return res.status(403).json({ error: 'You cannot change program campus' });
    }

    if (isSuperAdmin(req) && campus_id) {
      const newCampusId = parseInt(campus_id);
      const campus = await models.Campus.findByPk(newCampusId);
      if (!campus) return res.status(404).json({ error: 'Campus not found' });
      program.campus_id = newCampusId;
    }

    if (program_name !== undefined) program.program_name = String(program_name).trim();
    if (program_code !== undefined) program.program_code = String(program_code).trim();
    if (program_structure !== undefined) program.program_structure = program_structure ?? null;

    await program.save();
    res.json({ program });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Delete a program (admin only; campus admins only for own campus)
async function deleteProgram(req, res) {
  try {
    const lecturerId = req.user.id;
    const userType = req.user.userType;

    if (userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can delete programs' });
    }

    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer?.campus_id) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }
    const adminCampusId = adminLecturer.campus_id;

    const { program_id } = req.params;
    const program = await models.Program.findByPk(program_id);
    if (!program) return res.status(404).json({ error: 'Program not found' });

    if (!isSuperAdmin(req) && program.campus_id !== adminCampusId) {
      return res.status(403).json({ error: 'You can only delete programs for your own campus' });
    }

    // Prevent delete if program is referenced
    const [studentCount, appCount, coordinatorCount, programCourseCount] = await Promise.all([
      models.Student.count({ where: { program_id: program.program_id } }),
      models.CreditTransferApplication.count({ where: { program_id: program.program_id } }),
      models.Coordinator.count({ where: { program_id: program.program_id, end_date: null } }),
      models.ProgramCourse.count({ where: { program_id: program.program_id } }),
    ]);

    if (studentCount > 0 || appCount > 0 || coordinatorCount > 0 || programCourseCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete program: program is in use',
        details: { studentCount, appCount, coordinatorCount, programCourseCount },
      });
    }

    await program.destroy();
    res.json({ message: 'Program deleted successfully' });
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

    const campusFilter = req.query.campus_id ? parseInt(req.query.campus_id) : null;
    const programFilter = req.query.program_id ? parseInt(req.query.program_id) : null;

    const whereClause = isSuperAdmin(req)
      ? (campusFilter ? { campus_id: campusFilter } : {})
      : { campus_id: adminCampusId };

    const courses = await models.Course.findAll({
      where: whereClause,
      attributes: ['course_id', 'course_name', 'course_code', 'course_credit', 'campus_id', 'category_id'],
      include: [
        {
          model: models.Campus,
          as: 'campus',
          attributes: ['campus_id', 'campus_name'],
          required: false,
        },
        ...(programFilter
          ? [{
              model: models.Program,
              as: 'programs',
              attributes: ['program_id'],
              through: { attributes: [] },
              required: false,
              where: { program_id: programFilter },
            }]
          : []),
      ],
      order: [['course_code', 'ASC']],
    });

    const out = courses.map((c) => {
      const json = c.toJSON();
      return {
        ...json,
        is_in_program: programFilter ? (json.programs || []).length > 0 : undefined,
      };
    });

    res.json({ courses: out });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create a course (admin only; campus admins only for own campus)
async function createCourse(req, res) {
  try {
    const lecturerId = req.user.id;
    if (req.user.userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can create courses' });
    }

    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer?.campus_id) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }

    const adminCampusId = adminLecturer.campus_id;
    const { course_name, course_code, course_credit, campus_id, category_id, program_ids } = req.body;

    if (!course_name || !course_code) {
      return res.status(400).json({ error: 'course_name and course_code are required' });
    }

    let courseCampusId = adminCampusId;
    if (isSuperAdmin(req)) {
      if (campus_id) courseCampusId = parseInt(campus_id);
    } else if (campus_id && parseInt(campus_id) !== adminCampusId) {
      return res.status(403).json({ error: 'You can only create courses for your own campus' });
    }

    const campus = await models.Campus.findByPk(courseCampusId);
    if (!campus) return res.status(404).json({ error: 'Campus not found' });

    const existing = await models.Course.findOne({
      where: { course_code: String(course_code).trim(), campus_id: courseCampusId },
      attributes: ['course_id'],
    });
    if (existing) return res.status(409).json({ error: 'Course code already exists for this campus' });

    const course = await models.Course.create({
      course_name: String(course_name).trim(),
      course_code: String(course_code).trim(),
      course_credit: course_credit != null && course_credit !== '' ? parseInt(course_credit) : null,
      campus_id: courseCampusId,
      category_id: category_id != null && category_id !== '' ? parseInt(category_id) : null,
    });

    if (Array.isArray(program_ids) && program_ids.length > 0) {
      const programs = await models.Program.findAll({
        where: { program_id: { [require('sequelize').Op.in]: program_ids.map((x) => parseInt(x)) } },
        attributes: ['program_id', 'campus_id'],
      });
      const allowed = isSuperAdmin(req)
        ? programs.filter((p) => !courseCampusId || p.campus_id === courseCampusId)
        : programs.filter((p) => p.campus_id === adminCampusId);
      if (allowed.length > 0) await course.addPrograms(allowed);
    }

    const created = await models.Course.findByPk(course.course_id, {
      attributes: ['course_id', 'course_name', 'course_code', 'course_credit', 'campus_id', 'category_id'],
      include: [{ model: models.Campus, as: 'campus', attributes: ['campus_id', 'campus_name'], required: false }],
    });

    res.status(201).json({ course: created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update a course (admin only; campus admins only for own campus)
async function updateCourse(req, res) {
  try {
    const lecturerId = req.user.id;
    if (req.user.userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can update courses' });
    }

    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer?.campus_id) return res.status(400).json({ error: 'Admin must have a campus_id assigned' });

    const adminCampusId = adminLecturer.campus_id;
    const { course_id } = req.params;
    const course = await models.Course.findByPk(course_id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (!isSuperAdmin(req) && course.campus_id !== adminCampusId) {
      return res.status(403).json({ error: 'You can only update courses for your own campus' });
    }

    const { course_name, course_code, course_credit, category_id } = req.body;
    if (course_code) {
      const exists = await models.Course.findOne({
        where: {
          course_code: String(course_code).trim(),
          campus_id: course.campus_id,
          course_id: { [require('sequelize').Op.ne]: course.course_id },
        },
        attributes: ['course_id'],
      });
      if (exists) return res.status(409).json({ error: 'Course code already exists for this campus' });
    }

    await course.update({
      ...(course_name != null ? { course_name: String(course_name).trim() } : {}),
      ...(course_code != null ? { course_code: String(course_code).trim() } : {}),
      ...(course_credit != null ? { course_credit: course_credit === '' ? null : parseInt(course_credit) } : {}),
      ...(category_id != null ? { category_id: category_id === '' ? null : parseInt(category_id) } : {}),
    });

    const updated = await models.Course.findByPk(course.course_id, {
      attributes: ['course_id', 'course_name', 'course_code', 'course_credit', 'campus_id', 'category_id'],
      include: [{ model: models.Campus, as: 'campus', attributes: ['campus_id', 'campus_name'], required: false }],
    });
    res.json({ course: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Delete a course (admin only; campus admins only for own campus)
async function deleteCourse(req, res) {
  try {
    const lecturerId = req.user.id;
    if (req.user.userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can delete courses' });
    }

    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer?.campus_id) return res.status(400).json({ error: 'Admin must have a campus_id assigned' });

    const adminCampusId = adminLecturer.campus_id;
    const { course_id } = req.params;
    const course = await models.Course.findByPk(course_id);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    if (!isSuperAdmin(req) && course.campus_id !== adminCampusId) {
      return res.status(403).json({ error: 'You can only delete courses for your own campus' });
    }

    const [smeCount, template3Count, programCourseCount, newSubCount] = await Promise.all([
      models.SubjectMethodExpert.count({ where: { course_id: course.course_id, end_date: null } }),
      models.Template3 ? models.Template3.count({ where: { course_id: course.course_id } }) : 0,
      models.ProgramCourse.count({ where: { course_id: course.course_id } }),
      models.NewApplicationSubject ? models.NewApplicationSubject.count({ where: { course_id: course.course_id } }) : 0,
    ]);

    if (smeCount > 0 || template3Count > 0 || programCourseCount > 0 || newSubCount > 0) {
      return res.status(409).json({
        error: 'Cannot delete course: course is in use',
        details: { smeCount, template3Count, programCourseCount, newSubCount },
      });
    }

    await course.destroy();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Replace program-course mappings for a program (admin/superadmin)
async function setProgramCourses(req, res) {
  try {
    const lecturerId = req.user.id;
    if (req.user.userType !== 'lecturer' || !req.user.is_admin) {
      return res.status(403).json({ error: 'Only administrators can update program courses' });
    }

    const adminLecturer = await Lecturer.findByPk(lecturerId);
    if (!adminLecturer?.campus_id) return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    const adminCampusId = adminLecturer.campus_id;

    const { program_id } = req.params;
    const program = await models.Program.findByPk(program_id, { attributes: ['program_id', 'campus_id'] });
    if (!program) return res.status(404).json({ error: 'Program not found' });

    if (!isSuperAdmin(req) && program.campus_id !== adminCampusId) {
      return res.status(403).json({ error: 'You can only update programs for your own campus' });
    }

    const { course_ids } = req.body;
    if (!Array.isArray(course_ids)) return res.status(400).json({ error: 'course_ids[] is required' });

    const ids = course_ids.map((x) => parseInt(x)).filter(Boolean);
    const courses = await models.Course.findAll({
      where: { course_id: { [require('sequelize').Op.in]: ids } },
      attributes: ['course_id', 'campus_id'],
    });

    // Only allow attaching courses from the same campus as the program
    const allowed = courses.filter((c) => c.campus_id === program.campus_id);

    await models.ProgramCourse.destroy({ where: { program_id: program.program_id } });
    if (allowed.length > 0) {
      await models.ProgramCourse.bulkCreate(
        allowed.map((c) => ({ program_id: program.program_id, course_id: c.course_id }))
      );
    }

    res.json({ message: 'Program courses updated', program_id: program.program_id, course_ids: allowed.map((c) => c.course_id) });
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
        {
          model: models.Program,
          as: 'program',
          attributes: ['program_id', 'program_name', 'program_code'],
          required: false,
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

    // Campus admins can only manage staff within their own campus.
    // Super Admin can manage any campus.
    const adminLecturer = await Lecturer.findByPk(req.user.id);
    if (!adminLecturer?.campus_id) {
      return res.status(400).json({ error: 'Admin must have a campus_id assigned' });
    }
    const adminCampusId = adminLecturer.campus_id;
    if (!isSuperAdmin(req) && lecturer.campus_id !== adminCampusId) {
      return res.status(403).json({ error: 'You can only manage lecturers for your own campus' });
    }

    // If role_type is null or not provided, just end all roles
    if (!role_type) {
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

    // Validate campus alignment for role assignment (prevents cross-campus roles)
    if (role_type.toLowerCase() === 'coordinator') {
      const program = await models.Program.findByPk(program_id);
      if (!program) return res.status(404).json({ error: 'Program not found' });
      if (program.campus_id !== lecturer.campus_id) {
        return res.status(400).json({ error: 'Selected program is not in the lecturer’s campus' });
      }
    }
    if (role_type.toLowerCase() === 'sme' || role_type.toLowerCase() === 'subjectmethodexpert') {
      const course = await models.Course.findByPk(course_id);
      if (!course) return res.status(404).json({ error: 'Course not found' });
      if (course.campus_id !== lecturer.campus_id) {
        return res.status(400).json({ error: 'Selected course is not in the lecturer’s campus' });
      }
    }

    // End all existing active roles for this lecturer (only after request is validated)
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

    switch (role_type.toLowerCase()) {
      case 'coordinator':
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
        if (!program_id) {
          return res.status(400).json({ error: 'program_id is required for HOS role' });
        }
        roleAssignment = await models.HeadOfSection.create({
          lecturer_id,
          program_id,
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
          return res.status(404).json({ error: 'Subject Matter Expert assignment not found' });
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
  createProgram,
  updateProgram,
  deleteProgram,
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  setProgramCourses,
  updateLecturerRole,
  getStaffAssignments,
  // Keep old endpoints for backward compatibility (optional - can remove later)
  assignCoordinator,
  assignSubjectMethodExpert,
  assignHeadOfSection,
  endStaffRole,
};

