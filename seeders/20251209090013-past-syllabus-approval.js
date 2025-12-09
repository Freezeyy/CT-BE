module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('PastSyllabusApprovals', [
      {
        psa_id: 1,
        old_campus_id: 1, // University of Technology
        ct_id: 1, // Alice Tan's application
        pastSubject_id: 1, // CS101 - Data Structures and Algorithms
        application_subject_id: 1, // Data Structures
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        psa_id: 2,
        old_campus_id: 1, // University of Technology
        ct_id: 1, // Alice Tan's application
        pastSubject_id: 2, // MATH101 - Discrete Mathematics I
        application_subject_id: 2, // Discrete Mathematics
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        psa_id: 3,
        old_campus_id: 2, // National University
        ct_id: 2, // Bob Lim's application
        pastSubject_id: 3, // CS102 - Object-Oriented Programming
        application_subject_id: 3, // Object-Oriented Programming
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('PastSyllabusApprovals', null, {});
  },
};

