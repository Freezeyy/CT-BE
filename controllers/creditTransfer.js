const models = require('../models');
const { Op, Sequelize } = require('sequelize');
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
async function processMappings(application, mappingsArray, files, isDraft = false, existingFilesMap = null) {
  const usedFiles = new Set();
  
  for (const mapping of mappingsArray) {
    const { currentSubject, course_id, pastSubjects } = mapping;

    if (!currentSubject || !pastSubjects || !Array.isArray(pastSubjects)) {
      continue;
    }

    // Determine course_id - use provided course_id or find by course name
    let resolvedCourseId = course_id;
    if (!resolvedCourseId) {
      // Fallback: find course by name matching (for backward compatibility)
      const course = await models.Course.findOne({
        where: {
          program_id: application.program_id,
          course_name: currentSubject,
        },
      });
      if (course) {
        resolvedCourseId = course.course_id;
      }
    }

    // Create new application subject
    const newApplicationSubject = await models.NewApplicationSubject.create({
      application_subject_name: currentSubject,
      course_id: resolvedCourseId, // Can be null if course not found (backward compatibility)
      ct_id: application.ct_id,
    });

    // Create past application subjects
    for (const pastSubject of pastSubjects) {
      const { code, name, grade, syllabus: syllabusFileName } = pastSubject;

      let syllabusPath = null;
      let originalFilename = null;

      // Check if we have an existing file for this subject (when updating draft to submitted)
      const existingFileKey = `${currentSubject}_${code}`;
      if (existingFilesMap && existingFilesMap.has(existingFileKey)) {
        const existingFile = existingFilesMap.get(existingFileKey);
        syllabusPath = existingFile.path;
        originalFilename = existingFile.originalFilename;
      }
      // If no existing file, try to find uploaded file
      else if (syllabusFileName) {
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

          // Store original filename
          originalFilename = uploadedFile.originalname;

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
        } else if (!isDraft && !syllabusPath) {
          // For submitted applications, file is required (unless we have existing file)
          throw new Error(`Syllabus file not found: ${syllabusFileName}`);
        }
      }

      // Create past application subject with file path (can be null for drafts)
      await models.PastApplicationSubject.create({
        pastSubject_code: code,
        pastSubject_name: name,
        pastSubject_grade: grade,
        pastSubject_syllabus_path: syllabusPath,
        original_filename: originalFilename,
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
      prevProgrammeName, // Previous programme name
      prevCampusName, // University/college/institute name
    } = req.body;

    // Debug logging (remove in production if not needed)
    console.log('Received form data:', {
      programCode,
      status,
      hasMappings: !!mappings,
      draftId,
      prevProgrammeName,
      prevCampusName,
    });

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
    const transcriptFile = (req.files || []).find(file => file.fieldname === 'transcript');

    // Check if this is updating a draft to submitted
    let hasExistingSyllabi = false;
    if (draftId && !isDraft) {
      // Check if the draft already has syllabus files
      const existingApp = await models.CreditTransferApplication.findOne({
        where: { ct_id: draftId, student_id: studentId },
        include: [{
          model: models.NewApplicationSubject,
          as: 'newApplicationSubjects',
          attributes: ['application_subject_id', 'application_subject_name', 'course_id', 'ct_id'],
          include: [
            {
              model: models.Course,
              as: 'course',
              attributes: ['course_id', 'course_name', 'course_code'],
            },
            {
              model: models.PastApplicationSubject,
              as: 'pastApplicationSubjects',
              attributes: ['pastSubject_syllabus_path'],
            },
          ],
        }],
      });
      
      if (existingApp) {
        // Check if any past subject has a syllabus path
        for (const subject of existingApp.newApplicationSubjects || []) {
          for (const pastSubject of subject.pastApplicationSubjects || []) {
            if (pastSubject.pastSubject_syllabus_path) {
              hasExistingSyllabi = true;
              break;
            }
          }
          if (hasExistingSyllabi) break;
        }
      }
    }

    // For submitted applications, require at least one syllabus file (either new upload or existing)
    if (!isDraft && files.length === 0 && !hasExistingSyllabi) {
      return res.status(400).json({ error: 'At least one syllabus file is required for submission. Please upload syllabus files or ensure your draft contains them.' });
    }

    // Handle transcript file upload
    let transcriptPath = null;
    if (transcriptFile) {
      // Validate file type (PDF only)
      if (transcriptFile.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Transcript must be a PDF file' });
      }

      // Save transcript to disk
      const uploadPath = 'uploads/transcripts';
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const filename = `transcript-${uniqueSuffix}${path.extname(transcriptFile.originalname)}`;
      const filePath = path.join(uploadPath, filename);
      
      // Write file to disk
      fs.writeFileSync(filePath, transcriptFile.buffer);
      transcriptPath = `/uploads/transcripts/${filename}`;
    } else if (!isDraft) {
      // For submitted applications, check if transcript already exists (when updating draft)
      if (draftId) {
        const existingApp = await models.CreditTransferApplication.findOne({
          where: { ct_id: draftId, student_id: studentId },
          attributes: ['transcript_path'],
        });
        if (!existingApp || !existingApp.transcript_path) {
          return res.status(400).json({ error: 'Transcript/Result Slip is required for submission' });
        }
        // Use existing transcript
        transcriptPath = existingApp.transcript_path;
      } else {
        // New application - transcript is required
        return res.status(400).json({ error: 'Transcript/Result Slip is required for submission' });
      }
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
      const updateData = {
        ct_status: status,
        coordinator_id: coordinator.coordinator_id, // Update coordinator in case it changed
        program_id: program.program_id,
      };

      // Update previous study details - always update if provided (even if empty string)
      if (prevProgrammeName !== undefined) {
        updateData.prev_programme_name = prevProgrammeName || null;
      }
      if (prevCampusName !== undefined) {
        updateData.prev_campus_name = prevCampusName || null;
      }
      if (transcriptPath) {
        // Delete old transcript if exists and we're uploading a new one
        if (application.transcript_path && application.transcript_path !== transcriptPath) {
          const oldPath = application.transcript_path.replace('/uploads/', 'uploads/');
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        updateData.transcript_path = transcriptPath;
      } else if (!isDraft && application.transcript_path) {
        // If submitting and no new transcript uploaded, preserve existing one
        updateData.transcript_path = application.transcript_path;
      }

      await application.update(updateData);

      // Get existing subjects with their past subjects to preserve file paths
      const existingSubjects = await models.NewApplicationSubject.findAll({
        where: { ct_id: application.ct_id },
        include: [{
          model: models.PastApplicationSubject,
          as: 'pastApplicationSubjects',
          attributes: ['pastSubject_id', 'pastSubject_code', 'pastSubject_name', 'pastSubject_grade', 'pastSubject_syllabus_path', 'original_filename'],
        }],
      });

      // Create a map of existing syllabus files by subject name and code for quick lookup
      const existingFilesMap = new Map();
      for (const subject of existingSubjects) {
        for (const pastSubject of subject.pastApplicationSubjects || []) {
          const key = `${subject.application_subject_name}_${pastSubject.pastSubject_code}`;
          if (pastSubject.pastSubject_syllabus_path) {
            existingFilesMap.set(key, {
              path: pastSubject.pastSubject_syllabus_path,
              originalFilename: pastSubject.original_filename,
            });
          }
        }
      }

      // Delete existing subjects to recreate them
      for (const subject of existingSubjects) {
        await models.PastApplicationSubject.destroy({
          where: { application_subject_id: subject.application_subject_id },
        });
        await subject.destroy();
      }

      // Process mappings (pass existing files map to preserve them)
      await processMappings(application, mappingsArray, files, isDraft, existingFilesMap);
    } else {
      // Create new application
      application = await models.CreditTransferApplication.create({
        ct_status: status,
        ct_notes: null,
        prev_campus_name: prevCampusName || null,
        prev_programme_name: prevProgrammeName || null,
        transcript_path: transcriptPath,
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
          attributes: ['application_subject_id', 'application_subject_name', 'course_id', 'ct_id'],
          include: [
            {
              model: models.Course,
              as: 'course',
              attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
            },
            {
              model: models.PastApplicationSubject,
              as: 'pastApplicationSubjects',
              attributes: [
                'pastSubject_id',
                'pastSubject_code',
                'pastSubject_name',
                'pastSubject_grade',
                'pastSubject_syllabus_path',
                'original_filename',
                'application_subject_id',
                'approval_status',
                'template3_id',
                'similarity_percentage',
                'needs_sme_review',
                'sme_review_notes',
                'coordinator_notes',
              ],
            },
          ],
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
          attributes: ['application_subject_id', 'application_subject_name', 'course_id', 'ct_id'],
          include: [
            {
              model: models.Course,
              as: 'course',
              attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
            },
            {
              model: models.PastApplicationSubject,
              as: 'pastApplicationSubjects',
              attributes: ['pastSubject_id', 'pastSubject_code', 'pastSubject_name', 'pastSubject_grade', 'pastSubject_syllabus_path', 'original_filename', 'approval_status', 'template3_id', 'similarity_percentage', 'needs_sme_review', 'sme_review_notes', 'coordinator_notes', 'application_subject_id'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ applications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Review a past subject - Check Template3 and auto-approve or send to SME
async function reviewSubject(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can review subjects' });
    }

    // Get coordinator
    const coordinator = await models.Coordinator.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
    });

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator not found' });
    }

    const { pastSubjectId, action } = req.body; // action: 'check_template3', 'approve_template3', 'send_to_sme'

    // Get past subject with application details
    const pastSubject = await models.PastApplicationSubject.findByPk(pastSubjectId, {
      include: [{
        model: models.NewApplicationSubject,
        as: 'newApplicationSubject',
        include: [
          {
            model: models.Course,
            as: 'course',
            attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
          },
          {
            model: models.CreditTransferApplication,
            as: 'creditTransferApplication',
            where: {
              coordinator_id: coordinator.coordinator_id,
            },
          },
        ],
      }],
    });

    if (!pastSubject || !pastSubject.newApplicationSubject || !pastSubject.newApplicationSubject.creditTransferApplication) {
      return res.status(404).json({ error: 'Subject not found or not assigned to you' });
    }

    const application = pastSubject.newApplicationSubject.creditTransferApplication;

    // Get old_campus_id from Student's old_campus_id or StudentOldCampus lookup
    let oldCampusId = null;
    
    // First, try to get from student's old_campus_id
    const student = await models.Student.findByPk(application.student_id, {
      attributes: ['old_campus_id'],
    });
    
    if (student && student.old_campus_id) {
      oldCampusId = student.old_campus_id;
    } else if (application.prev_campus_name) {
      // Fallback: lookup by name
      const oldCampus = await models.StudentOldCampus.findOne({
        where: { old_campus_name: application.prev_campus_name },
      });
      if (oldCampus) {
        oldCampusId = oldCampus.old_campus_id;
      }
    }

    if (!oldCampusId) {
      return res.status(400).json({ error: 'Old campus not found. Please set student\'s old_campus_id or prev_campus_name first.' });
    }

    // Check Template3
    // Match by: old_campus_id, old_programme_name (case-insensitive partial match), program_id, 
    // and old_subject_code (the old institution's code that student entered)
    const env = process.env.NODE_ENV || 'development';
    const config = require('../config/config')[env];
    const isPostgres = config.dialect === 'postgres';

    // Build where clause for Template3 matching
    const template3WhereConditions = [
      { old_campus_id: oldCampusId },
      { program_id: application.program_id },
      { is_active: true },
      { old_subject_code: pastSubject.pastSubject_code }, // Match old institution's code
    ];

    // Add old_programme_name with case-insensitive partial matching
    if (application.prev_programme_name) {
      if (isPostgres) {
        template3WhereConditions.push({
          old_programme_name: { [Op.iLike]: `%${application.prev_programme_name}%` },
        });
      } else {
        // MySQL/MariaDB: use Sequelize.where with column name (no table prefix needed in where clause)
        template3WhereConditions.push(
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('old_programme_name')),
            { [Op.like]: `%${application.prev_programme_name.toLowerCase()}%` }
          )
        );
      }
    }

    const template3Where = {
      [Op.and]: template3WhereConditions,
    };

    const template3Match = await models.Template3.findOne({
      where: template3Where,
      include: [{
        model: models.Course,
        as: 'course',
        attributes: ['course_id', 'course_name', 'course_code'],
      }],
    });

    if (action === 'check_template3') {
      // Just return the check result
      return res.json({
        hasMatch: !!template3Match,
        template3: template3Match ? {
          template3_id: template3Match.template3_id,
          old_subject_code: template3Match.old_subject_code,
          old_subject_name: template3Match.old_subject_name,
          new_subject_code: template3Match.new_subject_code,
          new_subject_name: template3Match.new_subject_name,
          course: template3Match.course,
          similarity_percentage: template3Match.similarity_percentage,
        } : null,
        pastSubject: {
          pastSubject_id: pastSubject.pastSubject_id,
          pastSubject_code: pastSubject.pastSubject_code,
          pastSubject_name: pastSubject.pastSubject_name,
          approval_status: pastSubject.approval_status,
        },
      });
    }

    if (action === 'approve_template3' && template3Match) {
      // Auto-approve via Template3
      await pastSubject.update({
        approval_status: 'approved_template3',
        template3_id: template3Match.template3_id,
        needs_sme_review: false,
        coordinator_notes: `Auto-approved via Template 3 (${template3Match.template3_id})`,
      });

      return res.json({
        message: 'Subject approved via Template 3',
        pastSubject: await models.PastApplicationSubject.findByPk(pastSubjectId, {
          attributes: ['pastSubject_id', 'pastSubject_code', 'approval_status', 'template3_id'],
        }),
      });
    }

    if (action === 'send_to_sme') {
      // Send to SME for review
      // Find SME for the course (if template3 match exists, use that course, otherwise use the new application subject's course_id)
      let courseId = null;
      if (template3Match) {
        courseId = template3Match.course_id;
      } else if (pastSubject.newApplicationSubject.course_id) {
        // Use course_id from NewApplicationSubject (preferred)
        courseId = pastSubject.newApplicationSubject.course_id;
      } else {
        // Fallback: Try to find course by name match (for backward compatibility)
        const course = await models.Course.findOne({
          where: {
            program_id: application.program_id,
            course_name: pastSubject.newApplicationSubject.application_subject_name,
          },
        });
        if (course) {
          courseId = course.course_id;
        }
      }

      if (!courseId) {
        return res.status(400).json({ error: 'Cannot determine course for SME assignment. Please ensure the application subject has a valid course_id.' });
      }

      // Find active SME for this course
      const sme = await models.SubjectMethodExpert.findOne({
        where: {
          course_id: courseId,
          end_date: null,
        },
      });

      if (!sme) {
        return res.status(404).json({ error: 'No active SME found for this course. Please assign an SME first.' });
      }

      // Check if assignment already exists
      const existingAssignment = await models.SMEAssignment.findOne({
        where: {
          sme_id: sme.sme_id,
          pastSubject_id: pastSubject.pastSubject_id,
        },
      });

      // Update past subject
      await pastSubject.update({
        approval_status: 'needs_sme_review',
        needs_sme_review: true,
        coordinator_notes: req.body.coordinator_notes || 'Sent to SME for review - subject code not in Template 3',
      });

      // Create SME assignment only if it doesn't exist
      let smeAssignment = existingAssignment;
      if (!existingAssignment) {
        smeAssignment = await models.SMEAssignment.create({
          sme_id: sme.sme_id,
          application_id: application.ct_id,
          application_subject_id: pastSubject.newApplicationSubject.application_subject_id,
          pastSubject_id: pastSubject.pastSubject_id,
          old_campus_id: oldCampusId,
        });
      }

      return res.json({
        message: 'Subject sent to SME for review',
        smeAssignment: {
          assignment_id: smeAssignment.assignment_id,
          sme_id: sme.sme_id,
        },
        pastSubject: await models.PastApplicationSubject.findByPk(pastSubjectId, {
          attributes: ['pastSubject_id', 'pastSubject_code', 'approval_status', 'needs_sme_review'],
        }),
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use: check_template3, approve_template3, or send_to_sme' });
  } catch (error) {
    console.error('Review subject error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Check Template3 for all past subjects of a current subject (many-to-one mapping)
async function checkTemplate3ForCurrentSubject(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can review subjects' });
    }

    // Get coordinator
    const coordinator = await models.Coordinator.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
    });

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator not found' });
    }

    const { applicationSubjectId, action } = req.body; // action: 'check_template3', 'approve_all', 'send_all_to_sme'

    // Get the current subject (NewApplicationSubject) with all its past subjects
    const newApplicationSubject = await models.NewApplicationSubject.findByPk(applicationSubjectId, {
      include: [
        {
          model: models.Course,
          as: 'course',
          attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
        },
        {
          model: models.CreditTransferApplication,
          as: 'creditTransferApplication',
          where: {
            coordinator_id: coordinator.coordinator_id,
          },
          include: [
            {
              model: models.Program,
              as: 'program',
              attributes: ['program_id', 'program_name', 'program_code'],
            },
          ],
        },
        {
          model: models.PastApplicationSubject,
          as: 'pastApplicationSubjects',
          where: {
            approval_status: 'pending', // Only check pending subjects
          },
          required: false, // LEFT JOIN - in case there are no pending subjects
        },
      ],
    });

    if (!newApplicationSubject || !newApplicationSubject.creditTransferApplication) {
      return res.status(404).json({ error: 'Subject not found or not assigned to you' });
    }

    const application = newApplicationSubject.creditTransferApplication;
    const pastSubjects = newApplicationSubject.pastApplicationSubjects || [];

    if (pastSubjects.length === 0) {
      return res.status(400).json({ error: 'No pending past subjects found for this current subject' });
    }

    // Get old_campus_id
    let oldCampusId = null;
    const student = await models.Student.findByPk(application.student_id, {
      attributes: ['old_campus_id'],
    });

    if (student && student.old_campus_id) {
      oldCampusId = student.old_campus_id;
    } else if (application.prev_campus_name) {
      const oldCampus = await models.StudentOldCampus.findOne({
        where: { old_campus_name: application.prev_campus_name },
      });
      if (oldCampus) {
        oldCampusId = oldCampus.old_campus_id;
      }
    }

    if (!oldCampusId) {
      return res.status(400).json({ error: 'Old campus not found. Please set student\'s old_campus_id or prev_campus_name first.' });
    }

    // Check Template3 for each past subject
    const env = process.env.NODE_ENV || 'development';
    const config = require('../config/config')[env];
    const isPostgres = config.dialect === 'postgres';

    const results = [];
    let allMatch = true;
    let someMatch = false;

    for (const pastSubject of pastSubjects) {
      const template3WhereConditions = [
        { old_campus_id: oldCampusId },
        { program_id: application.program_id },
        { is_active: true },
        { old_subject_code: pastSubject.pastSubject_code },
      ];

      // Add old_programme_name with case-insensitive partial matching
      if (application.prev_programme_name) {
        if (isPostgres) {
          template3WhereConditions.push({
            old_programme_name: { [Op.iLike]: `%${application.prev_programme_name}%` },
          });
        } else {
          template3WhereConditions.push(
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('old_programme_name')),
              { [Op.like]: `%${application.prev_programme_name.toLowerCase()}%` }
            )
          );
        }
      }

      const template3Where = {
        [Op.and]: template3WhereConditions,
      };

      const template3Match = await models.Template3.findOne({
        where: template3Where,
        include: [{
          model: models.Course,
          as: 'course',
          attributes: ['course_id', 'course_name', 'course_code'],
        }],
      });

      const hasMatch = !!template3Match;
      if (hasMatch) {
        someMatch = true;
      } else {
        allMatch = false;
      }

      results.push({
        pastSubject_id: pastSubject.pastSubject_id,
        pastSubject_code: pastSubject.pastSubject_code,
        pastSubject_name: pastSubject.pastSubject_name,
        hasMatch,
        template3: template3Match ? {
          template3_id: template3Match.template3_id,
          old_subject_code: template3Match.old_subject_code,
          old_subject_name: template3Match.old_subject_name,
          new_subject_code: template3Match.new_subject_code,
          new_subject_name: template3Match.new_subject_name,
          course: template3Match.course,
          similarity_percentage: template3Match.similarity_percentage,
        } : null,
      });
    }

    if (action === 'check_template3') {
      return res.json({
        applicationSubjectId,
        currentSubject: {
          application_subject_id: newApplicationSubject.application_subject_id,
          application_subject_name: newApplicationSubject.application_subject_name,
          course: newApplicationSubject.course,
        },
        results,
        allMatch,
        someMatch,
        totalSubjects: pastSubjects.length,
        matchedCount: results.filter(r => r.hasMatch).length,
      });
    }

    if (action === 'approve_all' && allMatch) {
      // Approve all past subjects via Template3
      const approvedSubjects = [];
      for (let i = 0; i < pastSubjects.length; i++) {
        const pastSubject = pastSubjects[i];
        const result = results[i];
        if (result.hasMatch && result.template3) {
          await pastSubject.update({
            approval_status: 'approved_template3',
            template3_id: result.template3.template3_id,
            needs_sme_review: false,
            coordinator_notes: `Auto-approved via Template 3 (${result.template3.template3_id})`,
          });
          approvedSubjects.push(pastSubject.pastSubject_id);
        }
      }

      return res.json({
        message: `All ${approvedSubjects.length} subjects approved via Template 3`,
        approvedSubjects,
      });
    }

    if (action === 'send_all_to_sme') {
      // Send ALL past subjects to SME (even if some match Template3, because it's many-to-one)
      const courseId = newApplicationSubject.course_id || newApplicationSubject.course?.course_id;
      
      if (!courseId) {
        return res.status(400).json({ error: 'Cannot determine course for SME assignment. Please ensure the application subject has a valid course_id.' });
      }

      // Find active SME for this course
      const sme = await models.SubjectMethodExpert.findOne({
        where: {
          course_id: courseId,
          end_date: null,
        },
      });

      if (!sme) {
        return res.status(404).json({ error: 'No active SME found for this course. Please assign an SME first.' });
      }

      const sentSubjects = [];
      const coordinatorNotes = req.body.coordinator_notes || 'Sent all subjects to SME for review (many-to-one mapping)';

      for (const pastSubject of pastSubjects) {
        // Check if assignment already exists
        const existingAssignment = await models.SMEAssignment.findOne({
          where: {
            sme_id: sme.sme_id,
            pastSubject_id: pastSubject.pastSubject_id,
          },
        });

        // Only create if assignment doesn't exist
        if (!existingAssignment) {
          // Update past subject
          await pastSubject.update({
            approval_status: 'needs_sme_review',
            needs_sme_review: true,
            coordinator_notes: coordinatorNotes,
          });

          // Create SME assignment
          await models.SMEAssignment.create({
            sme_id: sme.sme_id,
            application_id: application.ct_id,
            application_subject_id: newApplicationSubject.application_subject_id,
            pastSubject_id: pastSubject.pastSubject_id,
            old_campus_id: oldCampusId,
          });
        } else {
          // Update past subject status even if assignment exists (in case it was reset)
          await pastSubject.update({
            approval_status: 'needs_sme_review',
            needs_sme_review: true,
            coordinator_notes: coordinatorNotes,
          });
        }

        sentSubjects.push(pastSubject.pastSubject_id);
      }

      return res.json({
        message: `All ${sentSubjects.length} subjects sent to SME for review`,
        sentSubjects,
        sme: {
          sme_id: sme.sme_id,
        },
      });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Check Template3 for current subject error:', error);
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
    const { ct_status, ct_notes, prev_campus_name, prev_programme_name, old_campus_id } = req.body;

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
    if (prev_campus_name !== undefined) updateData.prev_campus_name = prev_campus_name;
    if (prev_programme_name !== undefined) updateData.prev_programme_name = prev_programme_name;

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
  reviewSubject,
  checkTemplate3ForCurrentSubject,
  uploadMiddleware, // Export for use in routes if needed
};

