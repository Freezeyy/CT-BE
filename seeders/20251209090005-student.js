const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const hashpass = bcrypt.hashSync('password123', bcrypt.genSaltSync());
    
    await queryInterface.bulkInsert('Students', [
      {
        student_id: 1,
        student_name: 'Alice Tan',
        student_email: 'alice.tan@student.edu',
        student_password: hashpass,
        student_phone: '+60123456789',
        program_id: 1, // BSE
        campus_id: 1, // Main Campus
        old_campus_id: null, // Will be set by coordinator
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        student_id: 2,
        student_name: 'Bob Lim',
        student_email: 'bob.lim@student.edu',
        student_password: hashpass,
        student_phone: '+60123456790',
        program_id: 1, // BSE
        campus_id: 1, // Main Campus
        old_campus_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        student_id: 3,
        student_name: 'Carol Wong',
        student_email: 'carol.wong@student.edu',
        student_password: hashpass,
        student_phone: '+60123456791',
        program_id: 2, // BCRM
        campus_id: 1, // Main Campus
        old_campus_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        student_id: 4,
        student_name: 'David Lee',
        student_email: 'david.lee@student.edu',
        student_password: hashpass,
        student_phone: '+60123456792',
        program_id: 3, // BIMD
        campus_id: 1, // Main Campus
        old_campus_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Students', null, {});
  },
};

