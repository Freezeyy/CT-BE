# Frontend Migration Guide: Old Backend → New Backend

This guide explains what needs to be changed in your frontend code to work with the new backend API.

## 📋 Summary of Changes

### API Endpoint Changes
- ✅ Program structure endpoint changed
- ✅ Credit applications endpoint changed  
- ✅ Submit application endpoint changed (supports drafts!)
- ✅ Draft functionality **SUPPORTED** - can save and update drafts
- ✅ Coordinator automatically assigned based on program (no manual selection needed)
- ➕ New: Get program courses endpoint
- ❌ DELETE endpoint removed (not implemented)

---

## 🔄 Detailed Changes

### 1. **Get Program Structure**

#### ❌ OLD:
```javascript
GET /api/program-structures?program_code=${programCode}
```

#### ✅ NEW:
```javascript
GET /api/program/structure
```
- **No query parameters needed** - automatically uses student's `program_id` from their profile
- Returns: `{ program: { program_id, program_name, program_code, program_structure } }`

#### 📝 Changes Needed:
```javascript
// OLD CODE - REMOVE:
export async function getProgramStructures(programCode) {
    const res = await fetch(`${API_BASE}/program-structures?program_code=${programCode}`, {
        headers: { Authorization: "Bearer " + token },
    });
    // ...
}

// NEW CODE - REPLACE WITH:
export async function getProgramStructure() {
    const token = getToken();
    if (!token) return { success: false, data: null };
    
    const res = await fetch(`${API_BASE}/program/structure`, {
        headers: { Authorization: "Bearer " + token },
    });
    
    if (!res.ok) return { success: false, data: null };
    const result = await res.json();
    return { success: true, data: result.program || null };
}
```

#### 🎯 Component Changes:
```javascript
// REMOVE: programCode parameter from useEffect
// OLD:
useEffect(() => {
    async function load() {
        if (!course) return;
        const res = await getProgramStructures(course); // ❌ Remove course param
        // ...
    }
    load();
}, [course]);

// NEW:
useEffect(() => {
    async function load() {
        const res = await getProgramStructure(); // ✅ No parameter
        if (!res.success) return;
        const data = res.data;
        if (!data) return;
        
        setPdfPath(data.program_structure || "");
        
        // Get courses separately
        const coursesRes = await getProgramCourses();
        if (coursesRes.success) {
            setSubjects(coursesRes.data || []);
        }
    }
    load();
}, []); // ✅ Load once on mount, not when course changes
```

---

### 2. **Get My Credit Applications**

#### ❌ OLD:
```javascript
GET /api/credit-applications/mine
```

#### ✅ NEW:
```javascript
GET /api/credit-transfer/applications
```

#### 📝 Changes Needed:
```javascript
// OLD CODE - REPLACE:
export async function getMyCreditApplication() {
    const res = await fetch(`${API_BASE}/credit-applications/mine`, {
        headers: { Authorization: "Bearer " + token },
    });
    // ...
}

// NEW CODE - REPLACE WITH:
export async function getMyCreditApplication() {
    const token = getToken();
    if (!token) return { success: false, data: [] };
    
    const res = await fetch(`${API_BASE}/credit-transfer/applications`, {
        headers: { Authorization: "Bearer " + token },
    });
    
    if (!res.ok) return { success: false, data: [] };
    const result = await res.json();
    return { success: true, data: result.applications || [] };
}
```

#### 🎯 Response Structure Changes:
```javascript
// OLD response structure (example):
{
    data: [
        {
            id: 1,
            status: "draft",
            program_code: "BSE",
            subjects: [...]
        }
    ]
}

// NEW response structure:
{
    applications: [
        {
            ct_id: 1,
            ct_status: "submitted", // Note: no "draft" status
            program: {
                program_code: "BSE",
                program_name: "Bachelor of Software Engineering"
            },
            newApplicationSubjects: [
                {
                    application_subject_id: 1,
                    application_subject_name: "Data Structures",
                    pastApplicationSubjects: [
                        {
                            pastSubject_code: "CS101",
                            pastSubject_name: "Intro to CS",
                            pastSubject_grade: "A",
                            pastSubject_syllabus_path: "/uploads/syllabi/..."
                        }
                    ]
                }
            ]
        }
    ]
}
```

#### 🎯 Component Changes:
```javascript
// REMOVE: Draft loading logic (drafts not supported)
// OLD:
useEffect(() => {
    async function loadDrafts() {
        const res = await getMyCreditApplication();
        if (res.success && res.data.length > 0) {
            const drafts = res.data.filter(app => app.status === "draft"); // ❌ Remove
            // ...
        }
    }
    loadDrafts();
}, []);

// NEW: Only load submitted applications
useEffect(() => {
    async function loadApplications() {
        const res = await getMyCreditApplication();
        if (res.success && res.data.length > 0) {
            // All applications are submitted (no drafts)
            // Map to your table format if needed
        }
    }
    loadApplications();
}, []);
```

---

### 3. **Get Program Courses** (NEW - REQUIRED)

#### ✅ NEW Endpoint:
```javascript
GET /api/program/courses
```
- Returns courses for student's enrolled program
- Used to populate the "Current Subject" dropdown

#### 📝 Add This Function:
```javascript
// ADD THIS NEW FUNCTION:
export async function getProgramCourses() {
    const token = getToken();
    if (!token) return { success: false, data: [] };
    
    try {
        const res = await fetch(`${API_BASE}/program/courses`, {
            headers: { Authorization: "Bearer " + token },
        });
        
        if (!res.ok) return { success: false, data: [] };
        const result = await res.json();
        return { success: true, data: result.courses || [] };
    } catch (error) {
        console.error("Get courses error:", error);
        return { success: false, data: [] };
    }
}
```

---

### 4. **Submit Credit Transfer Application**

#### ❌ OLD:
```javascript
POST /api/credit-applications
PATCH /api/credit-applications/${draftId}/draft
```

#### ✅ NEW:
```javascript
POST /api/credit-transfer/apply
```
- **Draft support INCLUDED** - can save with `status: "draft"`
- **Update draft** - include `draftId` in body to update existing draft
- **Coordinator auto-assigned** - no need to provide `coordinatorId`
- **Files optional for drafts** - syllabus files only required when submitting

#### 📝 Changes Needed:
```javascript
// OLD CODE - REPLACE:
export async function submitCreditTransfer(formData, draftId = null, isFinalSubmit = false) {
    const url = draftId
        ? `${API_BASE}/credit-applications/${draftId}/draft`
        : `${API_BASE}/credit-applications`;
    const method = draftId ? "PATCH" : "POST";
    // ...
}

// NEW CODE - REPLACE WITH:
export async function submitCreditTransfer(formData, draftId = null, isFinalSubmit = false) {
    const token = getToken();
    if (!token) return { success: false, message: "User not authenticated" };
    
    // Add draftId to formData if updating existing draft
    if (draftId) {
        formData.append("draftId", draftId);
    }
    
    try {
        const res = await fetch(`${API_BASE}/credit-transfer/apply`, {
            method: "POST", // Always POST, even for updates
            headers: { Authorization: "Bearer " + token },
            body: formData,
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            return { success: false, message: errorData.error || "Server error" };
        }
        
        const data = await res.json();
        return { success: true, data };
    } catch (error) {
        console.error("Submit error:", error);
        return { success: false, message: error.message || "Network error" };
    }
}
```

#### 🎯 FormData Structure (UPDATED):
```javascript
// The FormData structure:
formData.append("programCode", course);
formData.append("status", isDraft ? "draft" : "submitted"); // "draft" or "submitted"
// NO coordinatorId needed - automatically assigned based on program
if (draftId) {
    formData.append("draftId", draftId); // For updating existing draft
}
formData.append("mappings", JSON.stringify(mappings));
// Add syllabus files (optional for drafts, required for submission)
```

#### 🎯 Component Changes:
```javascript
// KEEP: Draft functionality (now supported!)
// ✅ Keep draftId state
const [draftId, setDraftId] = useState(null); // ✅ Keep

// ✅ Keep handleSaveDraft function
const handleSaveDraft = async () => {
    if (!course) {
        alert("Please select a course first");
        return;
    }
    if (tableData.length === 0) {
        alert("Please add at least one mapping");
        return;
    }
    setIsSubmitting(true);
    try {
        const formData = prepareFormData(true); // isDraft = true
        const result = await submitCreditTransfer(formData, draftId, false);
        if (result.success) {
            alert("Draft saved successfully!");
            if (result.data?.application_id) {
                setDraftId(result.data.application_id);
            }
        }
    } catch (error) {
        alert("Error saving draft: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
};

// ✅ Keep "Save as Draft" button
<button onClick={handleSaveDraft}>💾 Save as Draft</button>

// UPDATE: Submit handler - remove coordinator validation
// OLD:
const handleSubmit = async () => {
    // ... validation ...
    if (!coordinatorId) { // ❌ Remove this check
        alert("Please select a coordinator first");
        return;
    }
    const formData = prepareFormData(false);
    const result = await submitCreditTransfer(formData, draftId, true);
    // ...
};

// NEW:
const handleSubmit = async () => {
    // ... validation ...
    // ✅ No coordinator check needed - auto-assigned
    const formData = prepareFormData(false); // isDraft = false
    const result = await submitCreditTransfer(formData, draftId, true);
    if (result.success) {
        alert("Application submitted successfully!");
        setDraftId(null); // Clear draft after submission
    }
    // ...
};

// UPDATE: prepareFormData function - remove coordinatorId
// OLD:
const prepareFormData = (isDraft = false) => {
    formData.append("status", isDraft ? "draft" : "submitted");
    formData.append("coordinatorId", coordinatorId); // ❌ Remove
    // ...
};

// NEW:
const prepareFormData = (isDraft = false) => {
    formData.append("programCode", course);
    formData.append("status", isDraft ? "draft" : "submitted");
    // ✅ No coordinatorId - automatically assigned
    if (draftId) {
        formData.append("draftId", draftId); // ✅ Add for updates
    }
    formData.append("mappings", JSON.stringify(mappings));
    // Add files...
};
```

---

---

### 5. **Delete Application** (REMOVED)

#### ❌ OLD:
```javascript
DELETE /api/credit-applications/${applicationId}
```

#### ✅ NEW:
- **Not implemented** in new backend
- Remove delete functionality from frontend

#### 📝 Changes Needed:
```javascript
// REMOVE THIS ENTIRE FUNCTION:
export async function deleteCreditApplication(applicationId) {
    // ❌ Remove entire function
}
```

---

## 🔧 Complete Updated Hook File

Replace your entire `useCTApplication.js` file with:

```javascript
const API_BASE = "http://localhost:3000/api";

function getToken() {
    return localStorage.getItem("cts_token");
}

// ===============================
// GET Program Structure (for logged-in student)
// ===============================
export async function getProgramStructure() {
    const token = getToken();
    if (!token) return { success: false, data: null };
    
    try {
        const res = await fetch(`${API_BASE}/program/structure`, {
            headers: { Authorization: "Bearer " + token },
        });
        
        if (!res.ok) return { success: false, data: null };
        const result = await res.json();
        return { success: true, data: result.program || null };
    } catch (error) {
        console.error("Get program structure error:", error);
        return { success: false, data: null };
    }
}

// ===============================
// GET Program Courses (for logged-in student)
// ===============================
export async function getProgramCourses() {
    const token = getToken();
    if (!token) return { success: false, data: [] };
    
    try {
        const res = await fetch(`${API_BASE}/program/courses`, {
            headers: { Authorization: "Bearer " + token },
        });
        
        if (!res.ok) return { success: false, data: [] };
        const result = await res.json();
        return { success: true, data: result.courses || [] };
    } catch (error) {
        console.error("Get program courses error:", error);
        return { success: false, data: [] };
    }
}

// ===============================
// GET My Credit Applications
// ===============================
export async function getMyCreditApplication() {
    const token = getToken();
    if (!token) return { success: false, data: [] };
    
    try {
        const res = await fetch(`${API_BASE}/credit-transfer/applications`, {
            headers: { Authorization: "Bearer " + token },
        });
        
        if (!res.ok) return { success: false, data: [] };
        const result = await res.json();
        return { success: true, data: result.applications || [] };
    } catch (error) {
        console.error("Get applications error:", error);
        return { success: false, data: [] };
    }
}

// ===============================
// GET Available Coordinators
// ===============================
export async function getAvailableCoordinators() {
    const token = getToken();
    if (!token) return { success: false, data: [] };
    
    try {
        const res = await fetch(`${API_BASE}/appointment/coordinators`, {
            headers: { Authorization: "Bearer " + token },
        });
        
        if (!res.ok) return { success: false, data: [] };
        const result = await res.json();
        return { success: true, data: result.coordinators || [] };
    } catch (error) {
        console.error("Get coordinators error:", error);
        return { success: false, data: [] };
    }
}

// ===============================
// SUBMIT Credit Transfer Application (supports drafts)
// ===============================
export async function submitCreditTransfer(formData, draftId = null, isFinalSubmit = false) {
    const token = getToken();
    if (!token) return { success: false, message: "User not authenticated" };
    
    // Add draftId to formData if updating existing draft
    if (draftId) {
        formData.append("draftId", draftId);
    }
    
    try {
        const res = await fetch(`${API_BASE}/credit-transfer/apply`, {
            method: "POST", // Always POST, even for draft updates
            headers: { Authorization: "Bearer " + token },
            body: formData,
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            return { success: false, message: errorData.error || "Server error" };
        }
        
        const data = await res.json();
        return { success: true, data };
    } catch (error) {
        console.error("Submit error:", error);
        return { success: false, message: error.message || "Network error" };
    }
}
```

---

## 📝 Component Updates Summary

### Remove:
1. ❌ `coordinatorId` state and selection (auto-assigned now)
2. ❌ Coordinator selector dropdown
3. ❌ Coordinator validation before submit
4. ❌ Delete application functionality

### Keep/Update:
1. ✅ `draftId` state (KEEP - drafts supported!)
2. ✅ `handleSaveDraft` function (KEEP - works with new API)
3. ✅ "Save as Draft" button (KEEP)
4. ✅ Draft loading logic in `useEffect` (KEEP)
5. ✅ `isDraft` parameter in `prepareFormData` (KEEP)

### Add:
1. ✅ `getProgramCourses()` function
2. ✅ Load courses on mount to populate subject dropdown

### Update:
1. ✅ `getProgramStructures(course)` → `getProgramStructure()` (no param)
2. ✅ `getMyCreditApplication()` endpoint URL
3. ✅ `submitCreditTransfer()` - remove draft params
4. ✅ `prepareFormData()` - always "submitted", require coordinatorId
5. ✅ Response structure mapping for applications

---

## 🚨 Important Notes

1. **Draft Support**: ✅ Drafts are **fully supported**! Students can save drafts and continue later. Use `status: "draft"` and include `draftId` when updating.

2. **Coordinator Auto-Assigned**: ✅ `coordinatorId` is **automatically assigned** based on student's `program_id`. No need to select or provide coordinator.

3. **Program Structure**: No longer needs `programCode` parameter - automatically uses student's enrolled program.

4. **Program Courses**: Get courses separately using `/api/program/courses` endpoint to populate the "Current Subject" dropdown.

5. **Files for Drafts**: Syllabus files are **optional** for drafts, but **required** when submitting (`status: "submitted"`).

6. **Response Structure**: The API response structure has changed. Update your data mapping accordingly.

---

## ✅ Testing Checklist

After making changes, test:
- [ ] Can load program structure (PDF)
- [ ] Can load available coordinators
- [ ] Can select coordinator from dropdown
- [ ] Can submit application with all required fields
- [ ] Can view submitted applications
- [ ] Error handling works correctly
- [ ] Form validation works before submit

---

## 🔗 API Endpoints Reference

| Old Endpoint | New Endpoint | Method | Notes |
|-------------|-------------|--------|-------|
| `/api/program-structures?program_code=...` | `/api/program/structure` | GET | No query param |
| `/api/credit-applications/mine` | `/api/credit-transfer/applications` | GET | Same functionality |
| `/api/credit-applications` | `/api/credit-transfer/apply` | POST | Supports drafts! |
| `/api/credit-applications/:id/draft` | `/api/credit-transfer/apply` (with `draftId`) | POST | Same endpoint, include `draftId` |
| ❌ Not available | `/api/program/courses` | GET | **NEW - Get courses for dropdown** |
| `/api/credit-applications/:id` | ❌ Removed | DELETE | Not implemented |

---

**Last Updated**: December 9, 2024

