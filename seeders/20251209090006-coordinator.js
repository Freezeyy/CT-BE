module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Coordinators', [
      {
        coordinator_id: 1,
        lecturer_id: 2, // Prof. John Smith
        program_id: 1, // BSE
        appointment_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        coordinator_id: 2,
        lecturer_id: 3, // Dr. Sarah Johnson
        program_id: 2, // BCRM
        appointment_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        coordinator_id: 3,
        lecturer_id: 4, // Prof. Michael Chen
        program_id: 3, // BIMD
        appointment_id: null,
        start_date: new Date('2024-01-01'),
        end_date: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Coordinators', null, {});
  },
};

