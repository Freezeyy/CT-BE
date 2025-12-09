module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('StudentOldCampuses', [
      {
        old_campus_id: 1,
        old_campus_name: 'University of Technology',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        old_campus_id: 2,
        old_campus_name: 'National University',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        old_campus_id: 3,
        old_campus_name: 'International College',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        old_campus_id: 4,
        old_campus_name: 'Polytechnic Institute',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('StudentOldCampuses', null, {});
  },
};

