module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Appointments', [
      {
        appointment_id: 1,
        appointment_status: 'scheduled',
        appointment_notes: 'Initial consultation for credit transfer',
        appointment_start: new Date('2024-12-15T10:00:00'),
        appointment_end: new Date('2024-12-15T11:00:00'),
        student_id: 1, // Alice Tan
        coordinator_id: 1, // Prof. John Smith
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        appointment_id: 2,
        appointment_status: 'completed',
        appointment_notes: 'Application review completed',
        appointment_start: new Date('2024-12-10T14:00:00'),
        appointment_end: new Date('2024-12-10T15:00:00'),
        student_id: 2, // Bob Lim
        coordinator_id: 1, // Prof. John Smith
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        appointment_id: 3,
        appointment_status: 'scheduled',
        appointment_notes: 'Follow-up meeting',
        appointment_start: new Date('2024-12-20T09:00:00'),
        appointment_end: new Date('2024-12-20T10:00:00'),
        student_id: 3, // Carol Wong
        coordinator_id: 2, // Dr. Sarah Johnson
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Appointments', null, {});
  },
};

