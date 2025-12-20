# Template 3 and Cohort System Explanation

## Overview

This system implements the credit transfer workflow with Template 3 (pre-approved mappings) and Template 1 (SME review) processes.

## Database Structure

### Template3 Table
Stores pre-approved subject mappings from old institutions to new institution courses.

**Key Fields:**
- `old_campus_id`: The old institution (e.g., GMI)
- `program_id`: The program in new institution (e.g., BSE)
- `course_id`: The course in new institution that matches
- `old_subject_code`: Old institution subject code (e.g., "MAP2223")
- `old_subject_name`: Old institution subject name
- `new_subject_code`: New institution subject code (e.g., "IGB10403")
- `new_subject_name`: New institution subject name
- `similarity_percentage`: Usually 80%+ for Template3
- `template3_pdf_path`: Path to the Template3 PDF document
- `is_active`: Whether this mapping is still valid
- `replaced_by_template3_id`: If code changed, links to new Template3 entry (cohort tracking)
- `intake_year`: e.g., "2021-2023"

### PastApplicationSubject - Approval Tracking
Added fields to track approval status:
- `approval_status`: 'pending', 'approved_template3', 'approved_sme', 'rejected', 'needs_sme_review'
- `template3_id`: Reference to matched Template3 entry
- `similarity_percentage`: From SME review (if needed)
- `needs_sme_review`: Boolean flag
- `sme_review_notes`: Notes from SME
- `coordinator_notes`: Notes from coordinator

## Workflow

### 1. Student Submits Application
- Student fills in past subjects with codes, names, grades, and syllabus files
- Application status: 'submitted'

### 2. Coordinator Reviews Application
**For each past subject:**
1. **Check Template3 Match:**
   - Query Template3 table with: `old_campus_id`, `program_id`, `old_subject_code`
   - If match found AND `is_active = true`:
     - Set `approval_status = 'approved_template3'`
     - Set `template3_id = matched_template3.template3_id`
     - Set `needs_sme_review = false`
     - **No SME review needed - Direct approval**

2. **No Template3 Match (Cohort Case):**
   - Subject code changed in old institution
   - Set `approval_status = 'needs_sme_review'`
   - Set `needs_sme_review = true`
   - Coordinator can add `coordinator_notes` explaining the change
   - **Create SME Assignment** (Template 1 process)

### 3. SME Reviews (Template 1)
**For subjects needing SME review:**
1. SME receives assignment
2. SME reviews syllabus and calculates similarity
3. SME updates:
   - `similarity_percentage`: Calculated similarity (0-100)
   - `sme_review_notes`: Review notes
   - `approval_status`: 
     - If similarity >= 80%: 'approved_sme'
     - If similarity < 80%: 'rejected'

### 4. Coordinator Finalizes
- Coordinator can view all approvals/rejections
- Update application status accordingly

## Cohort Concept

A **cohort** occurs when:
- A subject code changes in the old institution (e.g., MAP2223 → MAP2224)
- The old Template3 entry becomes invalid (`is_active = false`)
- A new Template3 entry is created with `replaced_by_template3_id` pointing to the old one
- Applications with the new code need SME review (Template 1)

## API Endpoints Needed

### Coordinator Endpoints:
1. `GET /api/credit-transfer/coordinator/applications` - Already exists
2. `POST /api/credit-transfer/coordinator/review-subject` - Review a subject (check Template3 or send to SME)
3. `GET /api/template3` - Get Template3 mappings for coordinator's program
4. `POST /api/template3` - Upload/create Template3 entry (admin/coordinator)
5. `PUT /api/template3/:id` - Update Template3 (mark inactive, etc.)

### SME Endpoints:
1. `GET /api/credit-transfer/sme/assignments` - Get SME assignments
2. `POST /api/credit-transfer/sme/review-subject` - Review and approve/reject subject
3. `GET /api/credit-transfer/sme/subject/:id` - Get subject details for review

