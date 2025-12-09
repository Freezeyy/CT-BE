const models = require('../models');
const path = require('path');
const fs = require('fs');

// Get program structure (for students)
async function getProgramStructure(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can view program structure' });
    }

    const student = await models.Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const program = await models.Program.findByPk(student.program_id, {
      attributes: ['program_id', 'program_name', 'program_code', 'program_structure'],
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    res.json({ program });
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

// Get courses for a program (for student to select current subjects)
async function getProgramCourses(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can view program courses' });
    }

    const student = await models.Student.findByPk(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const courses = await models.Course.findAll({
      where: { program_id: student.program_id },
      attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
      order: [['course_name', 'ASC']],
    });

    res.json({ courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getProgramStructure,
  uploadProgramStructure,
  getProgramCourses,
};

