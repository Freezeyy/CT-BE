module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Notifications', [
      {
        noti_id: 1,
        noti_type: 'application_submitted',
        noti_title: 'New Credit Transfer Application',
        noti_message: 'A new credit transfer application was submitted and is ready for your review.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        noti_id: 2,
        noti_type: 'sme_assigned',
        noti_title: 'SME Assignment',
        noti_message: 'You have a new SME credit transfer evaluation task. Due date: 2025-12-20.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        noti_id: 3,
        noti_type: 'application_approved',
        noti_title: 'Application Approved',
        noti_message: 'Your credit transfer application has been approved',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        noti_id: 4,
        noti_type: 'appointment_scheduled',
        noti_title: 'Appointment Scheduled',
        noti_message: 'A new credit transfer consultation appointment was booked. Scheduled: 2024-12-15 10:00.',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Notifications', null, {});
  },
};

