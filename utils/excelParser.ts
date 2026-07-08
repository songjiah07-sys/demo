import * as XLSX from 'xlsx';
import { ColumnMapping, EmployeeRecord } from '../types/hr';

export interface ParseResult {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rawRows: Record<string, any>[];
  warnings: string[];
  error?: string;
}

// Helper to convert Excel serial dates to JS Date
export function parseExcelDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    // Excel dates start on Jan 1, 1900.
    // 25569 is the number of days between 1900-01-01 and 1970-01-01 (Unix epoch)
    const date = new Date((value - 25569) * 86400 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

// Fuzzy matching to identify headers for sheet ranking
const COMMON_HR_KEYWORDS = [
  'id', 'employee', 'name', 'gender', 'sex', 'age', 'dept', 'department',
  'position', 'title', 'role', 'salary', 'wage', 'pay', 'join', 'hire',
  'resign', 'leave', 'termination', 'resign', 'status', 'manager', 'supervisor',
  'performance', 'rating', 'allowance', 'bonus', 'training', 'absence', 'location'
];

/**
 * Ranks worksheet sheets by checking their first row headers against HR terms
 */
export function autoDetectHRSheet(workbook: XLSX.WorkBook): string {
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length <= 1) return sheetNames[0] || '';

  let bestSheetName = sheetNames[0];
  let maxScore = -1;

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Read the first 5 rows to see headers
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z5');
    let score = 0;
    
    // Scan cell values in the first 2 rows (in case headers are on row 2)
    for (let R = range.s.r; R <= Math.min(range.e.r, range.s.r + 1); ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = sheet[cellRef];
        if (cell && cell.v) {
          const val = String(cell.v).toLowerCase().trim();
          // Check for keyword matches
          for (const kw of COMMON_HR_KEYWORDS) {
            if (val === kw || val.includes(kw)) {
              score += 1;
            }
          }
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestSheetName = sheetName;
    }
  }

  return bestSheetName;
}

/**
 * Parse file buffer into raw JSON worksheets and detect schema headers
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        const sheetNames = workbook.SheetNames;
        if (sheetNames.length === 0) {
          resolve({
            sheetNames: [],
            selectedSheet: '',
            headers: [],
            rawRows: [],
            warnings: [],
            error: 'The uploaded file does not contain any sheets.'
          });
          return;
        }

        const selectedSheet = autoDetectHRSheet(workbook);
        const worksheet = workbook.Sheets[selectedSheet];
        if (!worksheet) {
          resolve({
            sheetNames,
            selectedSheet,
            headers: [],
            rawRows: [],
            warnings: [],
            error: `Could not load sheet named "${selectedSheet}".`
          });
          return;
        }

        // Convert worksheet to JSON rows.
        // defval: null puts null in empty cells instead of skipping them, keeping alignment
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { 
          defval: null,
          raw: false // Parses dates as dates and reads formatted values
        });

        // Extract headers from the keys of all rows to be safe,
        // since sheet_to_json might not represent columns that are completely empty in the first row.
        const headersSet = new Set<string>();
        rawRows.forEach(row => {
          Object.keys(row).forEach(key => {
            if (key !== undefined && key !== null && key !== '') {
              headersSet.add(key);
            }
          });
        });
        const headers = Array.from(headersSet);

        // Sanitize rows by removing completely empty rows (where all values are null)
        const cleanRows = rawRows.filter(row => {
          return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
        });

        const warnings: string[] = [];
        if (cleanRows.length === 0) {
          warnings.push('The selected sheet has headers but contains no employee data rows.');
        }

        resolve({
          sheetNames,
          selectedSheet,
          headers,
          rawRows: cleanRows,
          warnings
        });
      } catch (err) {
        console.error('SheetJS parse error:', err);
        resolve({
          sheetNames: [],
          selectedSheet: '',
          headers: [],
          rawRows: [],
          warnings: [],
          error: 'Corrupted or invalid Excel file. Please upload a valid .xlsx or .xls file.'
        });
      }
    };

    reader.onerror = () => {
      resolve({
        sheetNames: [],
        selectedSheet: '',
        headers: [],
        rawRows: [],
        warnings: [],
        error: 'Failed to read the file. Please try again.'
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Maps raw JSON rows to standardized EmployeeRecord using user configuration
 */
export function mapRawDataToHRRecords(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping
): { records: EmployeeRecord[]; warnings: string[] } {
  const records: EmployeeRecord[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<string>();
  let duplicateCount = 0;
  let emptyIdCount = 0;

  rawRows.forEach((row, index) => {
    // Extract ID (primary key)
    const rawId = mapping.id ? row[mapping.id] : null;
    let id = rawId !== null && rawId !== undefined ? String(rawId).trim() : '';

    if (!id) {
      emptyIdCount++;
      id = `EMP_TEMP_${index + 1}`; // Auto-generate temp ID
    }

    if (seenIds.has(id)) {
      duplicateCount++;
      id = `${id}_DUP_${duplicateCount}`;
    } else {
      seenIds.add(id);
    }

    // Extract numerical fields safely
    const getNum = (header: string, defaultVal = 0): number => {
      if (!header) return defaultVal;
      const val = row[header];
      if (val === null || val === undefined) return defaultVal;
      // Strip currency signs, commas, percentages, etc.
      const cleaned = String(val).replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? defaultVal : parsed;
    };

    // Extract performance rating (handle string formats like "1 - Poor" or numeric 3.5)
    let performanceRating = 3; // default median
    if (mapping.performanceRating) {
      const rawPerf = row[mapping.performanceRating];
      if (rawPerf !== null && rawPerf !== undefined) {
        const numPerf = parseFloat(String(rawPerf).replace(/[^0-9.-]/g, ''));
        if (!isNaN(numPerf)) {
          performanceRating = numPerf;
        } else {
          // If string like "Excellent" or "High", map fuzzy
          const strPerf = String(rawPerf).toLowerCase().trim();
          if (strPerf.includes('ex') || strPerf.includes('out') || strPerf.includes('high') || strPerf.includes('5') || strPerf.includes('great')) {
            performanceRating = 5;
          } else if (strPerf.includes('good') || strPerf.includes('above') || strPerf.includes('4')) {
            performanceRating = 4;
          } else if (strPerf.includes('meet') || strPerf.includes('avg') || strPerf.includes('satisfact') || strPerf.includes('3')) {
            performanceRating = 3;
          } else if (strPerf.includes('need') || strPerf.includes('below') || strPerf.includes('2') || strPerf.includes('fair')) {
            performanceRating = 2;
          } else if (strPerf.includes('poor') || strPerf.includes('unsatisfact') || strPerf.includes('1') || strPerf.includes('low')) {
            performanceRating = 1;
          }
        }
      }
    }

    // Extract promotion boolean
    let promotion = false;
    if (mapping.promotion) {
      const rawPromo = row[mapping.promotion];
      if (rawPromo !== null && rawPromo !== undefined) {
        const strPromo = String(rawPromo).toLowerCase().trim();
        promotion = ['true', 'yes', 'y', '1', 'promoted', 't'].includes(strPromo) || getNum(mapping.promotion) === 1;
      }
    }

    // Extract other standard fields
    const getString = (header: string, defaultVal = 'Unknown'): string => {
      if (!header) return defaultVal;
      const val = row[header];
      return val !== null && val !== undefined ? String(val).trim() : defaultVal;
    };

    const joinDate = mapping.joinDate ? parseExcelDate(row[mapping.joinDate]) : null;
    const resignDate = mapping.resignDate ? parseExcelDate(row[mapping.resignDate]) : null;

    // Detect employment status
    let employmentStatus = getString(mapping.employmentStatus, 'Active');
    // If there is a resign date, make sure status is Resigned or inactive if not set
    if (resignDate && !['resigned', 'terminated', 'inactive', 'left'].includes(employmentStatus.toLowerCase())) {
      employmentStatus = 'Resigned';
    }

    // Capture extra columns
    const extraColumns: Record<string, any> = {};
    const mappedHeaders = Object.values(mapping);
    Object.keys(row).forEach(key => {
      if (!mappedHeaders.includes(key)) {
        extraColumns[key] = row[key];
      }
    });

    const record: EmployeeRecord = {
      id,
      name: getString(mapping.name, 'Unnamed Employee'),
      gender: getString(mapping.gender, 'Male'), // Male/Female/Other default
      age: Math.max(18, Math.min(100, getNum(mapping.age, 35))),
      department: getString(mapping.department, 'Operations'),
      division: getString(mapping.division, 'N/A'),
      businessUnit: getString(mapping.businessUnit, 'N/A'),
      position: getString(mapping.position, 'Staff'),
      level: getString(mapping.level, 'Junior'),
      manager: getString(mapping.manager, 'N/A'),
      joinDate,
      resignDate,
      employmentStatus,
      salary: getNum(mapping.salary, 0),
      allowance: getNum(mapping.allowance, 0),
      performanceRating,
      trainingHours: getNum(mapping.trainingHours, 0),
      trainingCost: getNum(mapping.trainingCost, 0),
      promotion,
      absence: getNum(mapping.absence, 0),
      leaveDays: getNum(mapping.leaveDays, 0),
      location: getString(mapping.location, 'Headquarters'),
      extraColumns
    };

    records.push(record);
  });

  // Compile warnings
  if (duplicateCount > 0) {
    warnings.push(`Detected ${duplicateCount} duplicate employee IDs. They have been renamed to maintain data integrity.`);
  }
  if (emptyIdCount > 0) {
    warnings.push(`Found ${emptyIdCount} records with missing Employee IDs. Temporary IDs have been generated for them.`);
  }

  return { records, warnings };
}
