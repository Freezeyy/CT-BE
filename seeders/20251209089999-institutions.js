module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const institutions = [
      { institution_name: 'Universiti Malaya', uni_type_code: 'IPTA' },
      { institution_name: 'Universiti Kebangsaan Malaysia', uni_type_code: 'IPTA' },
      { institution_name: 'Universiti Teknologi Malaysia', uni_type_code: 'IPTA' },
      { institution_name: 'Universiti Sains Malaysia', uni_type_code: 'IPTA' },

      { institution_name: 'Universiti Kuala Lumpur', uni_type_code: 'IPTS' },
      { institution_name: 'Multimedia University', uni_type_code: 'IPTS' },
      { institution_name: 'Universiti Tenaga Nasional', uni_type_code: 'IPTS' },

      { institution_name: 'International Islamic University Malaysia', uni_type_code: 'IPTA' },

      { institution_name: 'German-Malaysian Institute', uni_type_code: 'TVET' },

      { institution_name: 'Politeknik Ungku Omar', uni_type_code: 'POLY' },
    ];

    const rows = [];
    for (const inst of institutions) {
      const uni_type_id = await queryInterface.rawSelect('UniTypes', {
        where: { uni_type_code: inst.uni_type_code },
      }, ['uni_type_id']);

      if (!uni_type_id) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping institution seed; UniType not found for code: ${inst.uni_type_code}`);
        continue;
      }

      rows.push({
        institution_name: inst.institution_name,
        uni_type_id,
        is_active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await queryInterface.bulkInsert('Institutions', rows, { ignoreDuplicates: true });

    // Ensure correct uni_type_id + active even if already existed
    for (const r of rows) {
      await queryInterface.bulkUpdate(
        'Institutions',
        { uni_type_id: r.uni_type_id, is_active: true, updatedAt: now },
        { institution_name: r.institution_name }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Institutions', null, {});
  },
};

