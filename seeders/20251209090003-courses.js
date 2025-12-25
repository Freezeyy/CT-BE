module.exports = {
  up: async (queryInterface) => {
    // Insert courses without program_id (many-to-many relationship)
    await queryInterface.bulkInsert('Courses', [
      // BSE Courses
      {
        course_id: 1,
        course_name: 'Data Structures',
        course_code: 'CS201',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        course_id: 2,
        course_name: 'Discrete Mathematics',
        course_code: 'MATH201',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        course_id: 3,
        course_name: 'Object-Oriented Programming',
        course_code: 'CS202',
        course_credit: 4,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        course_id: 4,
        course_name: 'Database Systems',
        course_code: 'CS301',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        course_id: 5,
        course_name: 'Software Engineering',
        course_code: 'CS401',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // BCRM Courses
      {
        course_id: 6,
        course_name: 'Computer Networks',
        course_code: 'CS203',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        course_id: 7,
        course_name: 'Operating Systems',
        course_code: 'CS302',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // BIMD Courses
      {
        course_id: 8,
        course_name: 'Information Systems',
        course_code: 'IS201',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        course_id: 9,
        course_name: 'Business Analytics',
        course_code: 'IS301',
        course_credit: 3,
        campus_id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });

    // Insert program-course associations in junction table
    await queryInterface.bulkInsert('ProgramCourses', [
      // BSE Courses (program_id: 1)
      { program_id: 1, course_id: 1, createdAt: new Date(), updatedAt: new Date() },
      { program_id: 1, course_id: 2, createdAt: new Date(), updatedAt: new Date() },
      { program_id: 1, course_id: 3, createdAt: new Date(), updatedAt: new Date() },
      { program_id: 1, course_id: 4, createdAt: new Date(), updatedAt: new Date() },
      { program_id: 1, course_id: 5, createdAt: new Date(), updatedAt: new Date() },
      // BCRM Courses (program_id: 2)
      { program_id: 2, course_id: 6, createdAt: new Date(), updatedAt: new Date() },
      { program_id: 2, course_id: 7, createdAt: new Date(), updatedAt: new Date() },
      // BIMD Courses (program_id: 3)
      { program_id: 3, course_id: 8, createdAt: new Date(), updatedAt: new Date() },
      { program_id: 3, course_id: 9, createdAt: new Date(), updatedAt: new Date() },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('ProgramCourses', null, {});
    await queryInterface.bulkDelete('Courses', null, {});
  },
};

