module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('HeadOfSections', [
      {
        hos_id: 1,
        lecturer_id: 2, // Prof. John Smith
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        hos_id: 2,
        lecturer_id: 5, // Dr. Emily Davis
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('HeadOfSections', null, {});
  },
};

