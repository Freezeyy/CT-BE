const express = require('express');

const router = express.Router();
const c = require('../controllers');

// Route Open

router.get('/', c.general.index);
router.get('/staticdata', c.general.staticdata);
router.get('/uni-types', c.general.getUniTypes);
router.get('/institutions', c.general.getInstitutions);
router.get('/old-campuses', c.general.getOldCampusesByInstitution);
router.post('/login', c.auth.login);
router.post('/signup', c.auth.signup);
router.post('/forgot-password', c.user.passwordForgot);
router.post('/verify-reset-password-token', c.auth.passwordResetTokenValidation);
router.post('/reset-password', c.auth.passwordReset);

// Maintenance / tools (development or test only)
router.post('/maintenance/clean-database', c.maintenance.cleanDatabase);

module.exports = router;

