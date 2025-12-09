const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface) => {
    const hashpass = bcrypt.hashSync('password123', bcrypt.genSaltSync());
    
    await queryInterface.bulkInsert('Lecturers', [
      {
        lecturer_id: 1,
        lecturer_name: 'Dr. Admin User',
        lecturer_email: 'admin@university.edu',
        lecturer_password: hashpass,
        lecturer_image: null,
        is_admin: true,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        lecturer_id: 2,
        lecturer_name: 'Prof. John Smith',
        lecturer_email: 'john.smith@university.edu',
        lecturer_password: hashpass,
        lecturer_image: null,
        is_admin: false,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        lecturer_id: 3,
        lecturer_name: 'Dr. Sarah Johnson',
        lecturer_email: 'sarah.johnson@university.edu',
        lecturer_password: hashpass,
        lecturer_image: null,
        is_admin: false,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        lecturer_id: 4,
        lecturer_name: 'Prof. Michael Chen',
        lecturer_email: 'michael.chen@university.edu',
        lecturer_password: hashpass,
        lecturer_image: null,
        is_admin: false,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        lecturer_id: 5,
        lecturer_name: 'Dr. Emily Davis',
        lecturer_email: 'emily.davis@university.edu',
        lecturer_password: hashpass,
        lecturer_image: null,
        is_admin: false,
        campus_id: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Lecturers', null, {});
  },
};

