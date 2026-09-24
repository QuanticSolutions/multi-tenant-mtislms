// Central registry of importable entities. The import wizard is fully driven by
// this config — adding a new importable entity means adding an entry here only.

export type FieldType = "text" | "number" | "boolean" | "date" | "enum" | "uuid-lookup";

export type ImportField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  requiredOnInsert?: boolean;
  min?: number;
  lookupFilter?: { column: string; value: boolean | string };
  enumValues?: readonly string[];
  /** For uuid-lookup: table to resolve against. */
  lookupTable?: string;
  /** For uuid-lookup: columns combined to match the human-friendly value. */
  lookupMatchField?: string[];
  example?: string | number;
  help?: string;
};

export type ImportEntity = {
  key: string;
  label: string;
  description: string;
  table: string;
  /** Columns used to detect an existing record (duplicate handling). */
  dedupeFields: string[];
  fields: ImportField[];
  /** Shared records are enriched, never replaced or duplicated. */
  mergeMode?: "fill-missing";
  matchCaseSensitive?: boolean;
};

export const IMPORT_ENTITIES: ImportEntity[] = [
  {
    key: "students",
    label: "Students",
    description: "Student profiles with guardian details and class assignment.",
    table: "students",
    dedupeFields: ["admission_no"],
    fields: [
      { key: "admission_no", label: "Admission No", type: "text", required: true, example: "ADM-1001" },
      { key: "full_name", label: "Full Name", type: "text", required: true, example: "Ayesha Khan" },
      { key: "gender", label: "Gender", type: "enum", enumValues: ["male", "female", "other"], example: "female" },
      { key: "date_of_birth", label: "Date of Birth", type: "date", example: "2014-03-21" },
      { key: "guardian_name", label: "Guardian Name", type: "text", example: "Imran Khan" },
      { key: "guardian_phone", label: "Guardian Phone", type: "text", example: "03001234567" },
      { key: "guardian_email", label: "Guardian Email", type: "text", example: "guardian@example.com" },
      { key: "address", label: "Address", type: "text", example: "12 Model Town, Lahore" },
      {
        key: "class_id",
        label: "Class",
        type: "uuid-lookup",
        lookupTable: "classes",
        lookupMatchField: ["name", "section"],
        example: "Grade 5 A",
        help: "Class name and section, e.g. “Grade 5 A”.",
      },
      {
        key: "status",
        label: "Status",
        type: "enum",
        enumValues: ["active", "inactive", "graduated", "transferred", "terminated"],
        example: "active",
      },
      { key: "enrollment_date", label: "Enrollment Date", type: "date", example: "2025-04-01" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "classes",
    label: "Classes",
    description: "Class sections with grade level, academic year and capacity.",
    table: "classes",
    dedupeFields: ["name"],
    fields: [
      { key: "name", label: "Class Name", type: "text", required: true, example: "Grade 5" },
      { key: "section", label: "Section", type: "text", example: "A" },
      { key: "grade_level", label: "Grade Level", type: "number", example: 5 },
      { key: "academic_year", label: "Academic Year", type: "text", required: true, example: "2025-26" },
      { key: "capacity", label: "Capacity", type: "number", example: 40 },
      {
        key: "class_teacher_id",
        label: "Class Teacher",
        type: "uuid-lookup",
        lookupTable: "teachers",
        lookupMatchField: ["full_name"],
        example: "Sana Malik",
        help: "Teacher full name as recorded in Teachers.",
      },
    ],
  },
  {
    key: "departments",
    label: "Departments",
    description: "Teaching and non-teaching departments. Import these before employees.",
    table: "departments",
    dedupeFields: ["name"],
    mergeMode: "fill-missing",
    matchCaseSensitive: true,
    fields: [
      { key: "name", label: "Department Name", type: "text", required: true, example: "Teaching Staff" },
      { key: "is_teaching", label: "Teaching Department", type: "boolean", requiredOnInsert: true, example: "yes" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    description: "All staff, matched by Employee No. Teaching departments also appear in Teachers.",
    table: "teachers",
    dedupeFields: ["employee_no"],
    mergeMode: "fill-missing",
    matchCaseSensitive: true,
    fields: [
      { key: "employee_no", label: "Employee No", type: "text", required: true, example: "EMP-201" },
      { key: "full_name", label: "Full Name", type: "text", requiredOnInsert: true, example: "Sana Malik" },
      { key: "department_id", label: "Department", type: "uuid-lookup", requiredOnInsert: true, lookupTable: "departments", lookupMatchField: ["name"], example: "Teaching Staff" },
      { key: "email", label: "Email", type: "text", example: "sana@example.com" },
      { key: "phone", label: "Phone", type: "text", example: "03007654321" },
      { key: "designation", label: "Designation", type: "text" },
      { key: "base_salary", label: "Base Salary", type: "number", min: 0, example: 40000 },
      { key: "date_of_joining", label: "Date of Joining", type: "date", requiredOnInsert: true, example: "2022-08-15" },
      { key: "status", label: "Status", type: "enum", enumValues: ["active", "on_leave", "inactive", "resigned", "probation"], example: "active" },
      { key: "gender", label: "Gender", type: "enum", enumValues: ["male", "female", "other"] },
      { key: "date_of_birth", label: "Date of Birth", type: "date" },
      { key: "address", label: "Address", type: "text" },
    ],
  },
  {
    key: "teachers",
    label: "Teachers",
    description: "Teaching details matched to employees by Employee No; only empty fields are completed.",
    table: "teachers",
    dedupeFields: ["employee_no"],
    mergeMode: "fill-missing",
    matchCaseSensitive: true,
    fields: [
      { key: "employee_no", label: "Employee No", type: "text", required: true, example: "EMP-201" },
      { key: "full_name", label: "Full Name", type: "text", requiredOnInsert: true, example: "Sana Malik" },
      { key: "department_id", label: "Department", type: "uuid-lookup", requiredOnInsert: true, lookupTable: "departments", lookupMatchField: ["name"], lookupFilter: { column: "is_teaching", value: true }, example: "Teaching Staff" },
      { key: "subject_id", label: "Subject", type: "uuid-lookup", lookupTable: "subjects", lookupMatchField: ["code", "name"], help: "Use a unique subject code or subject UUID; ambiguous names are rejected." },
      { key: "fee_group_id", label: "Fee Group", type: "uuid-lookup", lookupTable: "fee_groups", lookupMatchField: ["name"] },
      { key: "email", label: "Email", type: "text", example: "sana@example.com" },
      { key: "phone", label: "Phone", type: "text", example: "03007654321" },
      { key: "gender", label: "Gender", type: "enum", enumValues: ["male", "female", "other"], example: "female" },
      { key: "date_of_birth", label: "Date of Birth", type: "date", example: "1990-06-12" },
      { key: "qualification", label: "Qualification", type: "text", example: "M.Ed" },
      { key: "specialization", label: "Specialization", type: "text", example: "Mathematics" },
      { key: "date_of_joining", label: "Date of Joining", type: "date", requiredOnInsert: true, example: "2022-08-15" },
      {
        key: "status",
        label: "Status",
        type: "enum",
        enumValues: ["active", "on_leave", "inactive", "resigned", "probation"],
        example: "active",
      },
      { key: "address", label: "Address", type: "text" },
    ],
  },
  {
    key: "parents",
    label: "Parents / Guardians",
    description: "Parent and guardian contact records.",
    table: "parents",
    dedupeFields: ["email", "cnic"],
    fields: [
      { key: "full_name", label: "Full Name", type: "text", required: true, example: "Imran Khan" },
      { key: "email", label: "Email", type: "text", example: "imran@example.com" },
      { key: "phone", label: "Phone", type: "text", example: "03001234567" },
      { key: "cnic", label: "CNIC", type: "text", example: "35202-1234567-1" },
      { key: "profession", label: "Profession", type: "text", example: "Engineer" },
      { key: "employer", label: "Employer", type: "text" },
      { key: "address", label: "Address", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "fee_structures",
    label: "Fee Structures",
    description: "Per-class fee heads and amounts.",
    table: "fee_structures",
    dedupeFields: ["name", "academic_year"],
    fields: [
      {
        key: "class_id",
        label: "Class",
        type: "uuid-lookup",
        required: true,
        lookupTable: "classes",
        lookupMatchField: ["name", "section"],
        example: "Grade 5 A",
      },
      { key: "name", label: "Fee Name", type: "text", required: true, example: "Tuition Fee" },
      { key: "description", label: "Description", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true, example: 5000 },
      {
        key: "frequency",
        label: "Frequency",
        type: "enum",
        required: true,
        enumValues: ["one_time", "monthly", "quarterly", "annual"],
        example: "monthly",
      },
      { key: "due_day", label: "Due Day", type: "number", example: 10 },
      { key: "academic_year", label: "Academic Year", type: "text", required: true, example: "2025-26" },
    ],
  },
  {
    key: "books",
    label: "Library Books",
    description: "Library catalogue.",
    table: "books",
    dedupeFields: ["isbn", "title"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, example: "Introduction to Algebra" },
      { key: "author", label: "Author", type: "text", required: true, example: "H. Ahmed" },
      { key: "isbn", label: "ISBN", type: "text", example: "978-1234567890" },
      { key: "category", label: "Category", type: "text", example: "Mathematics" },
      { key: "publisher", label: "Publisher", type: "text" },
      { key: "publication_year", label: "Publication Year", type: "number", example: 2019 },
      { key: "total_copies", label: "Total Copies", type: "number", example: 5 },
      { key: "available_copies", label: "Available Copies", type: "number", example: 5 },
      { key: "shelf_location", label: "Shelf Location", type: "text", example: "A-12" },
    ],
  },
  {
    key: "inventory_items",
    label: "Inventory Items",
    description: "Stock and asset register.",
    table: "inventory_items",
    dedupeFields: ["sku", "name"],
    fields: [
      { key: "name", label: "Item Name", type: "text", required: true, example: "Whiteboard Marker" },
      { key: "sku", label: "SKU", type: "text", example: "STA-001" },
      {
        key: "category_id",
        label: "Category",
        type: "uuid-lookup",
        lookupTable: "inventory_categories",
        lookupMatchField: ["name"],
        example: "Stationery",
      },
      { key: "unit", label: "Unit", type: "text", example: "piece" },
      { key: "quantity", label: "Quantity", type: "number", example: 100 },
      { key: "reorder_level", label: "Reorder Level", type: "number", example: 20 },
      { key: "unit_cost", label: "Unit Cost", type: "number", example: 50 },
      { key: "location", label: "Location", type: "text" },
      { key: "supplier", label: "Supplier", type: "text" },
    ],
  },
  {
    key: "subjects",
    label: "Subjects",
    description: "Subjects per class with assigned teacher.",
    table: "subjects",
    dedupeFields: [],
    fields: [
      { key: "class_id", label: "Class", type: "uuid-lookup", required: true, lookupTable: "classes", lookupMatchField: ["name", "section"], example: "Class 5 A" },
      { key: "name", label: "Subject Name", type: "text", required: true, example: "Mathematics" },
      { key: "code", label: "Code", type: "text", example: "MATH-5" },
      { key: "credit_hours", label: "Credit Hours", type: "number", example: 4 },
      { key: "is_optional", label: "Optional", type: "boolean", example: "no" },
      { key: "teacher_id", label: "Teacher / Staff", type: "uuid-lookup",  lookupTable: "teachers", lookupMatchField: ["employee_no"], example: "EMP-201", help: "Employee No." },
    ],
  },
  {
    key: "drivers",
    label: "Drivers",
    description: "Transport drivers and vehicles.",
    table: "drivers",
    dedupeFields: ["cnic", "licence_no"],
    fields: [
      { key: "full_name", label: "Full Name", type: "text", required: true, example: "Aslam Khan" },
      { key: "phone", label: "Phone", type: "text", example: "03001112233" },
      { key: "cnic", label: "CNIC", type: "text" },
      { key: "licence_no", label: "Licence No", type: "text" },
      { key: "vehicle_registration", label: "Vehicle Registration", type: "text", example: "LEA-1234" },
      { key: "vehicle_model", label: "Vehicle Model", type: "text" },
      { key: "is_active", label: "Active", type: "boolean", example: "yes" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "admission_applications",
    label: "Admission Applications",
    description: "Applicant records for admissions.",
    table: "admission_applications",
    dedupeFields: ["application_no"],
    fields: [
      { key: "application_no", label: "Application No", type: "text", required: true, example: "APP-001" },
      { key: "first_name", label: "First Name", type: "text", required: true, example: "Ali" },
      { key: "last_name", label: "Last Name", type: "text", required: true, example: "Raza" },
      { key: "gender", label: "Gender", type: "enum", enumValues: ["male", "female", "other"] },
      { key: "date_of_birth", label: "Date of Birth", type: "date" },
      { key: "applying_for_class_id", label: "Applying For Class", type: "uuid-lookup", lookupTable: "classes", lookupMatchField: ["name", "section"] },
      { key: "previous_school", label: "Previous School", type: "text" },
      { key: "guardian_name", label: "Guardian Name", type: "text", required: true, example: "Raza Ahmed" },
      { key: "guardian_phone", label: "Guardian Phone", type: "text", required: true, example: "03001234567" },
      { key: "guardian_email", label: "Guardian Email", type: "text" },
      { key: "address", label: "Address", type: "text" },
      { key: "status", label: "Status", type: "enum", enumValues: ["new", "screening", "interview", "offered", "accepted", "rejected", "withdrawn"] },
      { key: "application_fee", label: "Application Fee", type: "number" },
      { key: "fee_paid", label: "Fee Paid", type: "boolean" },
    ],
  },
  {
    key: "employment_applications",
    label: "Staff Applications",
    description: "Job applicants for staff positions.",
    table: "employment_applications",
    dedupeFields: ["email"],
    fields: [
      { key: "full_name", label: "Full Name", type: "text", required: true, example: "Hina Tariq" },
      { key: "phone", label: "Phone", type: "text", required: true, example: "03004445566" },
      { key: "email", label: "Email", type: "text" },
      { key: "position", label: "Position", type: "text", required: true, example: "Science Teacher" },
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "experience_years", label: "Experience (Years)", type: "number" },
      { key: "expected_salary", label: "Expected Salary", type: "number" },
      { key: "status", label: "Status", type: "enum", enumValues: ["new", "screening", "interview", "offered", "hired", "rejected"] },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "donations",
    label: "Donations",
    description: "Donor contributions and pledges.",
    table: "donations",
    dedupeFields: ["reference"],
    fields: [
      { key: "donor_name", label: "Donor Name", type: "text", required: true, example: "Ahmed Trust" },
      { key: "donor_phone", label: "Donor Phone", type: "text" },
      { key: "donor_email", label: "Donor Email", type: "text" },
      { key: "amount", label: "Amount", type: "number", required: true, example: 50000 },
      { key: "purpose", label: "Purpose", type: "text" },
      { key: "method", label: "Method", type: "enum", enumValues: ["cash", "bank_transfer", "card", "cheque", "online", "other"] },
      { key: "reference", label: "Reference", type: "text" },
      { key: "donation_date", label: "Donation Date", type: "date" },
      { key: "status", label: "Status", type: "enum", enumValues: ["pledged", "received", "cancelled"] },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "events",
    label: "Events Calendar",
    description: "Holidays, exams, PTMs and activities.",
    table: "events",
    dedupeFields: [],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, example: "Sports Day" },
      { key: "description", label: "Description", type: "text" },
      { key: "event_type", label: "Event Type", type: "enum", enumValues: ["holiday", "exam", "ptm", "activity", "announcement", "other"] },
      { key: "audience", label: "Audience", type: "enum", enumValues: ["all", "students", "teachers", "parents", "staff"] },
      { key: "start_date", label: "Start Date", type: "date", required: true, example: "2025-12-01" },
      { key: "end_date", label: "End Date", type: "date", required: true, example: "2025-12-01" },
      { key: "start_time", label: "Start Time", type: "text", example: "09:00" },
      { key: "end_time", label: "End Time", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "is_holiday", label: "Holiday", type: "boolean" },
      { key: "class_id", label: "Class", type: "uuid-lookup",  lookupTable: "classes", lookupMatchField: ["name", "section"], example: "Class 5 A" },
    ],
  },
  {
    key: "announcements",
    label: "Announcements",
    description: "Notices for students, teachers and parents.",
    table: "announcements",
    dedupeFields: [],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, example: "Winter break" },
      { key: "body", label: "Message", type: "text", required: true },
      { key: "audience", label: "Audience", type: "enum", enumValues: ["all", "teachers", "parents", "class"] },
      { key: "class_id", label: "Class", type: "uuid-lookup",  lookupTable: "classes", lookupMatchField: ["name", "section"], example: "Class 5 A" },
      { key: "pinned", label: "Pinned", type: "boolean" },
      { key: "published_at", label: "Published On", type: "date" },
    ],
  },
  {
    key: "attendance",
    label: "Student Attendance",
    description: "Daily student attendance records.",
    table: "attendance",
    dedupeFields: [],
    fields: [
      { key: "student_id", label: "Student (Admission No)", type: "uuid-lookup", required: true, lookupTable: "students", lookupMatchField: ["admission_no"], example: "ADM-1001" },
      { key: "class_id", label: "Class", type: "uuid-lookup", required: true, lookupTable: "classes", lookupMatchField: ["name", "section"], example: "Class 5 A" },
      { key: "date", label: "Date", type: "date", required: true, example: "2025-09-01" },
      { key: "status", label: "Status", type: "enum", enumValues: ["present", "absent", "late", "excused"], required: true },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "staff_attendance",
    label: "Staff Attendance",
    description: "Daily staff attendance with check-in/out.",
    table: "staff_attendance",
    dedupeFields: [],
    fields: [
      { key: "staff_id", label: "Teacher / Staff", type: "uuid-lookup", required: true, lookupTable: "teachers", lookupMatchField: ["employee_no"], example: "EMP-201", help: "Employee No." },
      { key: "date", label: "Date", type: "date", required: true, example: "2025-09-01" },
      { key: "status", label: "Status", type: "enum", enumValues: ["present", "absent", "late", "half_day", "leave"], required: true },
      { key: "check_in", label: "Check In", type: "text", example: "08:00" },
      { key: "check_out", label: "Check Out", type: "text", example: "14:00" },
      { key: "hours_worked", label: "Hours Worked", type: "number" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "timetable_slots",
    label: "Timetable",
    description: "Weekly periods per class.",
    table: "timetable_slots",
    dedupeFields: [],
    fields: [
      { key: "class_id", label: "Class", type: "uuid-lookup", required: true, lookupTable: "classes", lookupMatchField: ["name", "section"], example: "Class 5 A" },
      { key: "day_of_week", label: "Day of Week (1=Mon)", type: "number", required: true, example: 1 },
      { key: "period_no", label: "Period No", type: "number", required: true, example: 1 },
      { key: "start_time", label: "Start Time", type: "text", required: true, example: "08:00" },
      { key: "end_time", label: "End Time", type: "text", required: true, example: "08:40" },
      { key: "subject", label: "Subject", type: "text", required: true, example: "Mathematics" },
      { key: "teacher_id", label: "Teacher / Staff", type: "uuid-lookup",  lookupTable: "teachers", lookupMatchField: ["employee_no"], example: "EMP-201", help: "Employee No." },
      { key: "room", label: "Room", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "exams",
    label: "Exams",
    description: "Exam schedule per class and subject.",
    table: "exams",
    dedupeFields: [],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, example: "Mid Term" },
      { key: "class_id", label: "Class", type: "uuid-lookup", required: true, lookupTable: "classes", lookupMatchField: ["name", "section"], example: "Class 5 A" },
      { key: "subject", label: "Subject", type: "text", required: true, example: "Mathematics" },
      { key: "exam_date", label: "Exam Date", type: "date", required: true, example: "2025-10-15" },
      { key: "start_time", label: "Start Time", type: "text" },
      { key: "end_time", label: "End Time", type: "text" },
      { key: "total_marks", label: "Total Marks", type: "number", example: 100 },
      { key: "passing_marks", label: "Passing Marks", type: "number", example: 40 },
      { key: "status", label: "Status", type: "enum", enumValues: ["scheduled", "ongoing", "completed", "cancelled"] },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "exam_results",
    label: "Exam Results",
    description: "Marks per student per exam.",
    table: "exam_results",
    dedupeFields: [],
    fields: [
      { key: "exam_id", label: "Exam (Title)", type: "uuid-lookup", required: true, lookupTable: "exams", lookupMatchField: ["title", "subject"], example: "Mid Term Mathematics" },
      { key: "student_id", label: "Student (Admission No)", type: "uuid-lookup", required: true, lookupTable: "students", lookupMatchField: ["admission_no"], example: "ADM-1001" },
      { key: "marks_obtained", label: "Marks Obtained", type: "number", example: 78 },
      { key: "is_absent", label: "Absent", type: "boolean" },
      { key: "remarks", label: "Remarks", type: "text" },
    ],
  },
  {
    key: "fee_constituents",
    label: "Fee Heads",
    description: "Fee components such as tuition, lab, transport.",
    table: "fee_constituents",
    dedupeFields: ["name"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, example: "Tuition" },
      { key: "is_active", label: "Active", type: "boolean", example: "yes" },
    ],
  },
  {
    key: "invoices",
    label: "Invoices",
    description: "Student fee invoices.",
    table: "invoices",
    dedupeFields: ["invoice_no"],
    fields: [
      { key: "invoice_no", label: "Invoice No", type: "text", required: true, example: "INV-0001" },
      { key: "student_id", label: "Student (Admission No)", type: "uuid-lookup", required: true, lookupTable: "students", lookupMatchField: ["admission_no"], example: "ADM-1001" },
      { key: "title", label: "Title", type: "text", required: true, example: "September Fee" },
      { key: "amount", label: "Amount", type: "number", required: true, example: 5000 },
      { key: "discount", label: "Discount", type: "number" },
      { key: "amount_paid", label: "Amount Paid", type: "number" },
      { key: "issue_date", label: "Issue Date", type: "date" },
      { key: "due_date", label: "Due Date", type: "date", required: true, example: "2025-09-10" },
      { key: "status", label: "Status", type: "enum", enumValues: ["pending", "paid", "partial", "overdue", "cancelled"] },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    description: "Payments against invoices.",
    table: "payments",
    dedupeFields: ["reference"],
    fields: [
      { key: "invoice_id", label: "Invoice No", type: "uuid-lookup", required: true, lookupTable: "invoices", lookupMatchField: ["invoice_no"], example: "INV-0001" },
      { key: "amount", label: "Amount", type: "number", required: true, example: 5000 },
      { key: "method", label: "Method", type: "enum", enumValues: ["cash", "bank_transfer", "card", "cheque", "online", "other"] },
      { key: "paid_on", label: "Paid On", type: "date" },
      { key: "reference", label: "Reference", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "finance_entries",
    label: "Income & Expenses",
    description: "General ledger income and expense entries.",
    table: "finance_entries",
    dedupeFields: [],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, example: "Electricity bill" },
      { key: "entry_type", label: "Type", type: "enum", enumValues: ["income", "expense"], required: true },
      { key: "amount", label: "Amount", type: "number", required: true, example: 12000 },
      { key: "entry_date", label: "Date", type: "date" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "inventory_categories",
    label: "Inventory Categories",
    description: "Categories for stock items. Import before items.",
    table: "inventory_categories",
    dedupeFields: ["name"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true, example: "Stationery" },
      { key: "description", label: "Description", type: "text" },
    ],
  },
  {
    key: "book_issues",
    label: "Library Issues",
    description: "Books issued to students.",
    table: "book_issues",
    dedupeFields: [],
    fields: [
      { key: "book_id", label: "Book (ISBN or Title)", type: "uuid-lookup", required: true, lookupTable: "books", lookupMatchField: ["isbn"], example: "978-1234567890" },
      { key: "student_id", label: "Student (Admission No)", type: "uuid-lookup", required: true, lookupTable: "students", lookupMatchField: ["admission_no"], example: "ADM-1001" },
      { key: "issue_date", label: "Issue Date", type: "date" },
      { key: "due_date", label: "Due Date", type: "date", required: true, example: "2025-09-20" },
      { key: "return_date", label: "Return Date", type: "date" },
      { key: "status", label: "Status", type: "enum", enumValues: ["issued", "returned", "overdue", "lost"] },
      { key: "fine_amount", label: "Fine", type: "number" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    key: "student_parents",
    label: "Student–Parent Links",
    description: "Link students to parents (by admission no and parent CNIC).",
    table: "student_parents",
    dedupeFields: [],
    fields: [
      { key: "student_id", label: "Student (Admission No)", type: "uuid-lookup", required: true, lookupTable: "students", lookupMatchField: ["admission_no"], example: "ADM-1001" },
      { key: "parent_id", label: "Parent (CNIC)", type: "uuid-lookup", required: true, lookupTable: "parents", lookupMatchField: ["cnic"], example: "35202-1234567-1" },
      { key: "relation", label: "Relation", type: "text", required: true, example: "father" },
      { key: "is_primary", label: "Primary", type: "boolean" },
    ],
  },
];

export function getEntity(key: string): ImportEntity | undefined {
  return IMPORT_ENTITIES.find((e) => e.key === key);
}

/** Normalizes a header/lookup value for fuzzy comparison. */
export function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "")
    .trim();
}

/** Alias forms generated for a lookup row so users can type natural values. */
export function lookupAliases(values: (string | null | undefined)[]): string[] {
  const parts = values.map((v) => (v ?? "").toString().trim()).filter(Boolean);
  if (parts.length === 0) return [];
  const aliases = [parts.join(" "), parts.join("-"), parts.join(""), parts[0]];
  return Array.from(new Set(aliases.map(normalizeKey).filter(Boolean)));
}
