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
    key: "employees",
    label: "Employees",
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
