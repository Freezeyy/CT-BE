const LocalStrategy = require('passport-local').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const JWTstrategy = require('passport-jwt').Strategy;
const passport = require('passport');
const bcrypt = require('bcrypt');
const moment = require('moment');
const { encoderBase64 } = require('./helper');
// load models
const models = require('./models');
const Student = models.Student;
const Lecturer = models.Lecturer;

// Signup passport - only students can signup
passport.use('signup', new LocalStrategy({ usernameField: 'email', passwordField: 'password', passReqToCallback: true },
  async (req, uname, pass, done) => {
    const {
      name, email, password, phone, program_id, campus_id, old_campus_name, prev_programme_name,
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !program_id || !campus_id) {
      return done(null, false, { message: 'Missing required fields: name, email, password, program_id, and campus_id are required' });
    }
    
    // Check if email exists in either Student or Lecturer
    const student = await Student.findOne({ where: { student_email: email } });
    const lecturer = await Lecturer.findOne({ where: { lecturer_email: email } });
    
    if (student || lecturer) {
      return done(null, false, { message: 'That email is already taken' });
    }
    
    const hashpass = bcrypt.hashSync(password, bcrypt.genSaltSync());
    
    try {
      // Handle old_campus_id - find or create StudentOldCampus
      let oldCampusId = null;
      if (old_campus_name) {
        const StudentOldCampus = models.StudentOldCampus;
        let oldCampus = await StudentOldCampus.findOne({ 
          where: { old_campus_name: old_campus_name } 
        });
        
        if (!oldCampus) {
          // Create new StudentOldCampus if it doesn't exist
          oldCampus = await StudentOldCampus.create({
            old_campus_name: old_campus_name,
          });
        }
        oldCampusId = oldCampus.old_campus_id;
      }
      
      // Only students can signup
      const newStudent = await Student.create({
        student_name: name,
        student_email: email,
        student_password: hashpass,
        student_phone: phone || null,
        program_id: program_id, // Required - program they want to apply for credit transfer
        campus_id: campus_id, // Required - campus they want to transfer credits to
        old_campus_id: oldCampusId, // Set from registration
        prev_programme_name: prev_programme_name || null, // Previous programme name from registration
      });
      return done(null, newStudent);
    } catch (error) {
      return done(error, false);
    }
  }));

// Login passport - checks both Student and Lecturer
passport.use('login', new LocalStrategy({ usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      // Check Student first
      let user = await Student.findOne({ where: { student_email: email } });
      let passwordField = 'student_password';
      
      // If not found in Student, check Lecturer
      if (!user) {
        user = await Lecturer.findOne({ where: { lecturer_email: email } });
        passwordField = 'lecturer_password';
      }
      
      if (!user) return done(null, false, { message: 'User not found' });
      
      // Validate password
      const validate = await bcrypt.compare(password, user[passwordField]);
      if (!validate) return done(null, false, { message: 'Wrong Password' });
      
      // Add userType and other fields to user object for JWT
      user.userType = user.student_id ? 'student' : 'lecturer';
      user.id = user.student_id || user.lecturer_id;
      user.email = user.student_email || user.lecturer_email;
      // Add is_admin flag for lecturers (handle MySQL boolean conversion)
      if (user.lecturer_id) {
        user.is_admin = user.is_admin === true || user.is_admin === 1 || user.is_admin === '1';
      }
      
      return done(null, user, { message: 'Logged in Successfully' });
    } catch (error) {
      return done(error, false, { message: error });
    }
  }));

// JWT passport - checks both Student and Lecturer
passport.use('jwt', new JWTstrategy({
  jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.PROJECT_JWT_SECRET,
}, async (jwt_payload, done) => {
  try {
    // Check userType from JWT payload
    if (jwt_payload.userType === 'lecturer') {
      const user = await Lecturer.findOne({ where: { lecturer_id: jwt_payload.uid } });
      if (user) {
        user.userType = 'lecturer';
        user.id = user.lecturer_id;
        user.email = user.lecturer_email;
        // Handle MySQL boolean conversion (0/1 to true/false)
        user.is_admin = user.is_admin === true || user.is_admin === 1 || user.is_admin === '1';
        return done(null, user);
      }
    } else {
      // Default to student
      const user = await Student.findOne({ where: { student_id: jwt_payload.uid } });
      if (user) {
        user.userType = 'student';
        user.id = user.student_id;
        user.email = user.student_email;
        return done(null, user);
      }
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

passport.use('forgotpasswordjwt', new JWTstrategy({
  jwtFromRequest: ExtractJWT.fromBodyField('token'),
  secretOrKey: process.env.PROJECT_JWT_SECRET,
}, async (jwt_payload, done) => {
  try {
    const userId = encoderBase64(jwt_payload.uid, false);
    
    // Check userType from JWT payload
    let user;
    if (jwt_payload.userType === 'lecturer') {
      user = await Lecturer.findOne({ where: { lecturer_id: userId } });
      if (user) {
        user.userType = 'lecturer';
        user.id = user.lecturer_id;
        user.email = user.lecturer_email;
        user.is_admin = user.is_admin || false;
      }
    } else {
      user = await Student.findOne({ where: { student_id: userId } });
      if (user) {
        user.userType = 'student';
        user.id = user.student_id;
        user.email = user.student_email;
      }
    }
    
    if (!user) return done('Fail to validate user', false);
    if (moment().unix() > encoderBase64(jwt_payload.token, false)) return done('Token expired', false);
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));
