module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('SubjectMethodExperts', [
      {
        sme_id: 1,
        lecturer_id: 2, // Prof. John Smith
        course_id: 1, // Data Structures
        application_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        sme_id: 2,
        lecturer_id: 2, // Prof. John Smith
        course_id: 2, // Discrete Mathematics
        application_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        sme_id: 3,
        lecturer_id: 3, // Dr. Sarah Johnson
        course_id: 9, // Object-Oriented Programming
        application_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        sme_id: 4,
        lecturer_id: 3, // Dr. Sarah Johnson
        course_id: 4, // Database Systems
        application_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        sme_id: 5,
        lecturer_id: 4, // Prof. Michael Chen
        course_id: 5, // Software Engineering
        application_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('SubjectMethodExperts', null, {});
  },
};

