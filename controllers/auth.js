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

    // 1. Check if admin (highest priority)
    if (user.is_admin) {
      return 'Administrator';
    }

    // 2. Check if Head of Section
    const hos = await models.HeadOfSection.findOne({
      where: {
        lecturer_id: lecturerId,
        end_date: null, // Active role
      },
    });
    if (hos) {
      return 'Head Of Section';
    }

    // 3. Check if Program Coordinator
    const coordinator = await models.Coordinator.findOne({
      where: {
        lecturer_id: lecturerId,
        end_date: null, // Active role
      },
    });
    if (coordinator) {
      return 'Program Coordinator';
    }

    // 4. Check if Subject Method Expert
    const sme = await models.SubjectMethodExpert.findOne({
      where: {
        lecturer_id: lecturerId,
        end_date: null, // Active role
      },
    });
    if (sme) {
      return 'Subject Method Expert';
    }

    // Default lecturer role (though frontend might not handle this)
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
          is_admin: user.is_admin || false // Include is_admin in JWT for lecturers
        };
        // Sign the JWT token and populate the payload with the user email and id
        // Send back the token to the user
        const token = jwt.sign(jwt_content, process.env.PROJECT_JWT_SECRET, { expiresIn: 86400 });
        const refreshToken = randtoken.uid(256);
        refreshTokens[refreshToken] = user.email;
        res.json({ token, refreshToken, role, name: userName });
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
      user.update({
        password: bcrypt.hashSync(req.body.password, bcrypt.genSaltSync()),
        reset_token: null,
      });
      res.json({ status: 'successfuly update user password' });
    } catch (error) {
      res.status(500).json({ error });
    }
  })(req, res, next);
}

module.exports = {
  login, signup, passwordResetTokenValidation, passwordReset,
};
