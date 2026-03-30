module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const uniTypes = [
      { uni_type_code: 'IPTA', uni_type_name: 'Universiti Awam' },
      { uni_type_code: 'IPTS', uni_type_name: 'Universiti Swasta' },
      { uni_type_code: 'POLY', uni_type_name: 'Politeknik' },
      { uni_type_code: 'TVET', uni_type_name: 'Institut Kemahiran / TVET' },
    ].map((t) => ({
      ...t,
      is_active: true,
      createdAt: now,
      updatedAt: now,
    }));

    await queryInterface.bulkInsert('UniTypes', uniTypes, { ignoreDuplicates: true });

    // Ensure active + correct name even if already existed
    for (const t of uniTypes) {
      await queryInterface.bulkUpdate(
        'UniTypes',
        { uni_type_name: t.uni_type_name, is_active: true, updatedAt: now },
        { uni_type_code: t.uni_type_code }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('UniTypes', null, {});
  },
};

