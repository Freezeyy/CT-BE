const models = require('../models');
const { Op, Sequelize } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const svc = require('../services');

async function createNotification({ receiver_type, receiver_id, noti_type, noti_title, noti_message, link_path = null }) {
  try {
    if (!receiver_type || !receiver_id) return;
    await models.Notification.create({
      noti_receiver_type: receiver_type,
      noti_receiver_id: receiver_id,
      noti_type,
      noti_title,
      noti_message,
      link_path,
      is_read: false,
      read_at: null,
    });
  } catch (e) {
    // Don't fail business flow due to notification issues
    console.warn('Notification create failed:', e?.message || e);
  }
}

async function findActiveTemplate3Match({
  oldCampusId,
  oldProgrammeName,
  programId,
  courseId,
  oldSubjectCode,
}) {
  const env = process.env.NODE_ENV || 'development';
  const config = require('../config/config')[env];
  const isPostgres = config.dialect === 'postgres';

  const whereAnd = [
    { old_campus_id: oldCampusId },
    { program_id: programId },
    { course_id: courseId },
    { old_subject_code: oldSubjectCode },
    { is_active: true },
  ];

  if (oldProgrammeName) {
    if (isPostgres) {
      whereAnd.push({ old_programme_name: { [Op.iLike]: `%${oldProgrammeName}%` } });
    } else {
      whereAnd.push(
        Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('old_programme_name')),
          { [Op.like]: `%${String(oldProgrammeName).toLowerCase()}%` }
        )
      );
    }
  }

  return await models.Template3.findOne({
    where: { [Op.and]: whereAnd },
    attributes: [
      'template3_id',
      'similarity_percentage',
      'course_id',
      'old_subject_code',
      'old_subject_name',
      'new_subject_code',
      'new_subject_name',
    ],
  });
}

function normalizeSubjectCode(code) {
  return String(code || '').trim().toUpperCase();
}

function buildTemplate3ProgrammeNameConditions(oldProgrammeName, isPostgres) {
  if (!oldProgrammeName) return [];
  if (isPostgres) {
    return [{ old_programme_name: { [Op.iLike]: `%${oldProgrammeName}%` } }];
  }
  return [
    Sequelize.where(
      Sequelize.fn('LOWER', Sequelize.col('old_programme_name')),
      { [Op.like]: `%${String(oldProgrammeName).toLowerCase()}%` },
    ),
  ];
}

/** All active Template3 rows for one UniKL course (may be multiple past-subject codes). */
async function getRequiredTemplate3MappingsForCourse({
  oldCampusId,
  programId,
  oldProgrammeName,
  courseId,
}) {
  if (!oldCampusId || !programId || !courseId) return [];

  const env = process.env.NODE_ENV || 'development';
  const config = require('../config/config')[env];
  const isPostgres = config.dialect === 'postgres';

  const whereAnd = [
    { old_campus_id: oldCampusId },
    { program_id: programId },
    { course_id: courseId },
    { is_active: true },
    ...buildTemplate3ProgrammeNameConditions(oldProgrammeName, isPostgres),
  ];

  return models.Template3.findAll({
    where: { [Op.and]: whereAnd },
    attributes: [
      'template3_id',
      'old_subject_code',
      'old_subject_name',
      'new_subject_code',
      'new_subject_name',
      'similarity_percentage',
      'course_id',
    ],
    include: [{
      model: models.Course,
      as: 'course',
      attributes: ['course_id', 'course_name', 'course_code'],
    }],
    order: [['old_subject_code', 'ASC']],
  });
}

/**
 * Many-to-one: a UniKL course may require several past-subject codes in Template3.
 * allMatch is true only when every submitted pending past subject matches this course
 * AND every required Template3 code for this course appears in the application.
 */
async function evaluateTemplate3Bundle({
  application,
  newApplicationSubject,
  pastSubjects,
  oldCampusId,
}) {
  const env = process.env.NODE_ENV || 'development';
  const config = require('../config/config')[env];
  const isPostgres = config.dialect === 'postgres';

  const courseId =
    newApplicationSubject.course_id || newApplicationSubject.course?.course_id || null;

  const requiredMappings = courseId
    ? await getRequiredTemplate3MappingsForCourse({
        oldCampusId,
        programId: application.program_id,
        oldProgrammeName: application.prev_programme_name,
        courseId,
      })
    : [];

  const requiredCodes = [
    ...new Set(requiredMappings.map((m) => normalizeSubjectCode(m.old_subject_code)).filter(Boolean)),
  ];

  const submittedCodes = pastSubjects
    .map((p) => normalizeSubjectCode(p.pastSubject_code))
    .filter(Boolean);

  const missingRequiredCodes = requiredCodes.filter(
    (code) => !submittedCodes.includes(code),
  );

  const results = [];

  for (const pastSubject of pastSubjects) {
    let template3Match = null;
    if (courseId) {
      template3Match = await findActiveTemplate3Match({
        oldCampusId,
        oldProgrammeName: application.prev_programme_name,
        programId: application.program_id,
        courseId,
        oldSubjectCode: pastSubject.pastSubject_code,
      });
    } else {
      const template3WhereConditions = [
        { old_campus_id: oldCampusId },
        { program_id: application.program_id },
        { is_active: true },
        { old_subject_code: pastSubject.pastSubject_code },
        ...buildTemplate3ProgrammeNameConditions(application.prev_programme_name, isPostgres),
      ];
      template3Match = await models.Template3.findOne({
        where: { [Op.and]: template3WhereConditions },
        include: [{
          model: models.Course,
          as: 'course',
          attributes: ['course_id', 'course_name', 'course_code'],
        }],
      });
    }

    const hasMatch = !!template3Match;
    results.push({
      pastSubject_id: pastSubject.pastSubject_id,
      pastSubject_code: pastSubject.pastSubject_code,
      pastSubject_name: pastSubject.pastSubject_name,
      hasMatch,
      template3: template3Match
        ? {
            template3_id: template3Match.template3_id,
            old_subject_code: template3Match.old_subject_code,
            old_subject_name: template3Match.old_subject_name,
            new_subject_code: template3Match.new_subject_code,
            new_subject_name: template3Match.new_subject_name,
            course: template3Match.course,
            similarity_percentage: template3Match.similarity_percentage,
          }
        : null,
    });
  }

  const allSubmittedMatch =
    results.length > 0 && results.every((r) => r.hasMatch);
  const allRequiredPresent =
    requiredCodes.length === 0 || missingRequiredCodes.length === 0;
  const allMatch = allSubmittedMatch && allRequiredPresent;
  const someMatch = results.some((r) => r.hasMatch);

  return {
    results,
    allMatch,
    someMatch,
    requiredMappings: requiredMappings.map((m) => ({
      template3_id: m.template3_id,
      old_subject_code: m.old_subject_code,
      old_subject_name: m.old_subject_name,
      course: m.course,
    })),
    requiredCount: requiredCodes.length,
    missingRequiredCodes,
    matchedCount: results.filter((r) => r.hasMatch).length,
    coverageIncomplete: requiredCodes.length > 0 && missingRequiredCodes.length > 0,
  };
}

function daysToMs(days) {
  return Math.max(0, Number(days) || 0) * 24 * 60 * 60 * 1000;
}

function getSmeEvalDays() {
  return Number(process.env.SME_EVAL_DAYS || 14);
}

function getProcessWindowDays() {
  return Number(process.env.CTS_PROCESS_WINDOW_DAYS || 60);
}

async function hasRecentSmeAssignmentForMapping({
  oldCampusId,
  oldProgrammeName,
  programId,
  courseId,
  oldSubjectCode,
}) {
  const since = new Date(Date.now() - daysToMs(getProcessWindowDays()));

  // Find any SMEAssignment created recently for the same mapping key.
  // Key is derived from: old_campus_id + old_programme_name + program_id + course_id + old_subject_code
  const found = await models.SMEAssignment.findOne({
    where: {
      old_campus_id: oldCampusId,
      createdAt: { [Op.gte]: since },
    },
    include: [
      {
        model: models.PastApplicationSubject,
        as: 'pastApplicationSubject',
        required: true,
        attributes: ['pastSubject_id', 'pastSubject_code'],
        where: { pastSubject_code: oldSubjectCode },
        include: [{
          model: models.NewApplicationSubject,
          as: 'newApplicationSubject',
          required: true,
          attributes: ['application_subject_id', 'course_id', 'ct_id'],
          where: { course_id: courseId },
          include: [{
            model: models.CreditTransferApplication,
            as: 'creditTransferApplication',
            required: true,
            attributes: ['ct_id', 'program_id', 'prev_programme_name', 'createdAt'],
            where: { program_id: programId },
          }],
        }],
      },
    ],
  });

  if (!found) return false;
  const prevName = found.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.prev_programme_name || '';
  return String(prevName).toLowerCase().includes(String(oldProgrammeName || '').toLowerCase());
}

async function hasActiveSmeAssignmentForSubjectKey({
  oldCampusId,
  oldProgrammeName,
  programId,
  courseId,
}) {
  const since = new Date(Date.now() - daysToMs(getProcessWindowDays()));

  // "Active" means the SME assignment is still pending (not completed).
  // We intentionally do NOT key by oldSubjectCode here because coordinator UX treats
  // the whole current subject as "SME is evaluating" once an SME is evaluating that mapping set.
  const found = await models.SMEAssignment.findOne({
    where: {
      old_campus_id: oldCampusId,
      createdAt: { [Op.gte]: since },
      assignment_status: { [Op.in]: ['pending', null] },
      completed_at: null,
    },
    include: [
      {
        model: models.PastApplicationSubject,
        as: 'pastApplicationSubject',
        required: true,
        attributes: ['pastSubject_id'],
        include: [
          {
            model: models.NewApplicationSubject,
            as: 'newApplicationSubject',
            required: true,
            attributes: ['application_subject_id', 'course_id'],
            where: { course_id: courseId },
            include: [
              {
                model: models.CreditTransferApplication,
                as: 'creditTransferApplication',
                required: true,
                attributes: ['ct_id', 'program_id', 'prev_programme_name'],
                where: { program_id: programId },
              },
            ],
          },
        ],
      },
    ],
  });

  if (!found) return false;
  const prevName = found.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.prev_programme_name || '';
  return String(prevName).toLowerCase().includes(String(oldProgrammeName || '').toLowerCase());
}

async function markSimilarMappingsAsSmeEvaluating({
  oldCampusId,
  oldProgrammeName,
  programId,
  courseId,
}) {
  // Find other pending rows with same mapping key and mark them as "awaiting SME".
  // IMPORTANT: some students may not have Student.old_campus_id set; in that case we match using
  // application.prev_campus_name (string) instead of Student.old_campus_id.
  const apps = await models.CreditTransferApplication.findAll({
    where: {
      program_id: programId,
      prev_programme_name: { [Op.like]: `%${oldProgrammeName || ''}%` },
      // oldCampusId is derived from prev_campus_name lookup; match the same campus name string too
      prev_campus_name: { [Op.like]: `%${(await models.StudentOldCampus.findByPk(oldCampusId, { attributes: ['old_campus_name'] }))?.old_campus_name || ''}%` },
    },
    attributes: ['ct_id'],
    include: [
      {
        model: models.NewApplicationSubject,
        as: 'newApplicationSubjects',
        attributes: ['application_subject_id', 'course_id'],
        required: true,
        where: { course_id: courseId },
        include: [
          {
            model: models.PastApplicationSubject,
            as: 'pastApplicationSubjects',
            required: true,
            where: {
              approval_status: 'pending',
            },
          },
        ],
      },
    ],
  });

  const pastIds = [];
  for (const app of apps) {
    for (const ns of app.newApplicationSubjects || []) {
      for (const ps of ns.pastApplicationSubjects || []) {
        pastIds.push(ps.pastSubject_id);
      }
    }
  }

  if (pastIds.length === 0) return 0;

  const [updated] = await models.PastApplicationSubject.update(
    {
      approval_status: 'needs_sme_review',
      needs_sme_review: true,
    },
    { where: { pastSubject_id: { [Op.in]: pastIds } } }
  );

  return updated;
}

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
      // Fallback: find course by name matching via many-to-many relationship
      const course = await models.Course.findOne({
        where: {
          course_name: currentSubject,
        },
        include: [{
          model: models.Program,
          as: 'programs',
          where: { program_id: application.program_id },
          attributes: [],
          through: { attributes: [] },
          required: true,
        }],
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
      const { code, name, grade, credit, syllabus: syllabusFileName } = pastSubject;
      
      // Debug: log what we received for credit
      console.log(`Processing past subject - code: ${code}, name: ${name}, credit received:`, credit, 'type:', typeof credit);

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
      // Parse credit: handle null, undefined, empty string, and invalid numbers
      let parsedCredit = null;
      if (credit !== null && credit !== undefined && credit !== '') {
        const parsed = parseInt(credit, 10);
        parsedCredit = isNaN(parsed) ? null : parsed;
      }

      await models.PastApplicationSubject.create({
        pastSubject_code: code,
        pastSubject_name: name,
        pastSubject_grade: grade,
        pastSubject_credit: parsedCredit,
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
      // Debug: log parsed mappings to see credit values
      console.log('Parsed mappings array:', JSON.stringify(mappingsArray, null, 2));
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid mappings format. Must be valid JSON' });
    }

    // Get student from authenticated user
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can submit applications' });
    }

    // Enforce CT process window (per student's UniKL campus)
    const studentCampus = await models.Student.findByPk(studentId, { attributes: ['campus_id'] });
    const campusIdForWindow = studentCampus?.campus_id;
    const ctOpen = await svc.processWindow.isCtProcessOpenForCampus(campusIdForWindow);
    if (!ctOpen) {
      return res.status(403).json({ error: 'Credit transfer process window is closed for your campus.' });
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

    // If this application is submitted, and an SME is already evaluating the same mapping (within window),
    // mark the newly created pending rows as needs_sme_review so coordinator UI shows "SME is evaluating".
    if (!isDraft) {
      try {
        const student = await models.Student.findByPk(studentId, { attributes: ['old_campus_id'] });
        const oldCampusId = student?.old_campus_id || null;
        if (oldCampusId && application.prev_programme_name) {
          const subjects = await models.NewApplicationSubject.findAll({
            where: { ct_id: application.ct_id },
            include: [{ model: models.PastApplicationSubject, as: 'pastApplicationSubjects', required: false }],
          });
          for (const s of subjects) {
            const courseId = s.course_id;
            if (!courseId) continue;
            const hasActive = await hasActiveSmeAssignmentForSubjectKey({
              oldCampusId,
              oldProgrammeName: application.prev_programme_name,
              programId: application.program_id,
              courseId,
            });

            if (hasActive) {
              for (const ps of s.pastApplicationSubjects || []) {
                if (ps.approval_status !== 'pending') continue;
                await ps.update({
                  approval_status: 'needs_sme_review',
                  needs_sme_review: true,
                  coordinator_notes: 'An SME is currently evaluating the same mapping',
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Failed to auto-mark SME evaluating for new application:', e?.message || e);
      }
    }

    // Notify coordinator when an application is submitted (not draft)
    if (!isDraft) {
      const student = await models.Student.findByPk(studentId, { attributes: ['student_name'] });
      const coordinatorLecturer = await models.Lecturer.findByPk(coordinator.lecturer_id, {
        attributes: ['lecturer_id', 'lecturer_name'],
      });
      const studentName = student?.student_name || 'A student';
      const coordinatorLecturerId = coordinatorLecturer?.lecturer_id || coordinator.lecturer_id;

      await createNotification({
        receiver_type: 'lecturer',
        receiver_id: coordinatorLecturerId,
        noti_type: 'application_submitted',
        noti_title: 'New credit transfer application',
        noti_message: `${studentName} submitted a credit transfer application for your review.`,
        link_path: '/coordinator/application',
      });
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
              model: models.HosReview,
              as: 'hosReviews',
              attributes: ['hos_review_id', 'status', 'createdAt', 'decided_at'],
              required: false,
            },
            {
              model: models.PastApplicationSubject,
              as: 'pastApplicationSubjects',
              attributes: [
                'pastSubject_id',
                'pastSubject_code',
                'pastSubject_name',
                'pastSubject_grade',
                'pastSubject_credit',
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
        ct_status: { [Op.ne]: 'draft' },
      },
      include: [
        {
          model: models.Student,
          as: 'student',
          attributes: ['student_id', 'student_identifier', 'student_name', 'student_email', 'student_phone'],
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
              model: models.HosReview,
              as: 'hosReviews',
              attributes: ['hos_review_id', 'status', 'createdAt'],
              required: false,
              where: { status: 'pending' },
            },
            {
              model: models.SMEAssignment,
              as: 'smeAssignments',
              attributes: ['assignment_id', 'sme_id', 'assignment_status', 'assigned_at', 'completed_at'],
              required: false,
              include: [
                {
                  model: models.SubjectMethodExpert,
                  as: 'subjectMethodExpert',
                  attributes: ['sme_id'],
                  include: [
                    {
                      model: models.Lecturer,
                      as: 'lecturer',
                      attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
                    },
                  ],
                },
              ],
            },
            {
              model: models.PastApplicationSubject,
              as: 'pastApplicationSubjects',
              attributes: ['pastSubject_id', 'pastSubject_code', 'pastSubject_name', 'pastSubject_grade', 'pastSubject_credit', 'pastSubject_syllabus_path', 'original_filename', 'approval_status', 'template3_id', 'similarity_percentage', 'needs_sme_review', 'sme_review_notes', 'coordinator_notes', 'application_subject_id'],
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

    // Enforce CT process window (lecturer campus)
    const lecturer = await models.Lecturer.findByPk(lecturerId, { attributes: ['campus_id'] });
    const ctOpen = await svc.processWindow.isCtProcessOpenForCampus(lecturer?.campus_id);
    if (!ctOpen) {
      return res.status(403).json({ error: 'Credit transfer process window is closed for your campus.' });
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

    const courseId =
      pastSubject.newApplicationSubject?.course_id ||
      pastSubject.newApplicationSubject?.course?.course_id ||
      null;

    const template3Match = courseId
      ? await findActiveTemplate3Match({
          oldCampusId,
          oldProgrammeName: application.prev_programme_name,
          programId: application.program_id,
          courseId,
          oldSubjectCode: pastSubject.pastSubject_code,
        })
      : null;

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
        // Fallback: Try to find course by name match via many-to-many relationship
        const course = await models.Course.findOne({
          where: {
            course_name: pastSubject.newApplicationSubject.application_subject_name,
          },
          include: [{
            model: models.Program,
            as: 'programs',
            where: { program_id: application.program_id },
            attributes: [],
            through: { attributes: [] },
            required: true,
          }],
        });
        if (course) {
          courseId = course.course_id;
        }
      }

      if (!courseId) {
        return res.status(400).json({ error: 'Cannot determine course for SME assignment. Please ensure the application subject has a valid course_id.' });
      }

      // Avoid duplicate SME assignments within the process window (e.g. 60 days).
      // Template3 may exist, but we still allow SME re-evaluation later (outside the window).
      const hasRecent = await hasRecentSmeAssignmentForMapping({
        oldCampusId,
        oldProgrammeName: application.prev_programme_name,
        programId: application.program_id,
        courseId,
        oldSubjectCode: pastSubject.pastSubject_code,
      });
      // If already under SME review recently, don't block the coordinator flow.
      // Mark the whole current subject as SME evaluating and mirror to similar pending rows.
      if (hasRecent) {
        const allPast = await models.PastApplicationSubject.findAll({
          where: { application_subject_id: pastSubject.newApplicationSubject.application_subject_id },
          attributes: ['pastSubject_id', 'approval_status'],
        });
        for (const ps of allPast) {
          if (String(ps.approval_status || '').toLowerCase() !== 'pending') continue;
          await ps.update({ approval_status: 'needs_sme_review', needs_sme_review: true });
        }
        await markSimilarMappingsAsSmeEvaluating({
          oldCampusId,
          oldProgrammeName: application.prev_programme_name,
          programId: application.program_id,
          courseId,
        });
        return res.json({ message: 'SME is already evaluating a similar mapping; marked as evaluating.' });
      }

      // Get SME - either from request body (coordinator's choice) or find first active one
      let sme = null;
      if (req.body.sme_id) {
        sme = await models.SubjectMethodExpert.findOne({
          where: {
            sme_id: req.body.sme_id,
            course_id: courseId,
            end_date: null,
          },
          include: [{
            model: models.Lecturer,
            as: 'lecturer',
            attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
          }],
        });
        if (!sme) {
          return res.status(404).json({ error: 'Selected SME not found or not active for this course.' });
        }
      } else {
        // Fallback: find first active SME for this course
        sme = await models.SubjectMethodExpert.findOne({
          where: {
            course_id: courseId,
            end_date: null,
          },
          include: [{
            model: models.Lecturer,
            as: 'lecturer',
            attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
          }],
        });
        if (!sme) {
          return res.status(404).json({ error: 'No active SME found for this course. Please assign an SME first.' });
        }
      }

      // Mark all pending past subjects under this current subject as SME evaluating
      const subjectPastSubjects = await models.PastApplicationSubject.findAll({
        where: { application_subject_id: pastSubject.newApplicationSubject.application_subject_id },
        attributes: ['pastSubject_id', 'approval_status', 'pastSubject_code'],
      });

      for (const ps of subjectPastSubjects) {
        if (String(ps.approval_status || '').toLowerCase() !== 'pending') continue;
        await ps.update({ approval_status: 'needs_sme_review', needs_sme_review: true });
      }

      // Mark other similar mappings (other applications) as SME evaluating too
      await markSimilarMappingsAsSmeEvaluating({
        oldCampusId,
        oldProgrammeName: application.prev_programme_name,
        programId: application.program_id,
        courseId,
      });

      // Create SME assignments per pending past subject (so both past subjects show "SME is evaluating")
      const assignedAt = new Date();
      const program = await models.Program.findByPk(application.program_id, { attributes: ['campus_id'] });
      const uniklCampusId = program?.campus_id || null;
      const smeDays = await svc.processWindow.getSmeEvalDaysForCampus(uniklCampusId, getSmeEvalDays());
      const dueAt = new Date(Date.now() + daysToMs(smeDays));

      let createdCount = 0;
      for (const ps of subjectPastSubjects) {
        const exists = await models.SMEAssignment.findOne({
          where: { sme_id: sme.sme_id, pastSubject_id: ps.pastSubject_id },
        });
        if (exists) continue;
        await models.SMEAssignment.create({
          sme_id: sme.sme_id,
          application_id: application.ct_id,
          application_subject_id: pastSubject.newApplicationSubject.application_subject_id,
          pastSubject_id: ps.pastSubject_id,
          old_campus_id: oldCampusId,
          assigned_at: assignedAt,
          due_at: dueAt,
          completed_at: null,
          assignment_status: 'pending',
        });
        createdCount += 1;
      }

      // Notify SME (lecturer) about new task
      const coordinatorLecturer = await models.Lecturer.findByPk(lecturerId, {
        attributes: ['lecturer_name'],
      });
      const coordinatorName = coordinatorLecturer?.lecturer_name || 'Coordinator';
      await createNotification({
        receiver_type: 'lecturer',
        receiver_id: sme.lecturer?.lecturer_id,
        noti_type: 'sme_task_assigned',
        noti_title: 'New SME evaluation task',
        noti_message: `${coordinatorName} sent you a task to evaluate a credit transfer subject. Due: ${dueAt.toISOString().slice(0, 10)}.`,
        link_path: '/expert/assignments',
      });

      return res.json({
        message: 'Subject sent to SME for review',
        smeAssignment: { sme_id: sme.sme_id, created: createdCount },
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

// Get all active SMEs for a course (for coordinator to choose from)
async function getSMEsForCourse(req, res) {
  try {
    const { course_id } = req.params;
    
    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    // Get all active SMEs for this course
    const smes = await models.SubjectMethodExpert.findAll({
      where: {
        course_id: parseInt(course_id),
        end_date: null,
      },
      include: [{
        model: models.Lecturer,
        as: 'lecturer',
        attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
      }],
      order: [['start_date', 'DESC']],
    });

    res.json({ smes });
  } catch (error) {
    console.error('Get SMEs for course error:', error);
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

    // Enforce CT process window (lecturer campus)
    const lecturer = await models.Lecturer.findByPk(lecturerId, { attributes: ['campus_id'] });
    const ctOpen = await svc.processWindow.isCtProcessOpenForCampus(lecturer?.campus_id);
    if (!ctOpen) {
      return res.status(403).json({ error: 'Credit transfer process window is closed for your campus.' });
    }

    // Get coordinator
    const coordinator = await models.Coordinator.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
    });

    if (!coordinator) {
      return res.status(404).json({ error: 'Coordinator not found' });
    }

    const { applicationSubjectId, action } = req.body; // action: 'check_template3', 'approve_all', 'send_all_to_sme', 'reject_all'

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
          required: false, // LEFT JOIN - include all, we will filter per action
        },
      ],
    });

    if (!newApplicationSubject || !newApplicationSubject.creditTransferApplication) {
      return res.status(404).json({ error: 'Subject not found or not assigned to you' });
    }

    const application = newApplicationSubject.creditTransferApplication;
    const pastSubjectsAll = newApplicationSubject.pastApplicationSubjects || [];
    const pastSubjectsPending = pastSubjectsAll.filter(ps => String(ps.approval_status || '').toLowerCase() === 'pending');

    // Reject can be used for pending or SME-reviewed-below-80%
    const pastSubjectsRejectable = pastSubjectsAll.filter(ps => {
      const s = String(ps.approval_status || '').toLowerCase();
      return s === 'pending' || s === 'sme_reviewed_rejected';
    });

    if (action === 'reject_all') {
      const msg = String(req.body.coordinator_notes || '').trim();
      if (!msg) return res.status(400).json({ error: 'coordinator_notes is required for reject_all' });
      if (pastSubjectsRejectable.length === 0) {
        return res.status(400).json({ error: 'No rejectable past subjects found for this current subject' });
      }

      const ids = pastSubjectsRejectable.map(ps => ps.pastSubject_id);
      await models.PastApplicationSubject.update(
        {
          approval_status: 'rejected',
          needs_sme_review: false,
          coordinator_notes: msg,
        },
        { where: { pastSubject_id: { [Op.in]: ids } } }
      );

      // Notify student (generic)
      await createNotification({
        receiver_type: 'student',
        receiver_id: application.student_id,
        noti_type: 'subject_rejected',
        noti_title: 'Update on your application',
        noti_message: 'Your coordinator has responded to one of your credit transfer subjects.',
        link_path: '/student/history',
      });

      return res.json({ message: 'Subjects rejected', rejectedPastSubjectIds: ids });
    }

    // For other actions, we operate on pending rows only
    const pastSubjects = pastSubjectsPending;
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

    const evaluation = await evaluateTemplate3Bundle({
      application,
      newApplicationSubject,
      pastSubjects,
      oldCampusId,
    });
    const {
      results,
      allMatch,
      someMatch,
      requiredMappings,
      requiredCount,
      missingRequiredCodes,
      matchedCount,
      coverageIncomplete,
    } = evaluation;

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
        matchedCount,
        requiredMappings,
        requiredCount,
        missingRequiredCodes,
        coverageIncomplete,
      });
    }

    if (action === 'approve_all') {
      if (!allMatch) {
        const detail =
          missingRequiredCodes?.length > 0
            ? `Missing required previous course(s) in this application: ${missingRequiredCodes.join(', ')}. Template3 defines ${requiredCount} past subject(s) for this UniKL course.`
            : 'Not all submitted previous courses have a Template3 mapping for this UniKL course.';
        return res.status(400).json({ error: detail, missingRequiredCodes, requiredCount });
      }
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

      // Get SME - either from request body (coordinator's choice) or find first active one
      let sme = null;
      if (req.body.sme_id) {
        sme = await models.SubjectMethodExpert.findOne({
          where: {
            sme_id: req.body.sme_id,
            course_id: courseId,
            end_date: null,
          },
          include: [{
            model: models.Lecturer,
            as: 'lecturer',
            attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
          }],
        });
        if (!sme) {
          return res.status(404).json({ error: 'Selected SME not found or not active for this course.' });
        }
      } else {
        // Fallback: find first active SME for this course
        sme = await models.SubjectMethodExpert.findOne({
          where: {
            course_id: courseId,
            end_date: null,
          },
          include: [{
            model: models.Lecturer,
            as: 'lecturer',
            attributes: ['lecturer_id', 'lecturer_name', 'lecturer_email'],
          }],
        });
        if (!sme) {
          return res.status(404).json({ error: 'No active SME found for this course. Please assign an SME first.' });
        }
      }

      const sentSubjects = [];

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
          });

          // Create SME assignment
          const assignedAt = new Date();
          const programForCampus = await models.Program.findByPk(application.program_id, { attributes: ['campus_id'] });
          const smeDays = await svc.processWindow.getSmeEvalDaysForCampus(programForCampus?.campus_id, getSmeEvalDays());
          const dueAt = new Date(Date.now() + daysToMs(smeDays));
          await models.SMEAssignment.create({
            sme_id: sme.sme_id,
            application_id: application.ct_id,
            application_subject_id: newApplicationSubject.application_subject_id,
            pastSubject_id: pastSubject.pastSubject_id,
            old_campus_id: oldCampusId,
            assigned_at: assignedAt,
            due_at: dueAt,
            completed_at: null,
            assignment_status: 'pending',
          });
        } else {
          // Update past subject status even if assignment exists (in case it was reset)
          await pastSubject.update({
            approval_status: 'needs_sme_review',
            needs_sme_review: true,
          });
        }

        sentSubjects.push(pastSubject.pastSubject_id);
      }

      // Mark other similar mappings as "SME is evaluating" (subject-level)
      await markSimilarMappingsAsSmeEvaluating({
        oldCampusId,
        oldProgrammeName: application.prev_programme_name,
        programId: application.program_id,
        courseId,
      });

      // Notify SME only if there is at least 1 subject that truly requires SME
      if (sentSubjects.length > 0) {
        const coordinatorLecturer = await models.Lecturer.findByPk(lecturerId, {
          attributes: ['lecturer_name'],
        });
        const coordinatorName = coordinatorLecturer?.lecturer_name || 'Coordinator';
        const programForCampus = await models.Program.findByPk(application.program_id, { attributes: ['campus_id'] });
        const smeDays = await svc.processWindow.getSmeEvalDaysForCampus(programForCampus?.campus_id, getSmeEvalDays());
        const due = new Date(Date.now() + daysToMs(smeDays));
        await createNotification({
          receiver_type: 'lecturer',
          receiver_id: sme.lecturer?.lecturer_id,
          noti_type: 'sme_task_assigned',
          noti_title: 'New SME evaluation task',
          noti_message: `${coordinatorName} sent you a task to evaluate a credit transfer subject. Due: ${due.toISOString().slice(0, 10)}.`,
          link_path: '/expert/assignments',
        });
      }

      return res.json({
        message: sentSubjects.length > 0
          ? `Sent ${sentSubjects.length} subject(s) to SME for review`
          : `No subjects were sent to SME`,
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

// Coordinator: send selected approved current subjects to Head of Section
async function sendApprovedSubjectsToHos(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can perform this action' });
    }

    // Enforce CT process window (lecturer campus)
    const lecturer = await models.Lecturer.findByPk(lecturerId, { attributes: ['campus_id'] });
    const ctOpen = await svc.processWindow.isCtProcessOpenForCampus(lecturer?.campus_id);
    if (!ctOpen) {
      return res.status(403).json({ error: 'Credit transfer process window is closed for your campus.' });
    }

    const coordinator = await models.Coordinator.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
    });
    if (!coordinator) return res.status(404).json({ error: 'Coordinator not found' });

    const { ct_id, applicationSubjectIds } = req.body;
    if (!ct_id || !Array.isArray(applicationSubjectIds) || applicationSubjectIds.length === 0) {
      return res.status(400).json({ error: 'ct_id and applicationSubjectIds[] are required' });
    }

    const application = await models.CreditTransferApplication.findOne({
      where: { ct_id, coordinator_id: coordinator.coordinator_id },
      include: [{ model: models.Program, as: 'program', attributes: ['program_id', 'campus_id'], required: false }],
    });
    if (!application) return res.status(404).json({ error: 'Application not found or not assigned to you' });

    const campusId = application.program?.campus_id;
    if (!campusId) return res.status(400).json({ error: 'Cannot determine campus for this application' });

    // Find an active HOS in the same campus AND same program
    const hos = await models.HeadOfSection.findOne({
      where: { end_date: null, program_id: application.program_id },
      include: [{
        model: models.Lecturer,
        as: 'lecturer',
        where: { campus_id: campusId },
        attributes: ['lecturer_id', 'lecturer_name', 'campus_id'],
        required: true,
      }],
      order: [['start_date', 'DESC']],
    });
    if (!hos) return res.status(404).json({ error: 'No active Head of Section found for this program' });

    // Load subjects and validate eligibility (fully approved)
    const { Op } = require('sequelize');
    const subjects = await models.NewApplicationSubject.findAll({
      where: { application_subject_id: { [Op.in]: applicationSubjectIds }, ct_id: application.ct_id },
      include: [{ model: models.PastApplicationSubject, as: 'pastApplicationSubjects', required: false }],
    });
    if (subjects.length === 0) return res.status(404).json({ error: 'No subjects found for this application' });

    const eligible = [];
    const ineligible = [];
    for (const s of subjects) {
      const pasts = s.pastApplicationSubjects || [];
      const allApproved = pasts.length > 0 && pasts.every(p => ['approved_template3', 'approved_sme'].includes(p.approval_status));
      if (allApproved) eligible.push(s);
      else ineligible.push({ application_subject_id: s.application_subject_id });
    }

    if (eligible.length === 0) {
      return res.status(409).json({ error: 'No selected subjects are eligible to send to HOS', ineligible });
    }

    const created = [];
    const skipped = [];
    for (const s of eligible) {
      const existing = await models.HosReview.findOne({
        where: {
          ct_id: application.ct_id,
          application_subject_id: s.application_subject_id,
          status: 'pending',
        },
      });
      if (existing) {
        // Ensure statuses are consistent if already sent previously
        await models.PastApplicationSubject.update(
          { approval_status: 'hos_pending' },
          {
            where: {
              application_subject_id: s.application_subject_id,
              approval_status: { [Op.in]: ['approved_template3', 'approved_sme'] },
            },
          }
        );
        skipped.push(s.application_subject_id);
        continue;
      }
      const review = await models.HosReview.create({
        hos_id: hos.hos_id,
        application_subject_id: s.application_subject_id,
        ct_id: application.ct_id,
        coordinator_id: coordinator.coordinator_id,
        status: 'pending',
      });
      // Override prior approval statuses; HOS is now the active stage
      await models.PastApplicationSubject.update(
        { approval_status: 'hos_pending' },
        {
          where: {
            application_subject_id: s.application_subject_id,
            approval_status: { [Op.in]: ['approved_template3', 'approved_sme'] },
          },
        }
      );
      created.push(review.hos_review_id);
    }

    // Notify HOS (lecturer) that new review(s) are pending
    const coordinatorLecturer = await models.Lecturer.findByPk(lecturerId, {
      attributes: ['lecturer_name'],
    });
    const coordinatorName = coordinatorLecturer?.lecturer_name || 'Coordinator';
    await createNotification({
      receiver_type: 'lecturer',
      receiver_id: hos.lecturer?.lecturer_id,
      noti_type: 'hos_review_assigned',
      noti_title: 'New HOS review request',
      noti_message: `${coordinatorName} sent ${created.length} subject(s) for your review.`,
      link_path: '/hos/reviews',
    });

    res.json({
      message: `Sent ${created.length} subject(s) to HOS`,
      hos_id: hos.hos_id,
      created,
      skipped,
      ineligible,
    });
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

// Get student profile (for previous study details)
async function getStudentProfile(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can view their profile' });
    }

    const student = await models.Student.findByPk(studentId, {
      include: [
        {
          model: models.StudentOldCampus,
          as: 'oldCampus',
          attributes: ['old_campus_id', 'old_campus_name'],
        },
        {
          model: models.Program,
          as: 'program',
          attributes: ['program_id', 'program_name', 'program_code'],
        },
        {
          model: models.Campus,
          as: 'campus',
          attributes: ['campus_id', 'campus_name'],
        },
      ],
      attributes: [
        'student_id',
        'student_identifier',
        'student_name',
        'student_email',
        'student_phone',
        'program_id',
        'campus_id',
        'old_campus_id',
        'prev_programme_name',
      ],
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const creditTransferApplicationCount = await models.CreditTransferApplication.count({
      where: { student_id: studentId },
    });

    res.json({
      student,
      has_credit_transfer_applications: creditTransferApplicationCount > 0,
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Student: update their own profile (name, email, phone, program, old campus, prev programme)
async function updateStudentProfile(req, res) {
  try {
    const studentId = req.user.id;
    if (!studentId || req.user.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can update their profile' });
    }

    if (req.body.campus_id !== undefined) {
      return res.status(400).json({ error: 'campus_id cannot be set directly; it follows your program.' });
    }

    const {
      student_name,
      student_email,
      student_phone,
      student_identifier,
      program_id,
      old_campus_id,
      prev_programme_name,
    } = req.body;

    const student = await models.Student.findByPk(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const ctCount = await models.CreditTransferApplication.count({
      where: { student_id: studentId },
    });
    const hasCt = ctCount > 0;

    const patch = {};

    if (student_name !== undefined) {
      const v = String(student_name || '').trim();
      if (!v) return res.status(400).json({ error: 'student_name cannot be empty' });
      patch.student_name = v;
    }

    if (student_email !== undefined) {
      const v = String(student_email || '').trim().toLowerCase();
      if (!v) return res.status(400).json({ error: 'student_email cannot be empty' });
      const current = String(student.student_email || '').trim().toLowerCase();
      if (v !== current) {
        const dupStudent = await models.Student.findOne({
          where: { student_email: v, student_id: { [Op.ne]: studentId } },
          attributes: ['student_id'],
        });
        if (dupStudent) {
          return res.status(409).json({ error: 'That email is already in use by another student' });
        }
        const dupLecturer = await models.Lecturer.findOne({
          where: { lecturer_email: v },
          attributes: ['lecturer_id'],
        });
        if (dupLecturer) {
          return res.status(409).json({ error: 'That email is already in use' });
        }
      }
      patch.student_email = v;
    }

    if (student_identifier !== undefined) {
      const v = String(student_identifier || '').trim();
      if (!v) return res.status(400).json({ error: 'student_identifier cannot be empty' });
      const current = student.student_identifier ? String(student.student_identifier).trim() : '';
      if (v !== current) {
        const dup = await models.Student.findOne({
          where: { student_identifier: v, student_id: { [Op.ne]: studentId } },
          attributes: ['student_id'],
        });
        if (dup) {
          return res.status(409).json({ error: 'That student ID is already in use' });
        }
      }
      patch.student_identifier = v;
    }

    if (student_phone !== undefined) {
      patch.student_phone = String(student_phone || '').trim() || null;
    }

    if (program_id !== undefined) {
      const newPid =
        program_id === '' || program_id === null ? null : parseInt(program_id, 10);
      const oldPid = student.program_id;
      if (newPid !== oldPid) {
        if (hasCt) {
          return res.status(409).json({
            error:
              'You already have credit transfer applications. Program cannot be changed. Contact support if you need to correct your enrolment.',
          });
        }
        if (newPid == null || Number.isNaN(newPid)) {
          return res.status(400).json({ error: 'program_id is required' });
        }
        const program = await models.Program.findByPk(newPid, {
          attributes: ['program_id', 'campus_id'],
        });
        if (!program) return res.status(404).json({ error: 'Program not found' });
        patch.program_id = newPid;
        patch.campus_id = program.campus_id;
      }
    }

    if (old_campus_id !== undefined) {
      const newOld =
        old_campus_id === '' || old_campus_id === null ? null : parseInt(old_campus_id, 10);
      const oldOld = student.old_campus_id;
      if (newOld !== oldOld) {
        if (hasCt) {
          return res.status(409).json({
            error:
              'You already have credit transfer applications. Previous institution campus cannot be changed. Contact support if you need to correct it.',
          });
        }
        if (newOld != null && !Number.isNaN(newOld)) {
          const oldCampus = await models.StudentOldCampus.findByPk(newOld, {
            attributes: ['old_campus_id'],
          });
          if (!oldCampus) return res.status(404).json({ error: 'Previous institution campus not found' });
        }
        patch.old_campus_id =
          newOld == null || Number.isNaN(newOld) ? null : newOld;
      }
    }

    if (prev_programme_name !== undefined) {
      const v =
        prev_programme_name == null || prev_programme_name === ''
          ? null
          : String(prev_programme_name).trim() || null;
      const oldV = student.prev_programme_name
        ? String(student.prev_programme_name).trim()
        : null;
      if (v !== oldV) {
        if (hasCt) {
          return res.status(409).json({
            error:
              'You already have credit transfer applications. Previous programme name cannot be changed. Contact support if you need to correct it.',
          });
        }
        patch.prev_programme_name = v;
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    await student.update(patch);

    const updated = await models.Student.findByPk(studentId, {
      include: [
        {
          model: models.StudentOldCampus,
          as: 'oldCampus',
          attributes: ['old_campus_id', 'old_campus_name'],
        },
        {
          model: models.Program,
          as: 'program',
          attributes: ['program_id', 'program_name', 'program_code'],
        },
        {
          model: models.Campus,
          as: 'campus',
          attributes: ['campus_id', 'campus_name'],
        },
      ],
      attributes: [
        'student_id',
        'student_identifier',
        'student_name',
        'student_email',
        'student_phone',
        'program_id',
        'campus_id',
        'old_campus_id',
        'prev_programme_name',
      ],
    });

    res.json({
      message: 'Profile updated',
      student: updated,
      has_credit_transfer_applications: hasCt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Student: reapply for ONE current subject in an existing application (no new CT created)
async function reapplySubject(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId || req.user?.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can perform this action' });
    }

    const { ct_id, application_subject_id } = req.body;
    if (!ct_id || !application_subject_id) {
      return res.status(400).json({ error: 'ct_id and application_subject_id are required' });
    }

    const application = await models.CreditTransferApplication.findOne({
      where: { ct_id, student_id: studentId },
      include: [
        { model: models.Program, as: 'program', attributes: ['program_id', 'campus_id'], required: false },
        { model: models.Coordinator, as: 'coordinator', attributes: ['coordinator_id', 'lecturer_id'], required: false },
      ],
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Enforce CT process window (student campus)
    const ctOpen = await svc.processWindow.isCtProcessOpenForCampus(application.program?.campus_id);
    if (!ctOpen) {
      return res.status(403).json({ error: 'Credit transfer process window is closed for your campus.' });
    }

    const subject = await models.NewApplicationSubject.findOne({
      where: { application_subject_id, ct_id: application.ct_id },
      include: [{ model: models.PastApplicationSubject, as: 'pastApplicationSubjects', required: false }],
    });
    if (!subject) return res.status(404).json({ error: 'Current subject not found for this application' });

    // Only allow reapply if there is at least 1 rejected past subject (coordinator already decided)
    const hasRejected = (subject.pastApplicationSubjects || []).some(
      (p) => String(p.approval_status || '').toLowerCase() === 'rejected'
    );
    if (!hasRejected) {
      return res.status(409).json({ error: 'This subject is not eligible for reapply.' });
    }

    // Parse mapping payload (single row format)
    let mapping = null;
    if (req.body.mapping) {
      try {
        mapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
      } catch {
        mapping = null;
      }
    }
    if (!mapping || !Array.isArray(mapping.pastSubjects)) {
      return res.status(400).json({ error: 'mapping (with pastSubjects[]) is required' });
    }

    // Delete existing past subjects for this current subject, then recreate
    await models.PastApplicationSubject.destroy({ where: { application_subject_id: subject.application_subject_id } });

    // Save uploaded PDF files from req.files (global multer)
    const files = req.files || [];
    const usedFiles = new Set();

    const saved = [];
    for (const ps of mapping.pastSubjects) {
      const code = ps.code || '';
      const name = ps.name || '';
      const grade = ps.grade || '';
      const credit = ps.credit || '';
      const syllabusFileName = ps.syllabus;
      const syllabusExistingPath = ps.syllabus_existing_path || ps.syllabusExistingPath || null;

      let syllabusPath = null;
      let originalFilename = null;

      if (syllabusFileName) {
        const uploadPath = 'uploads/syllabi';
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

        const uploadedFile = files.find((f, idx) => f.originalname === syllabusFileName && !usedFiles.has(idx));
        if (uploadedFile) {
          usedFiles.add(files.indexOf(uploadedFile));
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const filename = `syllabus-${uniqueSuffix}${path.extname(uploadedFile.originalname)}`;
          const filePath = path.join(uploadPath, filename);
          fs.writeFileSync(filePath, uploadedFile.buffer);
          syllabusPath = `/uploads/syllabi/${filename}`;
          originalFilename = uploadedFile.originalname;
        }
      }

      // If student didn't re-upload the old syllabus, preserve the existing path.
      // This is safe because reapply recreates rows but doesn't delete files from disk.
      if (!syllabusPath && syllabusExistingPath) {
        syllabusPath = syllabusExistingPath;
      }

      const created = await models.PastApplicationSubject.create({
        pastSubject_code: code,
        pastSubject_name: name,
        pastSubject_grade: grade,
        pastSubject_credit: credit ? parseInt(credit, 10) : null,
        pastSubject_syllabus_path: syllabusPath,
        original_filename: originalFilename,
        approval_status: 'pending',
        template3_id: null,
        similarity_percentage: null,
        needs_sme_review: false,
        sme_review_notes: null,
        coordinator_notes: null,
        application_subject_id: subject.application_subject_id,
      });
      saved.push(created);
    }

    // If there's an ACTIVE SME evaluation for the same subject-level key, reflect it immediately in coordinator view.
    // This avoids requiring the coordinator to re-send the exact same mapping while SME is already evaluating it.
    try {
      const student = await models.Student.findByPk(studentId, { attributes: ['old_campus_id'] });
      const oldCampusId = student?.old_campus_id || null;
      const courseId = subject.course_id || null;
      if (oldCampusId && courseId && application.prev_programme_name) {
        const hasActive = await hasActiveSmeAssignmentForSubjectKey({
          oldCampusId,
          oldProgrammeName: application.prev_programme_name,
          programId: application.program_id,
          courseId,
        });
        if (hasActive) {
          for (const created of saved) {
            if (String(created.approval_status || '').toLowerCase() !== 'pending') continue;
            await created.update({
              approval_status: 'needs_sme_review',
              needs_sme_review: true,
              coordinator_notes: 'An SME is currently evaluating the same mapping',
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to auto-mark SME evaluating for reapply:', e?.message || e);
    }

    // Notify coordinator
    if (application.coordinator?.lecturer_id) {
      const student = await models.Student.findByPk(studentId, { attributes: ['student_name'] });
      await createNotification({
        receiver_type: 'lecturer',
        receiver_id: application.coordinator.lecturer_id,
        noti_type: 'student_reapply',
        noti_title: 'Student resubmitted a subject',
        noti_message: `${student?.student_name || 'A student'} resubmitted past subjects for a credit transfer subject.`,
        link_path: `/coordinator/review/${application.ct_id}`,
      });
    }

    res.json({ message: 'Reapply submitted', ct_id: application.ct_id, application_subject_id: subject.application_subject_id });
  } catch (error) {
    console.error('reapplySubject error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  submitApplication,
  getStudentApplications,
  getStudentProfile,
  updateStudentProfile,
  reapplySubject,
  getCoordinatorApplications,
  updateApplication,
  reviewSubject,
  checkTemplate3ForCurrentSubject,
  sendApprovedSubjectsToHos,
  getSMEsForCourse,
  uploadMiddleware, // Export for use in routes if needed
};

