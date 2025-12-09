module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('Notifications', [
      {
        noti_id: 1,
        noti_type: 'application_submitted',
        noti_title: 'New Credit Transfer Application',
        noti_message: 'A new credit transfer application has been submitted by Alice Tan',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        noti_id: 2,
        noti_type: 'sme_assigned',
        noti_title: 'SME Assignment',
        noti_message: 'You have been assigned to review Data Structures application',
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
        noti_message: 'Your appointment with the coordinator has been scheduled for December 15, 2024',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Notifications', null, {});
  },
};

