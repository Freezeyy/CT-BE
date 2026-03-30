module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const campuses = [
      // ===== IPTA (single campus) =====
      { institution_name: 'Universiti Malaya', old_campus_name: 'Universiti Malaya (UM)' },
      { institution_name: 'Universiti Kebangsaan Malaysia', old_campus_name: 'UKM Bangi' },
      { institution_name: 'Universiti Teknologi Malaysia', old_campus_name: 'UTM Johor Bahru' },
      { institution_name: 'Universiti Sains Malaysia', old_campus_name: 'USM Penang' },

      // ===== IIUM (multiple campus) =====
      { institution_name: 'International Islamic University Malaysia', old_campus_name: 'IIUM Gombak' },
      { institution_name: 'International Islamic University Malaysia', old_campus_name: 'IIUM Kuantan' },
      { institution_name: 'International Islamic University Malaysia', old_campus_name: 'IIUM Pagoh' },

      // ===== UniKL (multiple campus) =====
      { institution_name: 'Universiti Kuala Lumpur', old_campus_name: 'UniKL MIIT' },
      { institution_name: 'Universiti Kuala Lumpur', old_campus_name: 'UniKL BMI' },
      { institution_name: 'Universiti Kuala Lumpur', old_campus_name: 'UniKL MIDI' },
      { institution_name: 'Universiti Kuala Lumpur', old_campus_name: 'UniKL MFI' },

      // ===== IPTS (single campus) =====
      { institution_name: 'Multimedia University', old_campus_name: 'MMU Cyberjaya' },
      { institution_name: 'Universiti Tenaga Nasional', old_campus_name: 'UNITEN Kajang' },

      // ===== TVET =====
      { institution_name: 'German-Malaysian Institute', old_campus_name: 'German-Malaysian Institute (GMI Kajang)' },

      // ===== POLY =====
      { institution_name: 'Politeknik Ungku Omar', old_campus_name: 'Politeknik Ungku Omar (PUO)' },
    ];

    const rows = [];
    for (const c of campuses) {
      const institution_id = await queryInterface.rawSelect('Institutions', {
        where: { institution_name: c.institution_name },
      }, ['institution_id']);

      if (!institution_id) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping StudentOldCampus seed; Institution not found: ${c.institution_name}`);
        continue;
      }

      rows.push({
        old_campus_name: c.old_campus_name,
        institution_id,
        is_active: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await queryInterface.bulkInsert('StudentOldCampuses', rows, { ignoreDuplicates: true });

    // Ensure institution_id/is_active are set even if rows already existed.
    for (const r of rows) {
      await queryInterface.bulkUpdate(
        'StudentOldCampuses',
        { institution_id: r.institution_id, is_active: true, updatedAt: now },
        { old_campus_name: r.old_campus_name }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('StudentOldCampuses', null, {});
  },
};

