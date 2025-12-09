module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('PastApplicationSubjects', [
      {
        pastSubject_id: 1,
        pastSubject_code: 'CS101',
        pastSubject_name: 'Data Structures and Algorithms',
        pastSubject_grade: 'A',
        pastSubject_syllabus_path: '/syllabus/cs101_data_structures.pdf',
        application_subject_id: 1, // Data Structures
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        pastSubject_id: 2,
        pastSubject_code: 'MATH101',
        pastSubject_name: 'Discrete Mathematics I',
        pastSubject_grade: 'B+',
        pastSubject_syllabus_path: '/syllabus/math101_discrete.pdf',
        application_subject_id: 2, // Discrete Mathematics
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        pastSubject_id: 3,
        pastSubject_code: 'CS102',
        pastSubject_name: 'Object-Oriented Programming',
        pastSubject_grade: 'A-',
        pastSubject_syllabus_path: '/syllabus/cs102_oop.pdf',
        application_subject_id: 3, // Object-Oriented Programming
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        pastSubject_id: 4,
        pastSubject_code: 'CS201',
        pastSubject_name: 'Database Management Systems',
        pastSubject_grade: 'B',
        pastSubject_syllabus_path: '/syllabus/cs201_database.pdf',
        application_subject_id: 4, // Database Systems
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        pastSubject_id: 5,
        pastSubject_code: 'CS103',
        pastSubject_name: 'Computer Networks',
        pastSubject_grade: 'A',
        pastSubject_syllabus_path: '/syllabus/cs103_networks.pdf',
        application_subject_id: 5, // Computer Networks
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('PastApplicationSubjects', null, {});
  },
};

