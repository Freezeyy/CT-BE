const models = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get SME assignments
async function getSMEAssignments(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can view SME assignments' });
    }

    // Find active SME for this lecturer
    const sme = await models.SubjectMethodExpert.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
      include: [{
        model: models.Course,
        as: 'course',
        attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
      }],
    });

    if (!sme) {
      return res.status(404).json({ error: 'SME not found or not active' });
    }

    // Get all assignments for this SME
    // Use LEFT JOIN for PastApplicationSubject to ensure assignments show even if past subject has issues
    const assignments = await models.SMEAssignment.findAll({
      where: { sme_id: sme.sme_id },
      include: [
        {
          model: models.PastApplicationSubject,
          as: 'pastApplicationSubject',
          required: false, // LEFT JOIN - show assignments even if past subject is missing
          include: [{
            model: models.NewApplicationSubject,
            as: 'newApplicationSubject',
            required: false, // LEFT JOIN
            include: [{
              model: models.CreditTransferApplication,
              as: 'creditTransferApplication',
              required: false, // LEFT JOIN
              include: [
                {
                  model: models.Student,
                  as: 'student',
                  attributes: ['student_id', 'student_name', 'student_email'],
                  required: false,
                },
                {
                  model: models.Program,
                  as: 'program',
                  attributes: ['program_id', 'program_name', 'program_code'],
                  required: false,
                },
              ],
            }],
          }],
        },
        {
          model: models.StudentOldCampus,
          as: 'oldCampus',
          attributes: ['old_campus_id', 'old_campus_name'],
          required: false,
        },
      ],
      order: [['assignment_id', 'DESC']],
    });

    // Group assignments by application_subject_id (current subject)
    // Multiple past subjects for one current subject should be reviewed together
    const groupedByCurrentSubject = {};
    
    assignments.forEach(assignment => {
      const applicationSubjectId = assignment.pastApplicationSubject?.newApplicationSubject?.application_subject_id;
      
      if (!applicationSubjectId) return; // Skip if no current subject
      
      if (!groupedByCurrentSubject[applicationSubjectId]) {
        // First past subject for this current subject - create group
        groupedByCurrentSubject[applicationSubjectId] = {
          application_subject_id: applicationSubjectId,
          application_subject_name: assignment.pastApplicationSubject?.newApplicationSubject?.application_subject_name,
          course: sme.course,
          application: {
            ct_id: assignment.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.ct_id,
            ct_status: assignment.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.ct_status,
            prev_campus_name: assignment.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.prev_campus_name,
            prev_programme_name: assignment.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.prev_programme_name,
            student: assignment.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.student,
            program: assignment.pastApplicationSubject?.newApplicationSubject?.creditTransferApplication?.program,
          },
          oldCampus: assignment.oldCampus,
          pastSubjects: [],
          assignment_ids: [],
        };
      }
      
      // Add past subject to the group
      if (assignment.pastApplicationSubject) {
        groupedByCurrentSubject[applicationSubjectId].pastSubjects.push({
          assignment_id: assignment.assignment_id,
          pastSubject_id: assignment.pastApplicationSubject.pastSubject_id,
          pastSubject_code: assignment.pastApplicationSubject.pastSubject_code,
          pastSubject_name: assignment.pastApplicationSubject.pastSubject_name,
          pastSubject_grade: assignment.pastApplicationSubject.pastSubject_grade,
          pastSubject_syllabus_path: assignment.pastApplicationSubject.pastSubject_syllabus_path,
          original_filename: assignment.pastApplicationSubject.original_filename,
          approval_status: assignment.pastApplicationSubject.approval_status,
          similarity_percentage: assignment.pastApplicationSubject.similarity_percentage,
          sme_review_notes: assignment.pastApplicationSubject.sme_review_notes,
          coordinator_notes: assignment.pastApplicationSubject.coordinator_notes,
        });
        groupedByCurrentSubject[applicationSubjectId].assignment_ids.push(assignment.assignment_id);
      }
    });

    // Convert grouped object to array
    const groupedAssignments = Object.values(groupedByCurrentSubject);

    res.json({ assignments: groupedAssignments });
  } catch (error) {
    console.error('Get SME assignments error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get detailed subject information for review (by application_subject_id - current subject)
// Returns all past subjects for this current subject so SME can review them together
async function getSubjectDetails(req, res) {
  try {
    const lecturerId = req.user.id;
    const { applicationSubjectId } = req.params; // Changed from pastSubjectId to applicationSubjectId

    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can view subject details' });
    }

    // Find active SME
    const sme = await models.SubjectMethodExpert.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
      include: [{
        model: models.Course,
        as: 'course',
        attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
      }],
    });

    if (!sme) {
      return res.status(404).json({ error: 'SME not found or not active' });
    }

    // Get the current subject (NewApplicationSubject) with all its past subjects
    const newApplicationSubject = await models.NewApplicationSubject.findByPk(applicationSubjectId, {
      include: [
        {
          model: models.CreditTransferApplication,
          as: 'creditTransferApplication',
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
          ],
        },
        {
          model: models.Course,
          as: 'course',
          attributes: ['course_id', 'course_name', 'course_code', 'course_credit'],
        },
        {
          model: models.PastApplicationSubject,
          as: 'pastApplicationSubjects',
          include: [{
            model: models.Template3,
            as: 'template3',
            attributes: ['template3_id', 'old_subject_code', 'old_subject_name', 'new_subject_code', 'new_subject_name', 'similarity_percentage'],
            required: false,
          }],
        },
      ],
    });

    if (!newApplicationSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Verify that at least one past subject has an SME assignment for this SME
    const pastSubjectIds = newApplicationSubject.pastApplicationSubjects.map(ps => ps.pastSubject_id);
    const assignments = await models.SMEAssignment.findAll({
      where: {
        sme_id: sme.sme_id,
        pastSubject_id: { [Op.in]: pastSubjectIds },
      },
    });

    if (assignments.length === 0) {
      return res.status(403).json({ error: 'This assignment does not belong to you' });
    }

    // Get the new institution course details
    const newCourse = sme.course;

    // Transform past subjects
    const pastSubjects = newApplicationSubject.pastApplicationSubjects.map(ps => ({
      pastSubject_id: ps.pastSubject_id,
      pastSubject_code: ps.pastSubject_code,
      pastSubject_name: ps.pastSubject_name,
      pastSubject_grade: ps.pastSubject_grade,
      pastSubject_credit: ps.pastSubject_credit,
      pastSubject_syllabus_path: ps.pastSubject_syllabus_path,
      original_filename: ps.original_filename,
      approval_status: ps.approval_status,
      similarity_percentage: ps.similarity_percentage,
      sme_review_notes: ps.sme_review_notes,
      coordinator_notes: ps.coordinator_notes,
      template3: ps.template3,
    }));

    res.json({
      pastSubjects, // Array of all past subjects
      newSubject: {
        application_subject_id: newApplicationSubject.application_subject_id,
        application_subject_name: newApplicationSubject.application_subject_name,
      },
      newCourse: {
        course_id: newCourse.course_id,
        course_name: newCourse.course_name,
        course_code: newCourse.course_code,
        course_credit: newCourse.course_credit,
      },
      application: {
        ct_id: newApplicationSubject.creditTransferApplication?.ct_id,
        ct_status: newApplicationSubject.creditTransferApplication?.ct_status,
        prev_campus_name: newApplicationSubject.creditTransferApplication?.prev_campus_name,
        prev_programme_name: newApplicationSubject.creditTransferApplication?.prev_programme_name,
        student: newApplicationSubject.creditTransferApplication?.student,
        program: newApplicationSubject.creditTransferApplication?.program,
      },
    });
  } catch (error) {
    console.error('Get subject details error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Review subject - Calculate similarity and approve/reject all past subjects for a current subject together
async function reviewSubject(req, res) {
  try {
    const lecturerId = req.user.id;
    const { applicationSubjectId } = req.params; // Changed from pastSubjectId to applicationSubjectId
    const { similarity_percentage, sme_review_notes, topics_comparison } = req.body;

    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can review subjects' });
    }

    if (!similarity_percentage || similarity_percentage < 0 || similarity_percentage > 100) {
      return res.status(400).json({ error: 'Similarity percentage must be between 0 and 100' });
    }

    // Find active SME
    const sme = await models.SubjectMethodExpert.findOne({
      where: { lecturer_id: lecturerId, end_date: null },
      include: [{
        model: models.Course,
        as: 'course',
      }],
    });

    if (!sme) {
      return res.status(404).json({ error: 'SME not found or not active' });
    }

    // Get the current subject with all its past subjects
    const newApplicationSubject = await models.NewApplicationSubject.findByPk(applicationSubjectId, {
      include: [
        {
          model: models.CreditTransferApplication,
          as: 'creditTransferApplication',
        },
        {
          model: models.PastApplicationSubject,
          as: 'pastApplicationSubjects',
          where: {
            approval_status: { [Op.in]: ['needs_sme_review', 'pending'] },
          },
          required: false,
        },
      ],
    });

    if (!newApplicationSubject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Verify that at least one past subject has an SME assignment for this SME
    const pastSubjectIds = newApplicationSubject.pastApplicationSubjects.map(ps => ps.pastSubject_id);
    if (pastSubjectIds.length === 0) {
      return res.status(400).json({ error: 'No pending past subjects found for this current subject' });
    }

    const assignments = await models.SMEAssignment.findAll({
      where: {
        sme_id: sme.sme_id,
        pastSubject_id: { [Op.in]: pastSubjectIds },
      },
    });

    if (assignments.length === 0) {
      return res.status(403).json({ error: 'This assignment does not belong to you' });
    }

    const application = newApplicationSubject.creditTransferApplication;

    // Determine approval status based on similarity
    const approval_status = similarity_percentage >= 80 ? 'approved_sme' : 'rejected';

    // Update ALL past subjects for this current subject with the same review
    const updatedPastSubjects = [];
    const createdTemplate3s = [];

    for (const pastSubject of newApplicationSubject.pastApplicationSubjects) {
      // Update past subject
      await pastSubject.update({
        approval_status,
        similarity_percentage, // Same similarity for all past subjects in the group
        sme_review_notes: sme_review_notes || null,
        needs_sme_review: false,
      });

      // If approved with >= 80%, automatically create Template3 entry for each past subject
      let template3 = null;
      if (approval_status === 'approved_sme' && similarity_percentage >= 80) {
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

        if (oldCampusId) {
          // Check if Template3 already exists for this mapping
          const existingTemplate3 = await models.Template3.findOne({
            where: {
              old_campus_id: oldCampusId,
              old_programme_name: application.prev_programme_name,
              program_id: application.program_id,
              course_id: sme.course_id,
              old_subject_code: pastSubject.pastSubject_code,
              is_active: true,
            },
          });

          if (!existingTemplate3) {
            // Create new Template3 entry
            template3 = await models.Template3.create({
              old_campus_id: oldCampusId,
              old_programme_name: application.prev_programme_name,
              program_id: application.program_id,
              course_id: sme.course_id,
              old_subject_code: pastSubject.pastSubject_code,
              old_subject_name: pastSubject.pastSubject_name,
              new_subject_code: sme.course.course_code,
              new_subject_name: sme.course.course_name,
              similarity_percentage,
              is_active: true,
            });

            // Update past subject with template3_id
            await pastSubject.update({
              template3_id: template3.template3_id,
            });
          } else {
            template3 = existingTemplate3;
            await pastSubject.update({
              template3_id: existingTemplate3.template3_id,
            });
          }
        }
      }

      updatedPastSubjects.push({
        pastSubject_id: pastSubject.pastSubject_id,
        pastSubject_code: pastSubject.pastSubject_code,
        pastSubject_name: pastSubject.pastSubject_name,
        approval_status: pastSubject.approval_status,
        similarity_percentage: pastSubject.similarity_percentage,
        template3_id: pastSubject.template3_id,
      });

      if (template3) {
        createdTemplate3s.push({
          template3_id: template3.template3_id,
          old_subject_code: template3.old_subject_code,
          new_subject_code: template3.new_subject_code,
          similarity_percentage: template3.similarity_percentage,
        });
      }
    }

    res.json({
      message: approval_status === 'approved_sme' 
        ? `All ${updatedPastSubjects.length} subjects approved and Template3 entries created` 
        : `All ${updatedPastSubjects.length} subjects rejected`,
      pastSubjects: updatedPastSubjects,
      template3s: createdTemplate3s,
      application_subject_id: applicationSubjectId,
    });
  } catch (error) {
    console.error('Review subject error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Serve syllabus file with authentication
async function getSyllabusFile(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can view syllabus files' });
    }

    // Get filename from params (e.g., syllabus-1234567890-987654321.pdf)
    const filename = req.params.filename;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Prevent directory traversal attacks
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Construct file path
    const filePath = path.join(__dirname, '..', 'uploads', 'syllabi', safeFilename);

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Verify it's a PDF file
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Send file with proper headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Get syllabus file error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getSMEAssignments,
  getSubjectDetails,
  reviewSubject,
  getSyllabusFile,
};

