const models = require('../models');
const { Op, Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Get database dialect for case-insensitive search
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];
const isPostgres = config.dialect === 'postgres';

// Get Template3 mappings (for coordinator to view/search)
async function getTemplate3Mappings(req, res) {
  try {
    const lecturerId = req.user.id;
    const { 
      old_campus_id, 
      old_campus_name, 
      old_programme_name, 
      program_id,
      program_name,
      program_code 
    } = req.query;

    // If coordinator, get their program_id
    let coordinatorProgramId = null;
    if (req.user.userType === 'lecturer') {
      const coordinator = await models.Coordinator.findOne({
        where: { lecturer_id: lecturerId, end_date: null },
      });
      if (coordinator) {
        coordinatorProgramId = coordinator.program_id;
      }
    }

    // Build where clause for Template3
    const whereConditions = [];
    
    if (old_campus_id) {
      whereConditions.push({ old_campus_id });
    }
    
    if (old_programme_name) {
      if (isPostgres) {
        whereConditions.push({
          old_programme_name: { [Op.iLike]: `%${old_programme_name}%` },
        });
      } else {
        // MySQL/MariaDB: use Sequelize.where with column name (no table prefix needed in where clause)
        whereConditions.push(
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('old_programme_name')),
            { [Op.like]: `%${old_programme_name.toLowerCase()}%` }
          )
        );
      }
    }
    
    // Handle program_id - if provided, use it; otherwise use coordinator's program if available
    if (program_id) {
      whereConditions.push({ program_id });
    } else if (coordinatorProgramId && !program_name && !program_code) {
      // Only default to coordinator's program if no program name/code filter is provided
      whereConditions.push({ program_id: coordinatorProgramId });
    }
    
    // Build final where clause
    const whereClause = whereConditions.length > 0 
      ? (whereConditions.length === 1 ? whereConditions[0] : { [Op.and]: whereConditions })
      : {};

    // Build include clauses with where conditions for related models
    // For MySQL, use Sequelize.where with column name (Sequelize handles table context in includes)
    const oldCampusWhere = old_campus_name ? (
      isPostgres 
        ? { old_campus_name: { [Op.iLike]: `%${old_campus_name}%` } }
        : Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('old_campus_name')),
            { [Op.like]: `%${old_campus_name.toLowerCase()}%` }
          )
    ) : undefined;

    const programWhereConditions = [];
    if (program_name) {
      if (isPostgres) {
        programWhereConditions.push({ program_name: { [Op.iLike]: `%${program_name}%` } });
      } else {
        programWhereConditions.push(
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('program_name')),
            { [Op.like]: `%${program_name.toLowerCase()}%` }
          )
        );
      }
    }
    if (program_code) {
      if (isPostgres) {
        programWhereConditions.push({ program_code: { [Op.iLike]: `%${program_code}%` } });
      } else {
        programWhereConditions.push(
          Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('program_code')),
            { [Op.like]: `%${program_code.toLowerCase()}%` }
          )
        );
      }
    }
    const programWhere = programWhereConditions.length > 0 
      ? (programWhereConditions.length === 1 ? programWhereConditions[0] : { [Op.and]: programWhereConditions })
      : undefined;
    const hasProgramFilter = program_name || program_code;

    const includeClauses = [
      {
        model: models.StudentOldCampus,
        as: 'oldCampus',
        attributes: ['old_campus_id', 'old_campus_name'],
        required: !!old_campus_name, // INNER JOIN if filtering by name, LEFT JOIN otherwise
        ...(oldCampusWhere && { where: oldCampusWhere }),
      },
      {
        model: models.Program,
        as: 'program',
        attributes: ['program_id', 'program_name', 'program_code'],
        required: hasProgramFilter, // INNER JOIN if filtering by name/code, LEFT JOIN otherwise
        ...(hasProgramFilter && { where: programWhere }),
      },
      {
        model: models.Course,
        as: 'course',
        attributes: ['course_id', 'course_name', 'course_code'],
        required: false,
      },
    ];

    const template3s = await models.Template3.findAll({
      where: whereClause,
      include: includeClauses,
      order: [['old_subject_code', 'ASC']],
    });

    res.json({ template3s });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Upload Template3 PDF
async function uploadTemplate3PDF(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can upload Template3 PDFs' });
    }

    // Get uploaded file
    const uploadedFile = (req.files || []).find(file => file.fieldname === 'template3_pdf');
    if (!uploadedFile) {
      return res.status(400).json({ error: 'Template3 PDF file is required' });
    }

    // Validate file type (PDF only)
    if (uploadedFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    // Save file
    const uploadPath = 'uploads/template3';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `template3-${uniqueSuffix}${path.extname(uploadedFile.originalname)}`;
    const filePath = path.join(uploadPath, filename);

    fs.writeFileSync(filePath, uploadedFile.buffer);
    const dbFilePath = `/uploads/template3/${filename}`;

    res.json({
      message: 'Template3 PDF uploaded successfully',
      file_path: dbFilePath,
    });
  } catch (error) {
    console.error('Upload Template3 PDF error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Create single Template3 entry
async function createTemplate3Entry(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can create Template3 entries' });
    }

    const {
      old_campus_id,
      old_programme_name,
      program_id,
      course_id,
      old_subject_code,
      old_subject_name,
      old_subject_credit,
      // new_subject_code, new_subject_name, new_subject_credit are now optional
      // They will be fetched from the course if not provided
      new_subject_code,
      new_subject_name,
      new_subject_credit,
      similarity_percentage,
      template3_pdf_path,
      intake_year,
    } = req.body;

    // Validate required fields
    if (!old_campus_id || !old_programme_name || !program_id || !course_id || !old_subject_code || !old_subject_name) {
      return res.status(400).json({ error: 'Missing required fields: old_campus_id, old_programme_name, program_id, course_id, old_subject_code, old_subject_name' });
    }

    // Fetch course details to get new_subject information
    const course = await models.Course.findByPk(course_id);
    if (!course) {
      return res.status(404).json({ error: `Course with course_id ${course_id} not found` });
    }

    // Check for duplicate Template3 entry
    // A unique Template3 is defined by: old_campus_id + old_programme_name + program_id + course_id + old_subject_code
    const existingTemplate3 = await models.Template3.findOne({
      where: {
        old_campus_id,
        old_programme_name,
        program_id,
        course_id,
        old_subject_code,
        is_active: true,
      },
    });

    if (existingTemplate3) {
      return res.status(409).json({ 
        error: 'Template3 entry already exists for this combination',
        existing: {
          template3_id: existingTemplate3.template3_id,
          old_subject_code: existingTemplate3.old_subject_code,
          new_subject_code: existingTemplate3.new_subject_code,
        },
      });
    }

    // Use course details for new_subject fields (override with provided values if any)
    const newSubjectCode = new_subject_code || course.course_code;
    const newSubjectName = new_subject_name || course.course_name;
    const newSubjectCredit = new_subject_credit || course.course_credit;

    const template3 = await models.Template3.create({
      old_campus_id,
      old_programme_name,
      program_id,
      course_id,
      old_subject_code,
      old_subject_name,
      old_subject_credit: old_subject_credit || null,
      new_subject_code: newSubjectCode,
      new_subject_name: newSubjectName,
      new_subject_credit: newSubjectCredit,
      similarity_percentage: similarity_percentage || 80,
      template3_pdf_path: template3_pdf_path || null,
      is_active: true,
      intake_year: intake_year || null,
    });

    res.status(201).json({
      message: 'Template3 entry created successfully',
      template3,
    });
  } catch (error) {
    console.error('Create Template3 error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Bulk create Template3 entries from JSON
async function bulkCreateTemplate3(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can create Template3 entries' });
    }

    const {
      old_campus_id,
      old_programme_name,
      program_id,
      intake_year,
      template3_pdf_path,
      mappings,
    } = req.body;

    // Validate required fields
    if (!old_campus_id || !old_programme_name || !program_id || !mappings || !Array.isArray(mappings)) {
      return res.status(400).json({ error: 'Missing required fields: old_campus_id, old_programme_name, program_id, and mappings array are required' });
    }

    const created = [];
    const errors = [];

    for (const mapping of mappings) {
      try {
        const {
          course_id,
          old_subject_code,
          old_subject_name,
          old_subject_credit,
          // new_subject_code, new_subject_name, new_subject_credit are now optional
          // They will be fetched from the course if not provided
          new_subject_code,
          new_subject_name,
          new_subject_credit,
          similarity_percentage,
        } = mapping;

        if (!course_id || !old_subject_code || !old_subject_name) {
          errors.push({
            mapping,
            error: 'Missing required fields: course_id, old_subject_code, old_subject_name',
          });
          continue;
        }

        // Fetch course details to get new_subject information
        const course = await models.Course.findByPk(course_id);
        if (!course) {
          errors.push({
            mapping,
            error: `Course with course_id ${course_id} not found`,
          });
          continue;
        }

        // Check for duplicate Template3 entry
        const existingTemplate3 = await models.Template3.findOne({
          where: {
            old_campus_id,
            old_programme_name,
            program_id,
            course_id,
            old_subject_code,
            is_active: true,
          },
        });

        if (existingTemplate3) {
          errors.push({
            mapping,
            error: `Template3 entry already exists for old_subject_code: ${old_subject_code} mapping to course_id: ${course_id}`,
          });
          continue;
        }

        // Use course details for new_subject fields (override with provided values if any)
        const newSubjectCode = new_subject_code || course.course_code;
        const newSubjectName = new_subject_name || course.course_name;
        const newSubjectCredit = new_subject_credit || course.course_credit;

        const template3 = await models.Template3.create({
          old_campus_id,
          old_programme_name,
          program_id,
          course_id,
          old_subject_code,
          old_subject_name,
          old_subject_credit: old_subject_credit || null,
          new_subject_code: newSubjectCode,
          new_subject_name: newSubjectName,
          new_subject_credit: newSubjectCredit,
          similarity_percentage: similarity_percentage || 80,
          template3_pdf_path: template3_pdf_path || null,
          is_active: true,
          intake_year: intake_year || null,
        });

        created.push(template3);
      } catch (error) {
        errors.push({
          mapping,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      message: `Created ${created.length} Template3 entries`,
      created: created.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
      template3s: created,
    });
  } catch (error) {
    console.error('Bulk create Template3 error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Update Template3 entry (e.g., mark as inactive for cohort)
async function updateTemplate3Entry(req, res) {
  try {
    const lecturerId = req.user.id;
    if (!lecturerId || req.user.userType !== 'lecturer') {
      return res.status(403).json({ error: 'Only lecturers can update Template3 entries' });
    }

    const { template3Id } = req.params;
    const updateData = req.body;

    const template3 = await models.Template3.findByPk(template3Id);
    if (!template3) {
      return res.status(404).json({ error: 'Template3 entry not found' });
    }

    await template3.update(updateData);

    res.json({
      message: 'Template3 entry updated successfully',
      template3,
    });
  } catch (error) {
    console.error('Update Template3 error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getTemplate3Mappings,
  uploadTemplate3PDF,
  createTemplate3Entry,
  bulkCreateTemplate3,
  updateTemplate3Entry,
};

