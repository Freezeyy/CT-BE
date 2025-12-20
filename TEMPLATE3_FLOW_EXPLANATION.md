# Template 3 and Cohort Flow - Step by Step

## What is Template 3?

**Template 3 = Pre-approved, confirmed mappings from a SPECIFIC old institution's program to new institution's program**

- **Institution-Specific**: Each old institution (GMI, etc.) has its own Template 3
- **Old Institution Program-Specific**: Each old institution program (e.g., "Diploma in Software Engineering") has its own Template 3
- **New Institution Program-Specific**: Each new institution program (BSE, BCRM, etc.) has its own Template 3
- **Confirmed/Pre-approved**: These mappings are already verified and approved
- **Valid UNLESS code changes**: Template 3 remains valid until the old institution changes the subject code (cohort case)

**Example:**
- Old Institution: GMI
- Old Institution Program: "Diploma in Software Engineering"
- New Institution Program: BSE (Bachelor of Software Engineering)
- Template 3: Maps GMI's Diploma subjects to BSE courses

## Real-World Example from Your PDF

From your Template 3 PDF (GMI → UNIKL BSE Program), here's an example mapping:
- **Old Institution (GMI)**: `MAP2223 - Discrete Mathematics` (3 credits)
- **New Institution (UNIKL)**: `IGB10403 - Discrete Mathematics for IT` (3 credits)
- **Similarity**: 80%+ (Direct Credit Transfer)
- **Status**: ✅ CONFIRMED - Students from GMI with MAP2223 will get credit for IGB10403

---

## Scenario 1: Normal Flow (Subject Matches Template 3)

### Step 1: Student Submits Application
**Student fills in:**
```
Past Subject:
- Code: MAP2223
- Name: Discrete Mathematics
- Grade: A
- Syllabus: [PDF file]
```

**Database (PastApplicationSubject):**
```json
{
  "pastSubject_code": "MAP2223",
  "pastSubject_name": "Discrete Mathematics",
  "pastSubject_grade": "A",
  "approval_status": "pending",
  "needs_sme_review": false
}
```

### Step 2: Coordinator Reviews Application
**Coordinator clicks "Review Application"**

**System automatically:**
1. Gets student's `old_campus_id` (GMI) from application
2. Gets student's `prev_programme_name` ("Diploma in Software Engineering") from application
3. Gets `program_id` (BSE) from application
4. Searches Template3 table for **GMI's Diploma in Software Engineering → BSE confirmed mappings**:
   ```sql
   SELECT * FROM Template3s 
   WHERE old_campus_id = 1 (GMI)                    ← Specific old institution
     AND old_programme_name = 'Diploma in Software Engineering'  ← Old institution's program
     AND program_id = 1 (BSE)                       ← New institution's program
     AND old_subject_code = 'MAP2223'               ← Student's subject code
     AND is_active = true                           ← Still valid (code hasn't changed)
   ```

4. **FOUND MATCH!** ✅
   - This is a **confirmed mapping** from GMI's Template 3
   - `old_subject_code = 'MAP2223'` matches the confirmed code
   - `is_active = true` means the code hasn't changed (not a cohort case)
   - This mapping was already verified and approved

**System automatically updates:**
```json
{
  "approval_status": "approved_template3",
  "template3_id": 5,  // ID of the confirmed Template3 entry
  "needs_sme_review": false,
  "coordinator_notes": "Auto-approved via Template 3 (GMI confirmed mapping)"
}
```

**Result:** ✅ **APPROVED** - No SME needed! This is a confirmed mapping from GMI's Template 3.

---

## Scenario 2: Cohort Case (Subject Code Changed)

### Step 1: Student Submits Application
**Student fills in:**
```
Past Subject:
- Code: MAP2224  ← NEW CODE (changed from MAP2223)
- Name: Discrete Mathematics
- Grade: A
- Syllabus: [PDF file]
```

**Database (PastApplicationSubject):**
```json
{
  "pastSubject_code": "MAP2224",  // New code!
  "pastSubject_name": "Discrete Mathematics",
  "pastSubject_grade": "A",
  "approval_status": "pending",
  "needs_sme_review": false
}
```

### Step 2: Coordinator Reviews Application
**Coordinator clicks "Review Application"**

**System automatically:**
1. Gets student's `old_campus_id` (GMI) from application
2. Gets student's `prev_programme_name` ("Diploma in Software Engineering") from application
3. Gets `program_id` (BSE) from application
4. Searches Template3 table for **GMI's Diploma in Software Engineering → BSE confirmed mappings**:
   ```sql
   SELECT * FROM Template3s 
   WHERE old_campus_id = 1 (GMI)
     AND old_programme_name = 'Diploma in Software Engineering'
     AND program_id = 1 (BSE)
     AND old_subject_code = 'MAP2224'  ← Looking for new code
     AND is_active = true
   ```

4. **NO MATCH FOUND!** ❌
   - GMI's Template 3 only has `MAP2223` (the confirmed/old code)
   - `MAP2224` doesn't exist in GMI's Template 3
   - **This means GMI changed the subject code** (cohort case)
   - The confirmed mapping (MAP2223) is no longer valid for this student

**System shows coordinator:**
```
⚠️ Subject code changed - Not in Template 3
   - GMI's confirmed code in Template 3: MAP2223
   - Student's code: MAP2224 (NEW CODE)
   - This is a cohort case - GMI changed the code
   - Need SME review to verify it's still the same subject
```

**Coordinator decides:**
- "GMI changed the code from MAP2223 to MAP2224"
- "This is likely the same subject (Discrete Mathematics), but we need SME to verify"
- Coordinator clicks "Send to SME for Review"

**System updates:**
```json
{
  "approval_status": "needs_sme_review",
  "needs_sme_review": true,
  "template3_id": null,  // No match
  "coordinator_notes": "Subject code changed from MAP2223 to MAP2224. Same subject content."
}
```

**System creates SME Assignment:**
```json
{
  "sme_id": 3,  // SME for Discrete Mathematics course
  "application_id": 10,
  "application_subject_id": 25,
  "pastSubject_id": 50,
  "old_campus_id": 1
}
```

### Step 3: SME Reviews (Template 1 Process)
**SME receives assignment notification**

**SME reviews:**
1. Downloads student's syllabus (MAP2224)
2. Compares with new institution's course syllabus (IGB10403)
3. Calculates similarity: **85%** ✅

**SME updates:**
```json
{
  "approval_status": "approved_sme",
  "similarity_percentage": 85,
  "sme_review_notes": "Content is 85% similar. Topics covered: Sets, Logic, Graphs. Approved for credit transfer."
}
```

**Result:** ✅ **APPROVED** - Student gets credit transfer after SME review.

### Step 4: Update Template 3 (After SME Approval)
**After SME confirms it's the same subject, Coordinator updates GMI's Template 3:**

**Create new confirmed mapping for the new code:**
```json
{
  "old_campus_id": 1,  // GMI
  "program_id": 1,     // BSE
  "course_id": 2,      // IGB10403
  "old_subject_code": "MAP2224",  // NEW confirmed code from GMI
  "old_subject_name": "Discrete Mathematics",
  "new_subject_code": "IGB10403",
  "new_subject_name": "Discrete Mathematics for IT",
  "similarity_percentage": 85,
  "is_active": true,
  "replaced_by_template3_id": 5  // Links to old MAP2223 entry (cohort tracking)
}
```

**Mark old Template3 entry as inactive (code changed):**
```json
{
  "template3_id": 5,
  "old_subject_code": "MAP2223",  // Old confirmed code
  "is_active": false,  // No longer valid - GMI changed the code
  "replaced_by_template3_id": 6  // Points to new MAP2224 entry
}
```

**Result:**
- ✅ Old mapping (MAP2223) marked as inactive
- ✅ New mapping (MAP2224) added to GMI's Template 3
- ✅ **Future students from GMI with MAP2224 will now auto-approve!**
- ✅ Cohort tracking: System knows MAP2224 replaced MAP2223

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ STUDENT SUBMITS APPLICATION                                 │
│ - Past Subject: MAP2223, Discrete Mathematics              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ COORDINATOR REVIEWS APPLICATION                             │
│ System checks Template3 table                               │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ┌─────────┐            ┌─────────┐
    │ MATCH?  │            │ NO MATCH│
    │   ✅    │            │   ❌    │
    └────┬────┘            └────┬────┘
         │                      │
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌──────────────────────┐
│ AUTO-APPROVE    │    │ SEND TO SME          │
│                 │    │ (Template 1 Process) │
│ - Set status:   │    │                      │
│   approved_     │    │ - Set status:        │
│   template3     │    │   needs_sme_review    │
│                 │    │ - Create SME         │
│ ✅ DONE         │    │   Assignment         │
└─────────────────┘    └──────┬───────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │ SME REVIEWS     │
                      │                 │
                      │ - Calculate     │
                      │   similarity    │
                      │ - If >= 80%:    │
                      │   approved_sme  │
                      │ - If < 80%:     │
                      │   rejected      │
                      │                 │
                      │ ✅ DONE         │
                      └─────────────────┘
```

---

## Database Tables at Each Step

### Template3 Table (Pre-loaded by Admin/Coordinator)
```sql
template3_id | old_campus_id | old_programme_name                    | program_id | old_subject_code | new_subject_code | is_active
-------------|---------------|---------------------------------------|------------|------------------|------------------|-----------
5            | 1 (GMI)      | Diploma in Software Engineering       | 1 (BSE)    | MAP2223          | IGB10403         | true
```

### PastApplicationSubject (After Student Submission)
```sql
pastSubject_id | pastSubject_code | approval_status | template3_id | needs_sme_review
---------------|------------------|-----------------|--------------|------------------
50             | MAP2223          | pending         | NULL         | false
```

### PastApplicationSubject (After Coordinator Review - Match Found)
```sql
pastSubject_id | pastSubject_code | approval_status    | template3_id | needs_sme_review
---------------|------------------|---------------------|--------------|------------------
50             | MAP2223          | approved_template3 | 5            | false
```

### PastApplicationSubject (After Coordinator Review - No Match)
```sql
pastSubject_id | pastSubject_code | approval_status    | template3_id | needs_sme_review
---------------|------------------|---------------------|--------------|------------------
51             | MAP2224          | needs_sme_review    | NULL         | true
```

### PastApplicationSubject (After SME Review)
```sql
pastSubject_id | pastSubject_code | approval_status | similarity_percentage | sme_review_notes
---------------|------------------|-----------------|----------------------|------------------
51             | MAP2224          | approved_sme    | 85                   | "85% similar..."
```

---

## Key Points

1. **Template 3 = Institution-Specific Confirmed Mappings**: 
   - Each old institution (GMI, etc.) has its own Template 3
   - Each program has its own Template 3 for each old institution
   - These are **pre-confirmed, pre-approved** mappings
   - Valid UNLESS the old institution changes the subject code

2. **Auto-Approval**: 
   - If student's subject code matches their old institution's Template 3 → Instant approval
   - No SME needed - it's already confirmed

3. **Cohort = Code Changed**: 
   - Old institution changed the subject code (e.g., MAP2223 → MAP2224)
   - Student's code doesn't match Template 3 anymore
   - Need SME to verify it's still the same subject → Send to SME

4. **SME Review = Template 1**: 
   - Manual review when subject code doesn't match Template 3
   - SME compares syllabi and calculates similarity
   - If ≥80% similar → Approve, If <80% → Reject

5. **Update Template 3 After Cohort**: 
   - After SME approves, coordinator adds new code to Template 3
   - Old code marked as inactive
   - Future students with new code will auto-approve

---

## What You Need to Do

1. **Load Template3 Data**: Import all Template3 PDFs into database
2. **Coordinator Review Function**: Check Template3, auto-approve or send to SME
3. **SME Review Function**: Review subjects, calculate similarity, approve/reject
4. **Template3 Management**: Upload PDFs, create/update mappings

Would you like me to implement these functions now?

