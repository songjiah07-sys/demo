import { ColumnMapping, ColumnSuggestion, HRField } from '../types/hr';
import { suggestColumnMapping } from '../services/geminiService';

// Fallback regex matching mapping rules for HR attributes
const FALLBACK_RULES: Record<HRField, RegExp[]> = {
  id: [/employee.*id/i, /^id$/i, /emp.*id/i, /code/i, /staff.*id/i, /badge/i],
  name: [/name/i, /employee.*name/i, /full.*name/i, /staff.*name/i, /person/i],
  gender: [/gender/i, /sex/i, /m\/f/i],
  age: [/age/i, /dob/i, /birth/i, /year.*of.*birth/i],
  department: [/department/i, /^dept$/i, /dep$/i, /division/i, /unit/i],
  division: [/division/i, /sub.*dept/i, /segment/i],
  businessUnit: [/business.*unit/i, /^bu$/i, /unit/i, /branch/i],
  position: [/position/i, /job.*title/i, /role/i, /title/i, /designation/i],
  level: [/level/i, /grade/i, /rank/i, /band/i, /class/i],
  manager: [/manager/i, /supervisor/i, /report.*to/i, /lead/i],
  joinDate: [/join.*date/i, /hire.*date/i, /start.*date/i, /date.*joined/i, /hired/i],
  resignDate: [/resign.*date/i, /resign/i, /termination.*date/i, /date.*left/i, /end.*date/i],
  employmentStatus: [/status/i, /employment.*status/i, /active/i, /state/i],
  salary: [/salary/i, /wage/i, /pay/i, /base.*pay/i, /compensation/i],
  allowance: [/allowance/i, /bonus/i, /benefit/i, /incentive/i],
  performanceRating: [/performance/i, /rating/i, /perf/i, /review/i, /score/i],
  trainingHours: [/training.*hours/i, /train.*hours/i, /learning.*hours/i],
  trainingCost: [/training.*cost/i, /train.*cost/i, /training.*expense/i],
  promotion: [/promotion/i, /promoted/i, /promo/i],
  absence: [/absence/i, /absent/i, /no.*show/i, /unexcused/i],
  leaveDays: [/leave.*days/i, /leaves/i, /vacation/i, /annual.*leave/i],
  location: [/location/i, /branch/i, /office/i, /city/i, /site/i, /region/i]
};

/**
 * Fuzzy matches headers using regex fallback rules
 */
export function fuzzyMatchHeaders(headers: string[]): ColumnMapping {
  const mapping: Partial<ColumnMapping> = {};
  const matchedHeaders = new Set<string>();

  // Helper to find a match for a field
  const findMatch = (field: HRField): string => {
    const rules = FALLBACK_RULES[field];
    
    // First pass: look for exact/strong regex match
    for (const rule of rules) {
      for (const header of headers) {
        if (matchedHeaders.has(header)) continue;
        if (rule.test(header.trim())) {
          matchedHeaders.add(header);
          return header;
        }
      }
    }

    // Second pass: relaxed check (substring contains)
    for (const header of headers) {
      if (matchedHeaders.has(header)) continue;
      const lowerHeader = header.toLowerCase().trim();
      const match = rules.some(rule => {
        // Create a simple string search version of the regex pattern
        const patternStr = rule.source.replace(/[\/\^$]/g, '').replace('.*', '');
        return lowerHeader.includes(patternStr.toLowerCase());
      });
      if (match) {
        matchedHeaders.add(header);
        return header;
      }
    }

    return '';
  };

  // Run matching in order of priority (ID and Name first, then others)
  const fieldsOrder: HRField[] = [
    'id', 'name', 'department', 'salary', 'joinDate', 'employmentStatus', 
    'gender', 'age', 'position', 'level', 'location', 'manager', 
    'resignDate', 'performanceRating', 'trainingHours', 'trainingCost', 
    'promotion', 'absence', 'leaveDays', 'allowance', 'division', 'businessUnit'
  ];

  fieldsOrder.forEach(field => {
    mapping[field] = findMatch(field);
  });

  return mapping as ColumnMapping;
}

/**
 * Perform header mapping, calling Gemini if API key is present, otherwise falling back
 */
export async function getColumnMapping(
  headers: string[],
  sampleRows: Record<string, any>[],
  apiKey?: string
): Promise<{ mapping: ColumnMapping; suggestions: ColumnSuggestion[] }> {
  
  if (apiKey) {
    try {
      const result = await suggestColumnMapping(headers, sampleRows, apiKey);
      
      // Ensure all fields have at least a string key (even if empty) to satisfy ColumnMapping interface
      const fields: HRField[] = [
        'id', 'name', 'gender', 'age', 'department', 'division', 'businessUnit',
        'position', 'level', 'manager', 'joinDate', 'resignDate', 'employmentStatus',
        'salary', 'allowance', 'performanceRating', 'trainingHours', 'trainingCost',
        'promotion', 'absence', 'leaveDays', 'location'
      ];
      
      const completeMapping: Partial<ColumnMapping> = { ...result.mapping };
      fields.forEach(field => {
        if (!completeMapping[field]) {
          completeMapping[field] = '';
        }
      });

      return {
        mapping: completeMapping as ColumnMapping,
        suggestions: result.suggestions
      };
    } catch (err) {
      console.warn('Gemini mapping failed, falling back to rules-based:', err);
    }
  }

  // Fallback matching
  const fallbackMapping = fuzzyMatchHeaders(headers);
  const suggestions: ColumnSuggestion[] = Object.keys(fallbackMapping).map(key => {
    const field = key as HRField;
    const header = fallbackMapping[field];
    return {
      field,
      matchedHeader: header,
      confidence: header ? 'medium' : 'none',
      reason: header ? 'Matched via fallback rule fuzzy keyword search.' : 'No match found in fallback rules.'
    };
  });

  return {
    mapping: fallbackMapping,
    suggestions
  };
}
