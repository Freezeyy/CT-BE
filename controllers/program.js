const models = require('../models');
const path = require('path');
const fs = require('fs');

// Get program structure (and optionally courses) for students and coordinators
// Query params: includeCourses=true to also get courses
async function getProgramStructure(req, res) {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const includeCourses = req.query.includeCourses === 'true' || req.query.courses === 'true';

    if (!userId) {
      return res.status(403).json({ error: 'User not authenticated' });
    }

    let programId = null;

    // If student, get program from student record
    if (userType === 'student') {
      const student = await models.Student.findByPk(userId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }
      programId = student.program_id;
    } 
    // If lecturer (coordinator or admin), get program from coordinator record or query
    else if (userType === 'lecturer') {
      // Check if admin - admins can view any program by specifying program_id in query
      const isAdmin = req.user.is_admin === true || req.user.is_admin === 1 || req.user.is_admin === '1';
      
      if (isAdmin && req.query.program_id) {
        // Admin can view any program by specifying program_id
        programId = parseInt(req.query.program_id);
      } else {
        // Coordinator - get program from coordinator record
        const coordinator = await models.Coordinator.findOne({
          where: {
            lecturer_id: userId,
            end_date: null, // Active coordinator only
          },
        });

        if (!coordinator) {
          return res.status(404).json({ 
            error: 'Coordinator not found. You must be an active coordinator to view program structure.' 
          });
        }
        programId = coordinator.program_id;
      }
    }
    else {
      return res.status(403).json({ error: 'Only students and coordinators can view program structure' });
    }

    if (!programId) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const program = await models.Program.findByPk(programId, {
      attributes: ['program_id', 'program_name', 'program_code', 'program_structure'],
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const response = { program };

    // If courses are requested, fetch and include them via the many-to-many relationship
    if (includeCourses) {
      const courses = await models.Course.findAll({
        attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
        include: [{
          model: models.Program,
          as: 'programs',
          where: { program_id: programId },
          attributes: [],
          through: { attributes: [] },
          required: true,
        }],
        order: [['course_name', 'ASC']],
      });
      response.courses = courses;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Upload/Update program structure (for coordinators)
async function uploadProgramStructure(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can upload program structure' });
    }

    // Get coordinator's program (must be active coordinator)
    const coordinator = await models.Coordinator.findOne({
      where: { 
        lecturer_id: lecturerId,
        end_date: null, // Active coordinator only
      },
      include: [{
        model: models.Program,
        as: 'program',
        attributes: ['program_id', 'program_name', 'program_code'],
        required: true, // Inner join - must have program
      }],
    });

    if (!coordinator) {
      return res.status(404).json({ 
        error: 'Coordinator not found. You must be an active coordinator to upload program structure.' 
      });
    }

    if (!coordinator.program) {
      return res.status(404).json({ 
        error: 'Program not found for this coordinator.' 
      });
    }

    // Get uploaded file (from global multer in app.js)
    // Global multer stores files in req.files array
    let uploadedFile = null;
    
    // Check req.files array (from upload.any())
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // Find file with fieldname 'program_structure'
      uploadedFile = req.files.find(file => file.fieldname === 'program_structure');
      // If not found by fieldname, use first file (fallback)
      if (!uploadedFile) {
        uploadedFile = req.files[0];
      }
    } else if (req.file) {
      // Single file upload
      uploadedFile = req.file;
    }

    if (!uploadedFile) {
      return res.status(400).json({ 
        error: 'Program structure file is required. Please upload a file with field name "program_structure".',
        received: {
          hasFiles: !!req.files,
          filesCount: req.files ? req.files.length : 0,
          hasFile: !!req.file,
        }
      });
    }

    // Validate file type (PDF only)
    if (uploadedFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed for program structure' });
    }

    // Save file to disk
    const uploadPath = 'uploads/programs';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    // Use program code in filename for easier identification
    const programCode = coordinator.program.program_code.toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${programCode}-structure-${uniqueSuffix}${path.extname(uploadedFile.originalname)}`;
    const filePath = path.join(uploadPath, filename);
    
    // Write file to disk - handle both buffer and file stream
    if (uploadedFile.buffer) {
      fs.writeFileSync(filePath, uploadedFile.buffer);
    } else {
      // If no buffer, try to read from path (multer diskStorage)
      if (uploadedFile.path) {
        fs.copyFileSync(uploadedFile.path, filePath);
      } else {
        return res.status(400).json({ error: 'File data not available' });
      }
    }

    // Update program with structure file path
    const dbFilePath = `/uploads/programs/${filename}`;
    await models.Program.update(
      { program_structure: dbFilePath },
      { where: { program_id: coordinator.program_id } }
    );

    res.json({
      message: 'Program structure uploaded successfully',
      program: {
        program_id: coordinator.program_id,
        program_name: coordinator.program.program_name,
        program_code: coordinator.program.program_code,
      },
      file_path: dbFilePath,
    });
  } catch (error) {
    console.error('Upload program structure error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Update courses for a program (for coordinators)
// Accepts array of courses: creates new ones, updates existing ones (by course_id), deletes removed ones
async function updateCourses(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can manage courses' });
    }

    // Get coordinator's program (must be active coordinator)
    const coordinator = await models.Coordinator.findOne({
      where: { 
        lecturer_id: lecturerId,
        end_date: null, // Active coordinator only
      },
      include: [{
        model: models.Program,
        as: 'program',
        attributes: ['program_id', 'program_name', 'program_code', 'campus_id'],
        required: true,
      }],
    });

    if (!coordinator || !coordinator.program) {
      return res.status(404).json({ 
        error: 'Coordinator not found. You must be an active coordinator to manage courses.' 
      });
    }

    const programId = coordinator.program_id;
    const campusId = coordinator.program.campus_id;

    // Parse courses from request body
    let coursesArray;
    if (req.body.courses) {
      coursesArray = typeof req.body.courses === 'string' 
        ? JSON.parse(req.body.courses) 
        : req.body.courses;
    } else {
      return res.status(400).json({ error: 'courses array is required' });
    }

    if (!Array.isArray(coursesArray)) {
      return res.status(400).json({ error: 'courses must be an array' });
    }

    // Get existing courses for this program via the many-to-many relationship
    const program = await models.Program.findByPk(programId, {
      include: [{
        model: models.Course,
        as: 'courses',
        attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
        through: { attributes: [] },
      }],
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    const existingCourses = program.courses || [];
    const existingCourseIds = new Set(existingCourses.map(c => c.course_id));
    const incomingCourseIds = new Set(
      coursesArray
        .filter(c => c.course_id)
        .map(c => c.course_id)
    );

    // Remove courses from this program that are not in the incoming array
    // Note: We're removing the association, not deleting the course itself
    // (since courses can belong to multiple programs)
    const coursesToRemove = existingCourses.filter(
      c => !incomingCourseIds.has(c.course_id)
    );

    const removalErrors = [];
    const successfullyRemoved = [];

    for (const course of coursesToRemove) {
      try {
        // Remove the association between program and course
        await program.removeCourse(course);
        successfullyRemoved.push(course.course_id);
      } catch (error) {
        removalErrors.push({
          course_id: course.course_id,
          course_code: course.course_code,
          course_name: course.course_name,
          reason: error.message,
        });
      }
    }

    // Process each course: create or update, then associate with program
    const processedCourses = [];
    for (const courseData of coursesArray) {
      const { course_id, course_code, course_name, course_credit } = courseData;

      // Validate required fields
      if (!course_code || !course_name) {
        continue; // Skip invalid courses
      }

      const courseCredit = course_credit ? parseInt(course_credit) : null;
      let course;

      if (course_id && existingCourseIds.has(course_id)) {
        // Update existing course
        await models.Course.update(
          {
            course_code,
            course_name,
            course_credit: courseCredit,
          },
          { where: { course_id } }
        );
        course = await models.Course.findByPk(course_id);
        processedCourses.push(course_id);
      } else if (course_id) {
        // Course exists but is not associated with this program yet
        // Check if course exists in database
        course = await models.Course.findByPk(course_id);
        if (course) {
          // Update course details
          await course.update({
            course_code,
            course_name,
            course_credit: courseCredit,
          });
          // Associate with this program
          await program.addCourse(course);
          processedCourses.push(course_id);
        } else {
          // Course ID provided but doesn't exist - create new
          course = await models.Course.create({
            course_code,
            course_name,
            course_credit: courseCredit,
            campus_id: campusId,
          });
          await program.addCourse(course);
          processedCourses.push(course.course_id);
        }
      } else {
        // Create new course - but first check if a course with the same code already exists
        // This prevents duplicate courses when the same course is added to multiple programs
        const existingCourse = await models.Course.findOne({
          where: {
            course_code,
            campus_id: campusId,
          },
        });

        if (existingCourse) {
          // Course already exists - just associate it with this program
          // Check if already associated
          const isAssociated = await program.hasCourse(existingCourse);
          if (!isAssociated) {
            await program.addCourse(existingCourse);
          }
          // Update course details in case they changed
          await existingCourse.update({
            course_name,
            course_credit: courseCredit,
          });
          processedCourses.push(existingCourse.course_id);
        } else {
          // Course doesn't exist - create new one
          course = await models.Course.create({
            course_code,
            course_name,
            course_credit: courseCredit,
            campus_id: campusId,
          });
          // Associate with this program
          await program.addCourse(course);
          processedCourses.push(course.course_id);
        }
      }
    }

    // Fetch updated courses list for this program
    const updatedProgram = await models.Program.findByPk(programId, {
      include: [{
        model: models.Course,
        as: 'courses',
        attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
        through: { attributes: [] },
      }],
    });
    const updatedCourses = updatedProgram.courses || [];

    // Build response
    const response = {
      message: 'Courses updated successfully',
      courses: updatedCourses,
    };

    // Include warnings if some courses couldn't be removed from this program
    if (removalErrors.length > 0) {
      response.warnings = removalErrors;
      response.message = `Courses updated successfully, but ${removalErrors.length} course(s) could not be removed from this program.`;
    }

    // Include info about successful removals
    if (successfullyRemoved.length > 0) {
      response.removed = successfullyRemoved;
    }

    res.json(response);
  } catch (error) {
    console.error('Update courses error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = {
  getProgramStructure,
  uploadProgramStructure,
  updateCourses,
};

