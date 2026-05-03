const fs = require('fs');
const path = require('path');
const models = require('../models');

function safeJsonArray(val) {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getActiveCoordinator(req) {
  const lecturerId = req.user?.id;
  if (!lecturerId || req.user?.userType !== 'lecturer') return null;
  return await models.Coordinator.findOne({
    where: { lecturer_id: lecturerId, end_date: null },
    attributes: ['coordinator_id', 'program_id', 'lecturer_id'],
  });
}

// Coordinator: upload a mapping bank PDF
async function uploadMappingBank(req, res) {
  try {
    const coordinator = await getActiveCoordinator(req);
    if (!coordinator) return res.status(403).json({ error: 'Coordinator role not found' });

    const {
      mb_name,
      old_campus_id,
      intake_year = null,
      prev_program = null,
      namingConvention = null,
    } = req.body;

    if (!mb_name || !String(mb_name).trim()) {
      return res.status(400).json({ error: 'mb_name is required' });
    }
    if (!old_campus_id) {
      return res.status(400).json({ error: 'old_campus_id is required' });
    }

    const oldCampus = await models.StudentOldCampus.findByPk(old_campus_id, { attributes: ['old_campus_id'] });
    if (!oldCampus) return res.status(404).json({ error: 'StudentOldCampus not found' });

    const uploadedFile = (req.files || []).find((f) => f.fieldname === 'mapping_bank_pdf');
    if (!uploadedFile) return res.status(400).json({ error: 'mapping_bank_pdf (PDF) is required' });
    if (uploadedFile.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    const uploadPath = 'uploads/mapping-banks';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `mapping-bank-${coordinator.coordinator_id}-${uniqueSuffix}${path.extname(uploadedFile.originalname)}`;
    const filePath = path.join(uploadPath, filename);
    fs.writeFileSync(filePath, uploadedFile.buffer);

    const dbFilePath = `/uploads/mapping-banks/${filename}`;

    const created = await models.MappingBank.create({
      uploader_coordinator_id: coordinator.coordinator_id,
      mb_name: String(mb_name).trim(),
      program_id: coordinator.program_id,
      old_campus_id: parseInt(old_campus_id, 10),
      file_upload: dbFilePath,
      intake_year: intake_year ? String(intake_year).trim() : null,
      prev_program: prev_program ? String(prev_program).trim() : null,
      namingConvention: namingConvention ? String(namingConvention).trim() : null,
      visible_student_ids: JSON.stringify([]),
    });

    res.status(201).json({ mappingBank: created });
  } catch (error) {
    console.error('uploadMappingBank error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Coordinator: list only my uploaded mapping banks
async function listMyMappingBanks(req, res) {
  try {
    const coordinator = await getActiveCoordinator(req);
    if (!coordinator) return res.status(403).json({ error: 'Coordinator role not found' });

    const search = (req.query.search || '').trim().toLowerCase();

    const banks = await models.MappingBank.findAll({
      where: { uploader_coordinator_id: coordinator.coordinator_id },
      include: [
        { model: models.StudentOldCampus, as: 'oldCampus', attributes: ['old_campus_id', 'old_campus_name'], required: false },
        { model: models.Program, as: 'program', attributes: ['program_id', 'program_code', 'program_name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const filtered = !search
      ? banks
      : banks.filter((b) => {
        const hay = [
          b.mb_name,
          b.intake_year,
          b.prev_program,
          b.oldCampus?.old_campus_name,
          b.program?.program_code,
          b.program?.program_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(search);
      });

    res.json({ mappingBanks: filtered });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Coordinator: list prev_program options from my uploads (for quick re-use)
async function listMyPrevProgramOptions(req, res) {
  try {
    const coordinator = await getActiveCoordinator(req);
    if (!coordinator) return res.status(403).json({ error: 'Coordinator role not found' });

    const banks = await models.MappingBank.findAll({
      where: { uploader_coordinator_id: coordinator.coordinator_id },
      attributes: ['prev_program'],
      order: [['updatedAt', 'DESC']],
    });

    const uniq = [];
    const seen = new Set();
    for (const b of banks) {
      const v = (b.prev_program || '').trim();
      if (!v) continue;
      const k = v.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      uniq.push(v);
    }

    res.json({ options: uniq });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Coordinator: list students in my program (pagination + search + optional old campus filter)
async function listMyStudents(req, res) {
  try {
    const coordinator = await getActiveCoordinator(req);
    if (!coordinator) return res.status(403).json({ error: 'Coordinator role not found' });

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const oldCampusId = req.query.old_campus_id ? parseInt(req.query.old_campus_id, 10) : null;

    const { Op } = require('sequelize');
    const where = { program_id: coordinator.program_id };
    if (oldCampusId) where.old_campus_id = oldCampusId;
    if (search) {
      where[Op.or] = [
        { student_name: { [Op.like]: `%${search}%` } },
        { student_email: { [Op.like]: `%${search}%` } },
      ];
    }

    const total = await models.Student.count({ where });
    const students = await models.Student.findAll({
      where,
      attributes: ['student_id', 'student_name', 'student_email', 'old_campus_id'],
      include: [{ model: models.StudentOldCampus, as: 'oldCampus', attributes: ['old_campus_id', 'old_campus_name'], required: false }],
      order: [['student_name', 'ASC']],
      limit,
      offset,
    });

    res.json({
      students,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Coordinator: assign a mapping bank to students (enforce one bank per student)
async function assignMappingBankToStudents(req, res) {
  try {
    const coordinator = await getActiveCoordinator(req);
    if (!coordinator) return res.status(403).json({ error: 'Coordinator role not found' });

    const { mb_id, student_ids, select_all_old_campus_id } = req.body;
    if (!mb_id) return res.status(400).json({ error: 'mb_id is required' });

    const bank = await models.MappingBank.findOne({
      where: { mb_id, uploader_coordinator_id: coordinator.coordinator_id },
    });
    if (!bank) return res.status(404).json({ error: 'Mapping bank not found' });

    let finalStudentIds = Array.isArray(student_ids) ? student_ids : [];
    if (select_all_old_campus_id) {
      const students = await models.Student.findAll({
        where: { program_id: coordinator.program_id, old_campus_id: parseInt(select_all_old_campus_id, 10) },
        attributes: ['student_id'],
      });
      finalStudentIds = students.map((s) => s.student_id);
    }

    finalStudentIds = [...new Set(finalStudentIds.map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x)))];
    if (finalStudentIds.length === 0) return res.status(400).json({ error: 'No students selected' });

    // Ensure students belong to coordinator's program
    const allowedStudents = await models.Student.findAll({
      where: { student_id: finalStudentIds, program_id: coordinator.program_id },
      attributes: ['student_id'],
    });
    const allowedSet = new Set(allowedStudents.map((s) => s.student_id));
    finalStudentIds = finalStudentIds.filter((id) => allowedSet.has(id));
    if (finalStudentIds.length === 0) return res.status(400).json({ error: 'Selected students are not in your program' });

    // Enforce "one student can only receive one mapping bank" (application-level enforcement)
    const allBanks = await models.MappingBank.findAll({
      attributes: ['mb_id', 'visible_student_ids'],
    });
    const alreadyAssigned = new Map(); // student_id -> mb_id
    for (const b of allBanks) {
      const ids = safeJsonArray(b.visible_student_ids);
      for (const sid of ids) {
        if (!Number.isFinite(parseInt(sid, 10))) continue;
        alreadyAssigned.set(parseInt(sid, 10), b.mb_id);
      }
    }

    const conflicts = finalStudentIds.filter((sid) => alreadyAssigned.has(sid) && alreadyAssigned.get(sid) !== bank.mb_id);
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Some students already have a mapping bank assigned',
        student_ids: conflicts,
      });
    }

    const currentIds = safeJsonArray(bank.visible_student_ids).map((x) => parseInt(x, 10)).filter((x) => Number.isFinite(x));
    const merged = [...new Set([...currentIds, ...finalStudentIds])];
    await bank.update({ visible_student_ids: JSON.stringify(merged) });

    res.json({ message: 'Assigned successfully', mb_id: bank.mb_id, assigned_student_ids: merged });
  } catch (error) {
    console.error('assignMappingBankToStudents error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Coordinator: delete one of my uploaded mapping banks
async function deleteMyMappingBank(req, res) {
  try {
    const coordinator = await getActiveCoordinator(req);
    if (!coordinator) return res.status(403).json({ error: 'Coordinator role not found' });

    const mbId = parseInt(req.params.mb_id, 10);
    if (!Number.isFinite(mbId)) return res.status(400).json({ error: 'Invalid mb_id' });

    const bank = await models.MappingBank.findOne({
      where: { mb_id: mbId, uploader_coordinator_id: coordinator.coordinator_id },
      attributes: ['mb_id', 'file_upload'],
    });
    if (!bank) return res.status(404).json({ error: 'Mapping bank not found' });

    // Best-effort delete file from disk (do not fail deletion if file missing)
    try {
      const rel = String(bank.file_upload || '').replace(/^\/uploads\//, 'uploads/');
      if (rel && fs.existsSync(rel)) fs.unlinkSync(rel);
    } catch (e) {
      console.warn('deleteMyMappingBank: failed to delete file:', e?.message || e);
    }

    await bank.destroy();
    res.json({ message: 'Mapping bank deleted', mb_id: mbId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Student: browse course analysis summaries for my UniKL program (no per-student assignment required)
async function browseStudentMappingBanks(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId || req.user?.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can access this' });
    }

    const student = await models.Student.findByPk(studentId, {
      attributes: ['student_id', 'program_id', 'old_campus_id'],
    });
    if (!student || !student.program_id) {
      return res.status(400).json({ error: 'Your programme could not be determined. Contact support.' });
    }

    const search = (req.query.search || '').trim().toLowerCase();
    const matchMyCampusRaw = req.query.match_my_campus;
    const matchMyCampus =
      matchMyCampusRaw === true ||
      matchMyCampusRaw === 1 ||
      String(matchMyCampusRaw || '').toLowerCase() === 'true' ||
      String(matchMyCampusRaw || '') === '1';

    const where = { program_id: student.program_id };
    if (matchMyCampus && student.old_campus_id) {
      where.old_campus_id = student.old_campus_id;
    }

    const banks = await models.MappingBank.findAll({
      where,
      include: [
        { model: models.StudentOldCampus, as: 'oldCampus', attributes: ['old_campus_id', 'old_campus_name'], required: false },
        { model: models.Program, as: 'program', attributes: ['program_id', 'program_code', 'program_name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const filtered = !search
      ? banks
      : banks.filter((b) => {
          const hay = [
            b.mb_name,
            b.intake_year,
            b.prev_program,
            b.namingConvention,
            b.oldCampus?.old_campus_name,
            b.program?.program_code,
            b.program?.program_name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(search);
        });

    res.json({ mappingBanks: filtered });
  } catch (error) {
    console.error('browseStudentMappingBanks error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Student: get mapping bank(s) assigned to me (should be max 1 by policy)
async function getMyAssignedMappingBanks(req, res) {
  try {
    const studentId = req.user?.id;
    if (!studentId || req.user?.userType !== 'student') {
      return res.status(403).json({ error: 'Only students can access this' });
    }

    const banks = await models.MappingBank.findAll({
      include: [
        { model: models.StudentOldCampus, as: 'oldCampus', attributes: ['old_campus_id', 'old_campus_name'], required: false },
        { model: models.Program, as: 'program', attributes: ['program_id', 'program_code', 'program_name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });

    const mine = banks.filter((b) => safeJsonArray(b.visible_student_ids).map((x) => parseInt(x, 10)).includes(studentId));
    res.json({ mappingBanks: mine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  uploadMappingBank,
  listMyMappingBanks,
  listMyPrevProgramOptions,
  listMyStudents,
  assignMappingBankToStudents,
  deleteMyMappingBank,
  browseStudentMappingBanks,
  getMyAssignedMappingBanks,
};

