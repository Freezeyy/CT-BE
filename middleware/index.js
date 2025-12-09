const helper = require('../helper');

const ReqLogger = (req, res, next) => {
  const current_datetime = new Date();
  const formatted_date = `${current_datetime.getFullYear()
  }-${current_datetime.getMonth() + 1
  }-${current_datetime.getDate()
  } ${current_datetime.getHours()
  }:${current_datetime.getMinutes()
  }:${current_datetime.getSeconds()}`;
  const { method } = req;
  const { url } = req;
  const status = res.statusCode;
  const start = process.hrtime();
  const durationInMilliseconds = helper.getActualRequestDurationInMilliseconds(start);
  const log = `[${formatted_date}] ${method}:${url} ${status} ${durationInMilliseconds.toLocaleString()} ms`;
  console.log(log);
  next();
};

const requireAdminOrUser = (req, res, next) => {
  // Allow both students and lecturers (all authenticated users)
  if (!req.user || (!req.user.userType || (req.user.userType !== 'student' && req.user.userType !== 'lecturer'))) {
    res.status(403).send({ error: 'access denied' });
    return;
  }
  next();
};
const requireAdmin = (req, res, next) => {
  // Only lecturers with is_admin flag are considered admins
  if (!req.user) {
    res.status(403).send({ error: 'access denied: user not authenticated' });
    return;
  }
  
  if (!req.user.userType) {
    res.status(403).send({ error: 'access denied: userType not set' });
    return;
  }
  
  if (req.user.userType !== 'lecturer') {
    res.status(403).send({ error: 'access denied: user is not a lecturer' });
    return;
  }
  
  // Handle boolean conversion (MySQL might return 0/1 instead of true/false)
  const isAdmin = req.user.is_admin === true || req.user.is_admin === 1 || req.user.is_admin === '1';
  
  if (!isAdmin) {
    res.status(403).send({ 
      error: 'access denied: user is not an admin',
      debug: { 
        userType: req.user.userType, 
        is_admin: req.user.is_admin,
        is_admin_type: typeof req.user.is_admin,
        isAdmin_check: isAdmin,
        lecturer_id: req.user.lecturer_id || req.user.id
      }
    });
    return;
  }
  
  next();
};

module.exports = {
  ReqLogger,
  requireAdminOrUser,
  requireAdmin,
};
