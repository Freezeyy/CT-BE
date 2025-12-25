const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const hashpass = bcrypt.hashSync('password123', bcrypt.genSaltSync());
    const hashpass2 = bcrypt.hashSync('fareez', bcrypt.genSaltSync());
    const hashpass3 = bcrypt.hashSync('qila', bcrypt.genSaltSync());
    
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
      {
        student_id: 5,
        student_name: 'Fareez',
        student_email: 'fareez@university.edu',
        student_password: hashpass2,
        student_phone: '+60149718736',
        program_id: 1, // BIMD
        campus_id: 1, // Main Campus
        old_campus_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        student_id: 6,
        student_name: 'Qila',
        student_email: 'qila@university.edu',
        student_password: hashpass3,
        student_phone: '+60149718736',
        program_id: 2, // BIMD
        campus_id: 1, // Main Campus
        old_campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Students', null, {});
  },
};

