const models = require('../models');

// Get all categories
async function getCategories(req, res) {
  try {
    const categories = await models.Category.findAll({
      attributes: ['category_id', 'category_name'],
      order: [['category_name', 'ASC']],
    });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Create a new category
async function createCategory(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can manage categories' });
    }

    const { category_name } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ error: 'category_name is required' });
    }

    // Check if category already exists
    const existingCategory = await models.Category.findOne({
      where: { category_name: category_name.trim() },
    });

    if (existingCategory) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const category = await models.Category.create({
      category_name: category_name.trim(),
    });

    res.status(201).json({
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Delete a category
async function deleteCategory(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can manage categories' });
    }

    const { categoryId } = req.params;

    // Check if category is being used by any courses
    const coursesUsingCategory = await models.Course.count({
      where: { category_id: categoryId },
    });

    if (coursesUsingCategory > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${coursesUsingCategory} course(s) are using this category. Please reassign or remove those courses first.`,
      });
    }

    const category = await models.Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await category.destroy();

    res.json({
      message: 'Category deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getCategories,
  createCategory,
  deleteCategory,
};

