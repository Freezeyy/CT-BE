module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('NewApplicationSubjects', [
      {
        application_subject_id: 1,
        application_subject_name: 'Data Structures',
        ct_id: 1, // Alice Tan's application
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        application_subject_id: 2,
        application_subject_name: 'Discrete Mathematics',
        ct_id: 1, // Alice Tan's application
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        application_subject_id: 3,
        application_subject_name: 'Object-Oriented Programming',
        ct_id: 2, // Bob Lim's application
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        application_subject_id: 4,
        application_subject_name: 'Database Systems',
        ct_id: 2, // Bob Lim's application
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        application_subject_id: 5,
        application_subject_name: 'Computer Networks',
        ct_id: 3, // Carol Wong's application
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('NewApplicationSubjects', null, {});
  },
};

