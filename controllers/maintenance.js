const { exec } = require('child_process');
const path = require('path');

// WARNING: This endpoint is intended for development / test environments only.
// It resets the database by running:
//   npx sequelize-cli db:migrate:undo:all && npx sequelize-cli db:migrate && npx sequelize-cli db:seed:all
//
// Safeguards:
// - Disabled when NODE_ENV === 'production'
// - Optional shared secret via DB_RESET_TOKEN, sent as x-reset-token header
async function cleanDatabase(req, res) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Database reset is not allowed in production.' });
    }

    const requiredToken = process.env.DB_RESET_TOKEN;
    const incomingToken = req.headers['x-reset-token'];

    if (requiredToken && incomingToken !== requiredToken) {
      return res.status(403).json({ error: 'Invalid or missing reset token.' });
    }

    const backendDir = path.join(__dirname, '..');
    const command =
      'npx sequelize-cli db:migrate:undo:all && ' +
      'npx sequelize-cli db:migrate && ' +
      'npx sequelize-cli db:seed:all';

    exec(command, { cwd: backendDir }, (error, stdout, stderr) => {
      if (error) {
        console.error('Clean database error:', error, stderr);
        return res.status(500).json({
          error: 'Database reset failed.',
          details: stderr || error.message,
        });
      }

      return res.json({
        message: 'Database reset completed successfully.',
        output: stdout,
      });
    });
  } catch (error) {
    console.error('Clean database handler error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  cleanDatabase,
};

