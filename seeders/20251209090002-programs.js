module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Programs', [
      {
        program_id: 1,
        program_name: 'Bachelor of Software Engineering',
        program_code: 'BSE',
        program_structure: null, // Coordinator will upload this
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        program_id: 2,
        program_name: 'Bachelor of Computer Science',
        program_code: 'BCRM',
        program_structure: null, // Coordinator will upload this
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        program_id: 3,
        program_name: 'Bachelor of Information Management',
        program_code: 'BIMD',
        program_structure: null, // Coordinator will upload this
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        program_id: 4,
        program_name: 'Bachelor of Software Engineering',
        program_code: 'BSE',
        program_structure: null, // Coordinator will upload this
        campus_id: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Programs', null, {});
  },
};

