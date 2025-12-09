module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('SMEAssignments', [
      {
        assignment_id: 1,
        sme_id: 1, // Prof. John Smith - Data Structures SME
        application_id: 1, // Alice Tan's application
        application_subject_id: 1, // Data Structures
        pastSubject_id: 1, // CS101 - Data Structures and Algorithms
        old_campus_id: 1, // University of Technology
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        assignment_id: 2,
        sme_id: 2, // Prof. John Smith - Discrete Mathematics SME
        application_id: 1, // Alice Tan's application
        application_subject_id: 2, // Discrete Mathematics
        pastSubject_id: 2, // MATH101 - Discrete Mathematics I
        old_campus_id: 1, // University of Technology
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        assignment_id: 3,
        sme_id: 3, // Dr. Sarah Johnson - OOP SME
        application_id: 2, // Bob Lim's application
        application_subject_id: 3, // Object-Oriented Programming
        pastSubject_id: 3, // CS102 - Object-Oriented Programming
        old_campus_id: 2, // National University
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        assignment_id: 4,
        sme_id: 4, // Dr. Sarah Johnson - Database Systems SME
        application_id: 2, // Bob Lim's application
        application_subject_id: 4, // Database Systems
        pastSubject_id: 4, // CS201 - Database Management Systems
        old_campus_id: 2, // National University
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('SMEAssignments', null, {});
  },
};

