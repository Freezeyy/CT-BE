# Credit Transfer System - ERD Diagram

```mermaid
erDiagram
    %% Core User Tables
    Student ||--o{ CreditTransferApplication : submits
    Student }o--|| Campus : belongs_to
    Student }o--|| Program : enrolled_in
    Student }o--o| StudentOldCampus : from
    
    Lecturer ||--o{ Coordinator : can_be
    Lecturer ||--o{ SubjectMethodExpert : can_be
    Lecturer ||--o{ HeadOfSection : can_be
    Lecturer }o--|| Campus : belongs_to
    
    %% Program Structure
    Program ||--o{ Course : contains
    Program ||--o{ Coordinator : has
    Program ||--o{ Student : has
    Program ||--o{ CreditTransferApplication : receives
    Program ||--o{ Template3 : maps_to
    Program }o--|| Campus : belongs_to
    
    Course ||--o{ SubjectMethodExpert : has_expert
    Course ||--o{ Template3 : mapped_in
    
    %% Credit Transfer Application Flow
    CreditTransferApplication ||--o{ NewApplicationSubject : contains
    CreditTransferApplication ||--o{ SMEAssignment : generates
    CreditTransferApplication }o--|| Coordinator : reviewed_by
    CreditTransferApplication }o--|| Student : submitted_by
    CreditTransferApplication }o--|| Program : for_program
    
    NewApplicationSubject ||--o{ PastApplicationSubject : has_past
    NewApplicationSubject ||--o{ SMEAssignment : reviewed_in
    NewApplicationSubject ||--o{ PastSyllabusApproval : has_approval
    
    PastApplicationSubject }o--o| Template3 : matched_to
    PastApplicationSubject ||--o{ PastSyllabusApproval : has_approval
    PastApplicationSubject }o--|| NewApplicationSubject : belongs_to
    
    %% Template 3 (Pre-approved Mappings)
    Template3 }o--|| StudentOldCampus : from_institution
    Template3 }o--|| Program : to_program
    Template3 }o--|| Course : maps_to_course
    Template3 }o--o| Template3 : replaced_by
    
    %% Staff Roles
    Coordinator ||--o{ CreditTransferApplication : reviews
    Coordinator ||--o{ Appointment : has
    Coordinator }o--|| Program : coordinates
    Coordinator }o--|| Lecturer : is
    
    SubjectMethodExpert ||--o{ SMEAssignment : assigned_to
    SubjectMethodExpert }o--|| Course : expert_for
    SubjectMethodExpert }o--|| Lecturer : is
    
    HeadOfSection }o--|| Lecturer : is
    
    %% SME Review Process
    SMEAssignment }o--|| SubjectMethodExpert : assigned_to
    SMEAssignment }o--|| CreditTransferApplication : for_application
    SMEAssignment }o--|| NewApplicationSubject : for_subject
    SMEAssignment }o--|| PastApplicationSubject : reviews
    SMEAssignment }o--|| StudentOldCampus : from_campus
    
    %% Appointments
    Appointment }o--|| Coordinator : with
    Appointment }o--|| Student : for
    
    %% Notifications
    Notification ||--o{ CreditTransferApplication : related_to
    
    %% Entity Definitions
    Student {
        int student_id PK
        string student_name
        string student_email
        string student_password
        string student_phone
        int program_id FK
        int campus_id FK
        int old_campus_id FK
    }
    
    Lecturer {
        int lecturer_id PK
        string lecturer_name
        string lecturer_email
        string lecturer_password
        string lecturer_image
        int campus_id FK
        boolean is_admin
    }
    
    Campus {
        int campus_id PK
        string campus_name
    }
    
    StudentOldCampus {
        int old_campus_id PK
        string old_campus_name
    }
    
    Program {
        int program_id PK
        string program_name
        string program_code
        text program_structure
        int campus_id FK
    }
    
    Course {
        int course_id PK
        string course_name
        string course_code
        int course_credit
        int program_id FK
        int campus_id FK
    }
    
    CreditTransferApplication {
        int ct_id PK
        string ct_status
        text ct_notes
        string prev_campus_name
        string prev_programme_name
        string transcript_path
        int student_id FK
        int coordinator_id FK
        int program_id FK
    }
    
    NewApplicationSubject {
        int application_subject_id PK
        string application_subject_name
        int ct_id FK
    }
    
    PastApplicationSubject {
        int pastSubject_id PK
        string pastSubject_code
        string pastSubject_name
        string pastSubject_grade
        text pastSubject_syllabus_path
        string original_filename
        string approval_status
        int template3_id FK
        int similarity_percentage
        boolean needs_sme_review
        text sme_review_notes
        text coordinator_notes
        int application_subject_id FK
    }
    
    Template3 {
        int template3_id PK
        int old_campus_id FK
        string old_programme_name
        int program_id FK
        int course_id FK
        string old_subject_code
        string old_subject_name
        int old_subject_credit
        string new_subject_code
        string new_subject_name
        int new_subject_credit
        int similarity_percentage
        text template3_pdf_path
        boolean is_active
        int replaced_by_template3_id FK
        string intake_year
    }
    
    Coordinator {
        int coordinator_id PK
        int lecturer_id FK
        int program_id FK
        int appointment_id FK
        date start_date
        date end_date
    }
    
    SubjectMethodExpert {
        int sme_id PK
        int lecturer_id FK
        int course_id FK
        int application_id FK
        date start_date
        date end_date
    }
    
    HeadOfSection {
        int hos_id PK
        int lecturer_id FK
        date start_date
        date end_date
    }
    
    SMEAssignment {
        int assignment_id PK
        int sme_id FK
        int application_id FK
        int application_subject_id FK
        int pastSubject_id FK
        int old_campus_id FK
    }
    
    PastSyllabusApproval {
        int psa_id PK
        int old_campus_id FK
        int ct_id FK
        int pastSubject_id FK
        int application_subject_id FK
    }
    
    Appointment {
        int appointment_id PK
        string appointment_status
        text appointment_notes
        datetime appointment_start
        datetime appointment_end
        int student_id FK
        int coordinator_id FK
    }
    
    Notification {
        int noti_id PK
        string noti_type
        string noti_title
        string noti_message
    }
```

## Key Relationships Explained

### Template 3 Flow:
1. **Template3** stores pre-approved mappings from old institution programs to new institution courses
2. **PastApplicationSubject** can be matched to **Template3** (auto-approval)
3. If no Template3 match → **PastApplicationSubject.needs_sme_review = true**
4. **SMEAssignment** created for SME review
5. **SubjectMethodExpert** reviews and updates **PastApplicationSubject**

### Approval Status Flow:
- `pending` → Initial state
- `approved_template3` → Matched to Template3, auto-approved
- `needs_sme_review` → No Template3 match, sent to SME
- `approved_sme` → SME reviewed and approved (similarity ≥80%)
- `rejected` → SME reviewed and rejected (similarity <80%)

### Cohort Tracking:
- When old institution changes subject code:
  - Old **Template3** entry: `is_active = false`
  - New **Template3** entry: `replaced_by_template3_id` points to old entry
  - **PastApplicationSubject** with new code → `needs_sme_review = true`

