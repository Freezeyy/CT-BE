module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('CreditTransferApplications', [
      {
        ct_id: 1,
        ct_status: 'pending',
        ct_notes: 'Initial application submitted',
        prev_campus_name: 'University of Technology',
        student_id: 1, // Alice Tan
        coordinator_id: 1, // Prof. John Smith (BSE Coordinator)
        program_id: 1, // BSE
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ct_id: 2,
        ct_status: 'under_review',
        ct_notes: 'Application being reviewed by SME',
        prev_campus_name: 'National University',
        student_id: 2, // Bob Lim
        coordinator_id: 1, // Prof. John Smith (BSE Coordinator)
        program_id: 1, // BSE
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        ct_id: 3,
        ct_status: 'pending',
        ct_notes: 'Waiting for coordinator review',
        prev_campus_name: 'International College',
        student_id: 3, // Carol Wong
        coordinator_id: 2, // Dr. Sarah Johnson (BCRM Coordinator)
        program_id: 2, // BCRM
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('CreditTransferApplications', null, {});
  },
};

