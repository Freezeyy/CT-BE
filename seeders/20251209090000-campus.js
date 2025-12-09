module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Campuses', [
      {
        campus_id: 1,
        campus_name: 'MIIT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        campus_id: 2,
        campus_name: 'MFI',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        campus_id: 3,
        campus_name: 'MIDI',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Campuses', null, {});
  },
};

