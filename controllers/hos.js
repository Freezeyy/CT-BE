const { Op } = require('sequelize');
const models = require('../models');
const svc = require('../services');

/** Programme pipeline bucket for read-only Head of Section overview (aligned with coordinator inbox semantics). */
function deriveApplicationPipelineBucket(app) {
  const subjects = app.newApplicationSubjects || [];
  const statuses = subjects.flatMap((s) =>
    (s.pastApplicationSubjects || []).map((p) => String(p.approval_status || '').toLowerCase()),
  );

  const any = (arr) => statuses.some((x) => arr.includes(x));
  const all = (arr) => statuses.length > 0 && statuses.every((x) => arr.includes(x));

  if (statuses.length === 0) return 'coordinator';

  // Terminal outcomes
  if (any(['hos_rejected', 'rejected', 'sme_reviewed_rejected'])) return 'rejected';
  if (all(['hos_approved'])) return 'hos_completed';

  // Waiting on Head of Section
  if (any(['hos_pending'])) return 'hos_queue';

  if (any(['needs_sme_review'])) return 'awaiting_sme';

  if (any(['approved_sme'])) return 'coordinator_after_sme';
  if (all(['pending'])) return 'coordinator_needs_review';
  return 'coordinator_needs_review';
}

async function buildProgramPipelineStats(programId) {
  const applications = await models.CreditTransferApplication.findAll({
    where: {
      program_id: programId,
      ct_status: { [Op.ne]: 'draft' },
    },
    attributes: ['ct_id', 'ct_status', 'student_id'],
    include: [
      {
        model: models.NewApplicationSubject,
        as: 'newApplicationSubjects',
        attributes: ['application_subject_id'],
        include: [
          {
            model: models.PastApplicationSubject,
            as: 'pastApplicationSubjects',
            attributes: ['approval_status'],
            required: false,
          },
        ],
        required: false,
      },
    ],
  });

  const buckets = {
    coordinator: 0,
    awaiting_sme: 0,
    hos_queue: 0,
    terminal: 0,
  };

  const studentIds = new Set();

  for (const app of applications) {
    if (app.student_id != null) studentIds.add(app.student_id);
    const b = deriveApplicationPipelineBucket(app);
    if (b === 'awaiting_sme') buckets.awaiting_sme += 1;
    else if (b === 'hos_queue') buckets.hos_queue += 1;
    else if (b === 'rejected' || b === 'hos_completed') buckets.terminal += 1;
    else buckets.coordinator += 1;
  }

  return {
    applications_at_coordinator: buckets.coordinator,
    applications_awaiting_sme: buckets.awaiting_sme,
    applications_awaiting_hos: buckets.hos_queue,
    applications_terminal: buckets.terminal,
    total_applications: applications.length,
    distinct_students_applied: studentIds.size,
  };
}

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
    console.warn('Notification create failed:', e?.message || e);
  }
}

async function getActiveHosForLecturer(req) {
  const lecturerId = req.user?.id;
  if (!lecturerId || req.user?.userType !== 'lecturer') return null;
  return await models.HeadOfSection.findOne({
    where: { lecturer_id: lecturerId, end_date: null },
  });
}

// Dashboard: HOS review counts + programme-wide pipeline (read-only)
async function getHosReviewStats(req, res) {
  try {
    const hos = await getActiveHosForLecturer(req);
    if (!hos) return res.status(403).json({ error: 'Head of Section role not found' });

    const baseWhere = { hos_id: hos.hos_id };
    const [pending, approved, rejected, pipeline] = await Promise.all([
      models.HosReview.count({ where: { ...baseWhere, status: 'pending' } }),
      models.HosReview.count({ where: { ...baseWhere, status: 'approved' } }),
      models.HosReview.count({ where: { ...baseWhere, status: 'rejected' } }),
      buildProgramPipelineStats(hos.program_id),
    ]);

    const stats = {
      pending,
      approved,
      rejected,
      total: pending + approved + rejected,
    };

    res.json({ stats, pipeline });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function listMyHosReviews(req, res) {
  try {
    const hos = await getActiveHosForLecturer(req);
    if (!hos) return res.status(403).json({ error: 'Head of Section role not found' });

    const status = req.query.status || 'pending';

    const reviews = await models.HosReview.findAll({
      where: { hos_id: hos.hos_id, status },
      include: [
        {
          model: models.NewApplicationSubject,
          as: 'newApplicationSubject',
          include: [
            { model: models.Course, as: 'course', attributes: ['course_id', 'course_code', 'course_name', 'course_credit'], required: false },
            {
              model: models.CreditTransferApplication,
              as: 'creditTransferApplication',
              include: [
                { model: models.Student, as: 'student', attributes: ['student_id', 'student_name', 'student_email'], required: false },
                { model: models.Program, as: 'program', attributes: ['program_id', 'program_code', 'program_name'], required: false },
              ],
              required: false,
            },
          ],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Get one HOS review details (includes past subjects for display)
async function getHosReviewDetail(req, res) {
  try {
    const hos = await getActiveHosForLecturer(req);
    if (!hos) return res.status(403).json({ error: 'Head of Section role not found' });

    const { hosReviewId } = req.params;
    const review = await models.HosReview.findByPk(hosReviewId, {
      include: [
        {
          model: models.NewApplicationSubject,
          as: 'newApplicationSubject',
          include: [
            { model: models.Course, as: 'course', attributes: ['course_id', 'course_code', 'course_name', 'course_credit'], required: false },
            { model: models.PastApplicationSubject, as: 'pastApplicationSubjects', required: false },
            {
              model: models.CreditTransferApplication,
              as: 'creditTransferApplication',
              include: [
                { model: models.Student, as: 'student', attributes: ['student_id', 'student_name', 'student_email'], required: false },
                { model: models.Program, as: 'program', attributes: ['program_id', 'program_code', 'program_name'], required: false },
              ],
              required: false,
            },
          ],
          required: false,
        },
      ],
    });

    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.hos_id !== hos.hos_id) return res.status(403).json({ error: 'Not assigned to you' });

    res.json({ review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Decide (approve/reject) a HOS review
async function decideHosReview(req, res) {
  try {
    const hos = await getActiveHosForLecturer(req);
    if (!hos) return res.status(403).json({ error: 'Head of Section role not found' });

    // Enforce CT process window (lecturer campus)
    const lecturer = await models.Lecturer.findByPk(req.user.id, { attributes: ['campus_id'] });
    const ctOpen = await svc.processWindow.isCtProcessOpenForCampus(lecturer?.campus_id);
    if (!ctOpen) {
      return res.status(403).json({ error: 'Credit transfer process window is closed for your campus.' });
    }

    const { hosReviewId } = req.params;
    const { decision, hos_notes } = req.body; // decision: approved | rejected

    if (!decision || !['approved', 'rejected'].includes(String(decision).toLowerCase())) {
      return res.status(400).json({ error: 'decision must be "approved" or "rejected"' });
    }

    const review = await models.HosReview.findByPk(hosReviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.hos_id !== hos.hos_id) return res.status(403).json({ error: 'Not assigned to you' });
    if (review.status !== 'pending') return res.status(409).json({ error: 'This review is already decided' });

    await review.update({
      status: String(decision).toLowerCase(),
      hos_notes: hos_notes || null,
      decided_at: new Date(),
    });

    // Persist the current subject's stage/result into past-subject statuses
    const nextStatus = String(decision).toLowerCase() === 'approved' ? 'hos_approved' : 'hos_rejected';
    await models.PastApplicationSubject.update(
      { approval_status: nextStatus },
      {
        where: {
          application_subject_id: review.application_subject_id,
          approval_status: 'hos_pending',
        },
      }
    );

    // Notify coordinator + student about HOS decision
    const coordinator = await models.Coordinator.findOne({
      where: { coordinator_id: review.coordinator_id },
      include: [{ model: models.Lecturer, as: 'lecturer', attributes: ['lecturer_id', 'lecturer_name'], required: false }],
    });
    const hosLecturer = await models.Lecturer.findByPk(req.user.id, { attributes: ['lecturer_name'] });
    const hosName = hosLecturer?.lecturer_name || 'Head of Section';

    const subj = await models.NewApplicationSubject.findByPk(review.application_subject_id, {
      include: [{ model: models.Course, as: 'course', attributes: ['course_code', 'course_name'], required: false }],
    });
    const subjectName = (subj?.course?.course_code && subj?.course?.course_name)
      ? `${subj.course.course_code} ${subj.course.course_name}`
      : (subj?.application_subject_name || 'a subject');

    if (coordinator?.lecturer?.lecturer_id) {
      await createNotification({
        receiver_type: 'lecturer',
        receiver_id: coordinator.lecturer.lecturer_id,
        noti_type: 'hos_decision',
        noti_title: 'HOS decision recorded',
        noti_message: `${hosName} ${nextStatus === 'hos_approved' ? 'approved' : 'rejected'} ${subjectName}.`,
        link_path: `/coordinator/application/${review.ct_id}`,
      });
    }

    const application = await models.CreditTransferApplication.findByPk(review.ct_id, { attributes: ['student_id'] });
    if (application?.student_id) {
      await createNotification({
        receiver_type: 'student',
        receiver_id: application.student_id,
        noti_type: 'hos_decision',
        noti_title: 'Your application was updated',
        noti_message: `A decision has been made for ${subjectName}.`,
        link_path: '/student/history',
      });
    }

    res.json({ message: 'Decision saved', review });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getHosReviewStats,
  listMyHosReviews,
  getHosReviewDetail,
  decideHosReview,
};

