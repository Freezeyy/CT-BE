const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const randtoken = require('rand-token');
const models = require('../models');

const refreshTokens = {};

// Helper function to determine user role
async function determineUserRole(user) {
  if (user.userType === 'student') {
    return 'Student';
  }

  // For lecturers, check their roles in priority order
  if (user.userType === 'lecturer') {
    const lecturerId = user.lecturer_id || user.id;

    // NOTE: "Admin access" is an access flag, not a functional role.
    // Prefer returning the functional role (HOS/Coordinator/SME) when present,
    // while still returning is_admin/is_superadmin in the login payload.

    // 1. Check if Head of Section
    const hos = await models.HeadOfSection.findOne({
      where: {
        lecturer_id: lecturerId,
        end_date: null, // Active role
      },
    });
    if (hos) {
      return 'Head Of Section';
    }

    // 2. Check if Program Coordinator
    const coordinator = await models.Coordinator.findOne({
      where: {
        lecturer_id: lecturerId,
        end_date: null, // Active role
      },
    });
    if (coordinator) {
      return 'Program Coordinator';
    }

    // 3. Check if Subject Matter Expert
    const sme = await models.SubjectMethodExpert.findOne({
      where: {
        lecturer_id: lecturerId,
        end_date: null, // Active role
      },
    });
    if (sme) {
      return 'Subject Method Expert';
    }

    // 4. If no functional role, fall back to admin roles (if any)
    if (user.is_superadmin) return 'Super Admin';
    if (user.is_admin) return 'Administrator';

    // Default lecturer role
    return 'Lecturer';
  }

  return 'Unknown';
}

function login(req, res, next) {
  passport.authenticate('login', async (err, user, info) => {
    try {
      if (err || !user) {
        res.status(401).json({ error: 'fail to authenticate user', details: info.message });
        return;
      }
      req.login(user, { session: false }, async (error) => {
        if (error) next(error);
        
        // Determine user role
        const role = await determineUserRole(user);
        
        // Get user's name
        const userName = user.student_name || user.lecturer_name || user.email;
        
        // Note: reset_token not in Student/Lecturer tables, can be added later if needed
        const jwt_content = { 
          uid: user.id, 
          email: user.email, 
          userType: user.userType || (user.student_id ? 'student' : 'lecturer'),
          is_admin: user.is_admin || false,
          is_superadmin: user.is_superadmin || false,
        };
        // Sign the JWT token and populate the payload with the user email and id
        // Send back the token to the user
        const token = jwt.sign(jwt_content, process.env.PROJECT_JWT_SECRET, { expiresIn: 86400 });
        const refreshToken = randtoken.uid(256);
        refreshTokens[refreshToken] = user.email;
        let campus_id = null;
        let campus_name = null;
        try {
          if (jwt_content.userType === 'lecturer') {
            const lecturer = await models.Lecturer.findByPk(user.id, { attributes: ['campus_id'] });
            campus_id = lecturer?.campus_id || null;
            if (campus_id) {
              const campus = await models.Campus.findByPk(campus_id, { attributes: ['campus_name'] });
              campus_name = campus?.campus_name || null;
            }
          }
        } catch {
          // ignore
        }

        res.json({
          token,
          refreshToken,
          role,
          name: userName,
          userType: jwt_content.userType,
          is_admin: !!jwt_content.is_admin,
          is_superadmin: !!jwt_content.is_superadmin,
          campus_id,
          campus_name,
        });
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
}

function signup(req, res, next) {
  passport.authenticate('signup', { session: false }, async (err, user, info) => {
    try {
      if (err || !user) {
        res.status(401).json({ error: 'fail to register user', message: info?.message || err?.message || 'Registration failed' });
        return;
      }
      // Don't send password back
      const userResponse = {
        student_id: user.student_id,
        student_identifier: user.student_identifier,
        student_name: user.student_name,
        student_email: user.student_email,
        student_phone: user.student_phone,
        program_id: user.program_id,
      };
      res.status(201).json({ user: userResponse });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
}

function passwordResetTokenValidation(req, res, next) {
  passport.authenticate('forgotpasswordjwt', async (err, user) => {
    try {
      if (err || !user) {
        res.status(404).json({ error: err || 'User not found' });
      } else if (!user.reset_token || user.reset_token !== req.body.token) {
        res.status(422).json({ error: 'Token is invalid' });
      } else {
        res.json({ status: true });
      }
      next();
    } catch (error) {
      res.status(500).json({ error });
      next();
    }
  })(req, res, next);
}

function passwordReset(req, res, next) {
  passport.authenticate('forgotpasswordjwt', async (err, user) => {
    try {
      if (err || !user) {
        res.status(404).json({ error: err });
        return;
      }
      if (!user.reset_token || user.reset_token !== req.body.token) {
        res.status(422).json({ error: 'Token is invalid' });
        return;
      }
      const hashed = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync());
      if (user.userType === 'lecturer') {
        await user.update({ lecturer_password: hashed, reset_token: null });
      } else {
        await user.update({ student_password: hashed, reset_token: null });
      }
      res.json({ status: 'successfuly update user password' });
    } catch (error) {
      res.status(500).json({ error });
    }
  })(req, res, next);
}

module.exports = {
  login, signup, passwordResetTokenValidation, passwordReset,
};
