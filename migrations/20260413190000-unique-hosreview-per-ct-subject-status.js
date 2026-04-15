module.exports = {
  up: async (queryInterface) => {
    // Prevent duplicate "pending" requests even if HOS assignment changes
    await queryInterface.addConstraint('HosReviews', {
      fields: ['ct_id', 'application_subject_id', 'status'],
      type: 'unique',
      name: 'unique_hos_review_per_ct_subject_status',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('HosReviews', 'unique_hos_review_per_ct_subject_status');
  },
};

