# Coordinator Review Flow - Step by Step

## After Student Submits Application

1. **Student submits** → Application status: `"submitted"`
2. **Coordinator gets notification** → Sees new application in their dashboard
3. **Coordinator opens application** → Views all subjects

---

## Coordinator Review Process

### Step 1: Coordinator Views Application
**API:** `GET /api/credit-transfer/coordinator/applications`

**Response includes:**
- All applications for coordinator's program
- Each application has:
  - Student info
  - Previous institution info (`prev_campus_name`, `prev_programme_name`)
  - All subjects with approval status

**Example Response:**
```json
{
  "applications": [
    {
      "ct_id": 10,
      "ct_status": "submitted",
      "prev_campus_name": "GMI",
      "prev_programme_name": "Diploma in Software Engineering",
      "student": { ... },
      "newApplicationSubjects": [
        {
          "application_subject_name": "Discrete Mathematics",
          "pastApplicationSubjects": [
            {
              "pastSubject_id": 50,
              "pastSubject_code": "MAP2223",
              "pastSubject_name": "Discrete Mathematics",
              "approval_status": "pending",  ← Needs review
              "needs_sme_review": false
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Step 2: Coordinator Reviews Each Subject

**For each past subject, coordinator can:**

#### Option A: Check Template3 (Auto-Suggest)
**API:** `POST /api/credit-transfer/coordinator/review-subject`

**Request:**
```json
{
  "pastSubjectId": 50,
  "action": "check_template3"
}
```

**Response:**
```json
{
  "hasMatch": true,
  "template3": {
    "template3_id": 5,
    "old_subject_code": "MAP2223",
    "old_subject_name": "Discrete Mathematics",
    "new_subject_code": "IGB10403",
    "new_subject_name": "Discrete Mathematics for IT",
    "course": {
      "course_id": 2,
      "course_name": "Discrete Mathematics for IT",
      "course_code": "IGB10403"
    },
    "similarity_percentage": 80
  },
  "pastSubject": {
    "pastSubject_id": 50,
    "pastSubject_code": "MAP2223",
    "approval_status": "pending"
  }
}
```

#### Option B: Approve via Template3 (If Match Found)
**API:** `POST /api/credit-transfer/coordinator/review-subject`

**Request:**
```json
{
  "pastSubjectId": 50,
  "action": "approve_template3"
}
```

**Response:**
```json
{
  "message": "Subject approved via Template 3",
  "pastSubject": {
    "pastSubject_id": 50,
    "pastSubject_code": "MAP2223",
    "approval_status": "approved_template3",
    "template3_id": 5
  }
}
```

**What happens:**
- ✅ Subject automatically approved
- ✅ No SME review needed
- ✅ `approval_status` = `"approved_template3"`

#### Option C: Send to SME (If No Match or Code Changed)
**API:** `POST /api/credit-transfer/coordinator/review-subject`

**Request:**
```json
{
  "pastSubjectId": 51,
  "action": "send_to_sme",
  "coordinator_notes": "Subject code changed from MAP2223 to MAP2224. Same subject content."
}
```

**Response:**
```json
{
  "message": "Subject sent to SME for review",
  "smeAssignment": {
    "assignment_id": 10,
    "sme_id": 3
  },
  "pastSubject": {
    "pastSubject_id": 51,
    "pastSubject_code": "MAP2224",
    "approval_status": "needs_sme_review",
    "needs_sme_review": true
  }
}
```

**What happens:**
- ⚠️ Subject sent to SME
- ⚠️ `approval_status` = `"needs_sme_review"`
- ⚠️ `needs_sme_review` = `true`
- ⚠️ SME Assignment created
- ⚠️ SME will review and calculate similarity

---

## Complete Flow Example

### Application with 3 Subjects:

1. **Subject 1: MAP2223 (Discrete Mathematics)**
   - ✅ Matches Template3 → Auto-approved
   - Status: `approved_template3`

2. **Subject 2: MAP2224 (Discrete Mathematics)** 
   - ❌ No Template3 match (code changed)
   - ⚠️ Sent to SME
   - Status: `needs_sme_review`

3. **Subject 3: NEW123 (New Subject)**
   - ❌ No Template3 match (new subject)
   - ⚠️ Sent to SME
   - Status: `needs_sme_review`

**After Coordinator Reviews All:**
- 1 subject auto-approved ✅
- 2 subjects sent to SME ⚠️
- Coordinator waits for SME reviews

---

## Template3 Management

### Upload Template3 PDF
**API:** `POST /api/template3/upload-pdf`

**Request:** FormData
- `template3_pdf`: PDF file

**Response:**
```json
{
  "message": "Template3 PDF uploaded successfully",
  "file_path": "/uploads/template3/template3-1234567890-987654321.pdf"
}
```

### Create Single Template3 Entry
**API:** `POST /api/template3`

**Request:**
```json
{
  "old_campus_id": 1,
  "old_programme_name": "Diploma in Software Engineering",
  "program_id": 1,
  "course_id": 2,
  "old_subject_code": "MAP2223",
  "old_subject_name": "Discrete Mathematics",
  "old_subject_credit": 3,
  "new_subject_code": "IGB10403",
  "new_subject_name": "Discrete Mathematics for IT",
  "new_subject_credit": 3,
  "similarity_percentage": 80,
  "template3_pdf_path": "/uploads/template3/template3-1234567890-987654321.pdf",
  "intake_year": "2021-2023"
}
```

### Bulk Create Template3 Entries (JSON)
**API:** `POST /api/template3/bulk`

**Request:**
```json
{
  "old_campus_id": 1,
  "old_programme_name": "Diploma in Software Engineering",
  "program_id": 1,
  "intake_year": "2021-2023",
  "template3_pdf_path": "/uploads/template3/gmi-bse-2021-2023.pdf",
  "mappings": [
    {
      "course_id": 2,
      "old_subject_code": "MAP2223",
      "old_subject_name": "Discrete Mathematics",
      "old_subject_credit": 3,
      "new_subject_code": "IGB10403",
      "new_subject_name": "Discrete Mathematics for IT",
      "new_subject_credit": 3,
      "similarity_percentage": 80
    },
    {
      "course_id": 5,
      "old_subject_code": "CIT0513",
      "old_subject_name": "Computer & Programming",
      "old_subject_credit": 3,
      "new_subject_code": "ISB10103",
      "new_subject_name": "Principles of Computer Programming",
      "new_subject_credit": 3,
      "similarity_percentage": 85
    }
  ]
}
```

**Response:**
```json
{
  "message": "Created 2 Template3 entries",
  "created": 2,
  "errors": 0,
  "template3s": [ ... ]
}
```

### Get Template3 Mappings
**API:** `GET /api/template3?old_campus_id=1&old_programme_name=Diploma in Software Engineering&program_id=1`

**Response:**
```json
{
  "template3s": [
    {
      "template3_id": 5,
      "old_campus_id": 1,
      "old_programme_name": "Diploma in Software Engineering",
      "program_id": 1,
      "old_subject_code": "MAP2223",
      "new_subject_code": "IGB10403",
      "is_active": true,
      "oldCampus": { ... },
      "program": { ... },
      "course": { ... }
    }
  ]
}
```

---

## Next Steps (After Coordinator Review)

1. **Subjects approved via Template3** → ✅ Done, no further action
2. **Subjects sent to SME** → ⚠️ Wait for SME review
3. **After all subjects reviewed** → Coordinator can finalize application

---

## Summary

**Coordinator Workflow:**
1. View applications → `GET /api/credit-transfer/coordinator/applications`
2. For each subject:
   - Check Template3 → `POST /api/credit-transfer/coordinator/review-subject` (action: `check_template3`)
   - Approve if match → `POST /api/credit-transfer/coordinator/review-subject` (action: `approve_template3`)
   - Send to SME if no match → `POST /api/credit-transfer/coordinator/review-subject` (action: `send_to_sme`)
3. Wait for SME reviews (if any)
4. Finalize application

**Template3 Management:**
- Upload PDF → `POST /api/template3/upload-pdf`
- Create entries → `POST /api/template3` (single) or `POST /api/template3/bulk` (multiple)
- View entries → `GET /api/template3`

