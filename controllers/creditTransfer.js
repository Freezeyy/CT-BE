const models = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/syllabi';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `syllabus-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
}).array('syllabus');

// Helper function to process mappings and create subjects
async function processMappings(application, mappingsArray, files, isDraft = false) {
  const usedFiles = new Set();
  
  for (const mapping of mappingsArray) {
    const { currentSubject, pastSubjects } = mapping;

    if (!currentSubject || !pastSubjects || !Array.isArray(pastSubjects)) {
      continue;
    }

    // Create new application subject
    const newApplicationSubject = await models.NewApplicationSubject.create({
      application_subject_name: currentSubject,
      ct_id: application.ct_id,
    });

    // Create past application subjects
    for (const pastSubject of pastSubjects) {
      const { code, name, grade, syllabus: syllabusFileName } = pastSubject;

      let syllabusPath = null;

      // For drafts, syllabus file is optional
      // For submitted, syllabus file is required
      if (syllabusFileName) {
        // Find corresponding uploaded file by originalname (not yet used)
        const uploadedFile = files.find(
          (file, index) => 
            file.originalname === syllabusFileName && 
            !usedFiles.has(index)
        );
        
        if (uploadedFile) {
          // Mark file as used
          const fileIndex = files.indexOf(uploadedFile);
          usedFiles.add(fileIndex);

          // Save file to disk
          const uploadPath = 'uploads/syllabi';
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
          const filename = `syllabus-${uniqueSuffix}${path.extname(uploadedFile.originalname)}`;
          const filePath = path.join(uploadPath, filename);
          
          // Write file to disk
          fs.writeFileSync(filePath, uploadedFile.buffer);
          syllabusPath = `/uploads/syllabi/${filename}`;
        } else if (!isDraft) {
          // For submitted applications, file is required
          throw new Error(`Syllabus file not found: ${syllabusFileName}`);
        }
      }

      // Create past application subject with file path (can be null for drafts)
      await models.PastApplicationSubject.create({
        pastSubject_code: code,
        pastSubject_name: name,
        pastSubject_grade: grade,
        pastSubject_syllabus_path: syllabusPath,
        application_subject_id: newApplicationSubject.application_subject_id,
      });
    }
  }
}

// Submit credit transfer application (create new or update draft)
// Note: This function expects multer middleware to be applied in the route
async function submitApplication(req, res) {
  try {
    const {
      programCode,
      status,
      mappings,
      draftId, // Optional: if updating existing draft
    } = req.body;

    // Validate required fields
    if (!programCode || !status || !mappings) {
      return res.status(400).json({ 
        error: 'Missing required fields: programCode, status, and mappings are required' 
      });
    }

    // Parse mappings if it's a string
    let mappingsArray;
    try {
      mappingsArray = typeof mappings === 'string' ? JSON.parse(mappings) : mappings;
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid mappings format. Must be valid JSON' });
    }

    // Get student from authenticated user
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can submit applications' });
    }

    // Get program by code
    const program = await models.Program.findOne({
      where: { program_code: programCode },
    });

    if (!program) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Automatically find coordinator for this program
    const coordinator = await models.Coordinator.findOne({
      where: {
        program_id: program.program_id,
        end_date: null, // Active coordinator
      },
    });

    if (!coordinator) {
      return res.status(404).json({ 
        error: 'No coordinator found for this program. Please contact administrator.' 
      });
    }

    const isDraft = status === 'draft';
    const files = (req.files || []).filter(file => file.fieldname === 'syllabus');

    // For submitted applications, require at least one file
    if (!isDraft && files.length === 0) {
      return res.status(400).json({ error: 'At least one syllabus file is required for submission' });
    }

    let application;

    // If updating draft
    if (draftId) {
      application = await models.CreditTransferApplication.findOne({
        where: {
          ct_id: draftId,
          student_id: studentId,
          ct_status: 'draft', // Only allow updating drafts
        },
      });

      if (!application) {
        return res.status(404).json({ error: 'Draft not found or already submitted' });
      }

      // Update application
      await application.update({
        ct_status: status,
        coordinator_id: coordinator.coordinator_id, // Update coordinator in case it changed
        program_id: program.program_id,
      });

      // Delete existing subjects to recreate them
      const existingSubjects = await models.NewApplicationSubject.findAll({
        where: { ct_id: application.ct_id },
      });

      for (const subject of existingSubjects) {
        await models.PastApplicationSubject.destroy({
          where: { application_subject_id: subject.application_subject_id },
        });
        await subject.destroy();
      }

      // Process mappings
      await processMappings(application, mappingsArray, files, isDraft);
    } else {
      // Create new application
      application = await models.CreditTransferApplication.create({
        ct_status: status,
        ct_notes: null,
        prev_campus_name: null, // Will be set by coordinator
        student_id: studentId,
        coordinator_id: coordinator.coordinator_id,
        program_id: program.program_id,
      });

      // Process mappings
      await processMappings(application, mappingsArray, files, isDraft);
    }

    res.status(draftId ? 200 : 201).json({
      message: isDraft 
        ? 'Draft saved successfully' 
        : 'Application submitted successfully',
      application_id: application.ct_id,
      application,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


// Get student's applications
async function getStudentApplications(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can view their applications' });
    }

    const applications = await models.CreditTransferApplication.findAll({
      where: { student_id: studentId },
      include: [
        {
          model: models.Program,
          as: 'program',
          attributes: ['program_id', 'program_name', 'program_code'],
        },
        {
          model: models.Coordinator,
          as: 'coordinator',
          include: [{
            model: models.Lecturer,
            as: 'lecturer',
            attributes: ['lecturer_name', 'lecturer_email'],
          }],
        },
        {
          model: models.NewApplicationSubject,
          as: 'newApplicationSubjects',
          include: [{
            model: models.PastApplicationSubject,
            as: 'pastApplicationSubjects',
          }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ applications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get applications for coordinator's program
async function getCoordinatorApplications(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can view applications' });
    }

    // Get coordinator record
    const coordinator = await models.Coordinator.findOne({
      where: { lecturer_id: lecturerId },
    });

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator not found' });
    }

    // Get applications for coordinator's program
    const applications = await models.CreditTransferApplication.findAll({
      where: {
        coordinator_id: coordinator.coordinator_id,
        program_id: coordinator.program_id,
      },
      include: [
        {
          model: models.Student,
          as: 'student',
          attributes: ['student_id', 'student_name', 'student_email', 'student_phone'],
        },
        {
          model: models.Program,
          as: 'program',
          attributes: ['program_id', 'program_name', 'program_code'],
        },
        {
          model: models.NewApplicationSubject,
          as: 'newApplicationSubjects',
          include: [{
            model: models.PastApplicationSubject,
            as: 'pastApplicationSubjects',
          }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ applications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Update application (e.g., set prev_campus_name, update status)
async function updateApplication(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can update applications' });
    }

    const { applicationId } = req.params;
    const { ct_status, ct_notes, prev_campus_name, old_campus_id } = req.body;

    // Get coordinator
    const coordinator = await models.Coordinator.findOne({
      where: { lecturer_id: lecturerId },
    });

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator not found' });
    }

    // Get application
    const application = await models.CreditTransferApplication.findOne({
      where: {
        ct_id: applicationId,
        coordinator_id: coordinator.coordinator_id,
      },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application
    const updateData = {};
    if (ct_status) updateData.ct_status = ct_status;
    if (ct_notes !== undefined) updateData.ct_notes = ct_notes;
    if (prev_campus_name) updateData.prev_campus_name = prev_campus_name;

    await application.update(updateData);

    // If old_campus_id is provided, update student's old_campus_id
    if (old_campus_id) {
      await models.Student.update(
        { old_campus_id },
        { where: { student_id: application.student_id } }
      );
    }

    res.json({ message: 'Application updated successfully', application });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  submitApplication,
  getStudentApplications,
  getCoordinatorApplications,
  updateApplication,
  uploadMiddleware, // Export for use in routes if needed
};

