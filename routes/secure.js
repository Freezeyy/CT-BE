const express = require('express');

const router = express.Router();
const c = require('../controllers');
const m = require('../middleware');

router.get('/role', c.role.index);
router.get('/activitylog', m.requireAdminOrUser, c.activitylog.index);

router.get('/users', m.requireAdmin, c.user.index);
router.post('/user/:UserId', c.userUpdate.update);

// Admin routes
router.post('/admin/lecturer', m.requireAdmin, c.admin.createLecturer);
router.get('/admin/lecturers', m.requireAdmin, c.admin.getLecturers);
router.get('/admin/students', m.requireAdmin, c.admin.getStudents);
router.get('/admin/programs', m.requireAdmin, c.admin.getPrograms);

// Admin - Staff role management (MUST be before /role route to avoid conflicts)
router.get('/admin/staff-assignments', m.requireAdmin, c.admin.getStaffAssignments);
router.put('/admin/lecturer/:lecturer_id/role', m.requireAdmin, c.admin.updateLecturerRole);
router.post('/admin/end-staff-role', m.requireAdmin, c.admin.endStaffRole);

// Credit Transfer routes
// Note: Files are handled by global multer in app.js
router.post('/credit-transfer/apply', m.requireAdminOrUser, c.creditTransfer.submitApplication);
router.get('/credit-transfer/applications', m.requireAdminOrUser, c.creditTransfer.getStudentApplications);
router.get('/credit-transfer/coordinator/applications', m.requireAdminOrUser, c.creditTransfer.getCoordinatorApplications);
router.post('/credit-transfer/coordinator/review-subject', m.requireAdminOrUser, c.creditTransfer.reviewSubject);
router.post('/credit-transfer/coordinator/check-current-subject', m.requireAdminOrUser, c.creditTransfer.checkTemplate3ForCurrentSubject);
router.put('/credit-transfer/application/:applicationId', m.requireAdminOrUser, c.creditTransfer.updateApplication);

// SME routes
router.get('/credit-transfer/sme/assignments', m.requireAdminOrUser, c.sme.getSMEAssignments);
router.get('/credit-transfer/sme/subject/:applicationSubjectId', m.requireAdminOrUser, c.sme.getSubjectDetails);
router.post('/credit-transfer/sme/review-subject/:applicationSubjectId', m.requireAdminOrUser, c.sme.reviewSubject);

// Program routes
// GET /api/program/structure - Get program structure (and optionally courses with ?includeCourses=true)
router.get('/program/structure', m.requireAdminOrUser, c.program.getProgramStructure);
router.post('/program/structure', m.requireAdminOrUser, c.program.uploadProgramStructure);
// PUT /api/program/courses - Update courses for coordinator's program
router.put('/program/courses', m.requireAdminOrUser, c.program.updateCourses);

// Template3 routes
router.get('/template3', m.requireAdminOrUser, c.template3.getTemplate3Mappings);
router.post('/template3/upload-pdf', m.requireAdminOrUser, c.template3.uploadTemplate3PDF);
router.post('/template3', m.requireAdminOrUser, c.template3.createTemplate3Entry);
router.post('/template3/bulk', m.requireAdminOrUser, c.template3.bulkCreateTemplate3);
router.put('/template3/:template3Id', m.requireAdminOrUser, c.template3.updateTemplate3Entry);

// Appointment routes
router.get('/appointment/coordinators', m.requireAdminOrUser, c.appointment.getAvailableCoordinators);
router.post('/appointment', m.requireAdminOrUser, c.appointment.createAppointment);
router.get('/appointment/student', m.requireAdminOrUser, c.appointment.getStudentAppointments);
router.get('/appointment/coordinator', m.requireAdminOrUser, c.appointment.getCoordinatorAppointments);
router.put('/appointment/:appointmentId', m.requireAdminOrUser, c.appointment.updateAppointment);
// Let's say the route below is very sensitive and we want only authorized users to have access
// router.get('/nationalgps', c.nationalgps.index);
// router.post('/nationalgps', c.nationalgps.saveorupdate);
// router.get('/nationalneb', c.nationalneb.index);
// router.post('/nationalneb', c.nationalneb.saveorupdate);

// router.get('/solution-preset-names', m.requireAdmin, c.solutionpreset.presets);
// router.get('/solution-presets/:preset_name?', m.requireAdmin, c.solutionpreset.index);
// router.post('/solution-preset/:id', m.requireAdmin, c.solutionpreset.update);
// router.delete('/solution-preset/:id', m.requireAdmin, c.solutionpreset.destroy);
// router.post('/solution-preset', m.requireAdmin, c.solutionpreset.create);

module.exports = router;
