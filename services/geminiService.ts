import { GoogleGenerativeAI } from '@google/generative-ai';
import { HRMetrics, ColumnMapping, ColumnSuggestion, HRField } from '../types/hr';

// Retrieve Gemini API key from local storage
export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('hr_analytics_gemini_api_key') || '';
}

// Store Gemini API key in local storage
export function storeApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('hr_analytics_gemini_api_key', key);
}

// Clear Gemini API key
export function clearApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('hr_analytics_gemini_api_key');
}

/**
 * Initialize Gemini Client
 */
function getGeminiClient(customKey?: string): GoogleGenerativeAI {
  const key = customKey || getStoredApiKey();
  if (!key) {
    throw new Error('Gemini API key is not configured. Please add your key in the settings.');
  }
  return new GoogleGenerativeAI(key);
}

/**
 * Helper to dynamically get a valid model name for the provided API key
 */
async function getValidModelName(apiKey: string): Promise<string> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return 'gemini-1.5-flash'; // Fallback if list fails
    const data = await res.json();
    if (data.models && Array.isArray(data.models)) {
      const validModels = data.models.filter((m: any) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        m.name.includes('gemini') &&
        !m.name.includes('vision')
      );
      if (validModels.length > 0) {
        // Prefer 1.5 flash, then 1.5 pro, then fallback to anything available
        const flash15 = validModels.find((m: any) => m.name.includes('gemini-1.5-flash'));
        if (flash15) return flash15.name.replace('models/', '');
        const pro15 = validModels.find((m: any) => m.name.includes('gemini-1.5-pro'));
        if (pro15) return pro15.name.replace('models/', '');
        return validModels[0].name.replace('models/', '');
      }
    }
  } catch (e) {
    console.error('Model auto-discovery failed', e);
  }
  return 'gemini-1.5-flash';
}

/**
 * 1. AI Column Mapping Suggestion
 */
export async function suggestColumnMapping(
  headers: string[],
  sampleRows: Record<string, any>[],
  apiKey?: string
): Promise<{ mapping: Partial<ColumnMapping>; suggestions: ColumnSuggestion[] }> {
  const genAI = getGeminiClient(apiKey);
  const actualKey = apiKey || getStoredApiKey();
  const modelName = await getValidModelName(actualKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' }
  });

  const standardFields = [
    { field: 'id', desc: 'Employee ID, Unique identifier' },
    { field: 'name', desc: 'Employee Name, Full name' },
    { field: 'gender', desc: 'Gender (e.g. Male, Female, Other)' },
    { field: 'age', desc: 'Age in years' },
    { field: 'department', desc: 'Department name' },
    { field: 'division', desc: 'Division name' },
    { field: 'businessUnit', desc: 'Business Unit name' },
    { field: 'position', desc: 'Position, job title' },
    { field: 'level', desc: 'Employment level (e.g. Junior, Senior, Director)' },
    { field: 'manager', desc: 'Manager name or manager ID' },
    { field: 'joinDate', desc: 'Date of joining, hiring date' },
    { field: 'resignDate', desc: 'Date of resignation, termination date' },
    { field: 'employmentStatus', desc: 'Status (e.g. Active, Resigned, Full-time, Contract)' },
    { field: 'salary', desc: 'Salary, monthly wage, base pay' },
    { field: 'allowance', desc: 'Allowance, bonuses, benefits' },
    { field: 'performanceRating', desc: 'Performance rating score (e.g., 1-5 scale, Excellent/Poor)' },
    { field: 'trainingHours', desc: 'Training hours completed' },
    { field: 'trainingCost', desc: 'Cost of training' },
    { field: 'promotion', desc: 'Promoted in current period (e.g. Yes/No, true/false, 1/0)' },
    { field: 'absence', desc: 'Number of absence days' },
    { field: 'leaveDays', desc: 'Number of leave days taken' },
    { field: 'location', desc: 'Office location, branch, city' }
  ];

  const prompt = `
You are an expert HR Data Engineer. Analyze the following columns from an uploaded Excel file, along with a few sample rows.
Map each standard HR field to the most appropriate column header from the Excel sheet.

Standard HR fields:
${JSON.stringify(standardFields, null, 2)}

Excel Headers to map:
${JSON.stringify(headers)}

Sample Data (first 3 rows):
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

Instructions:
1. Provide a matching suggestion for each of the standard HR fields.
2. If an Excel header does not match a field, or if a field is not present in the spreadsheet, return matchedHeader: "" and confidence: "none".
3. Return the response strictly as a JSON object of this structure:
{
  "mapping": {
    "id": "matched_header_or_empty_string",
    "name": "matched_header_or_empty_string",
    ...
  },
  "suggestions": [
    {
      "field": "id",
      "matchedHeader": "matched_header_or_empty_string",
      "confidence": "high" | "medium" | "low" | "none",
      "reason": "Short explanation of the match based on header name and sample data"
    },
    ...
  ]
}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  try {
    const data = JSON.parse(text);
    return {
      mapping: data.mapping,
      suggestions: data.suggestions
    };
  } catch (err) {
    console.error('Failed to parse column mapping JSON from Gemini:', text, err);
    throw new Error('Gemini response format was invalid.');
  }
}

/**
 * 2. Generate Executive Insights and SWOT Analysis
 */
export async function generateExecutiveInsights(
  metrics: HRMetrics,
  apiKey?: string
): Promise<string> {
  const genAI = getGeminiClient(apiKey);
  const actualKey = apiKey || getStoredApiKey();
  const modelName = await getValidModelName(actualKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Clean metrics representation for prompt size
  const summaryMetrics = {
    headcount: metrics.headcount,
    activeCount: metrics.activeCount,
    resignedCount: metrics.resignedCount,
    turnoverRate: `${metrics.turnoverRate}%`,
    retentionRate: `${metrics.retentionRate}%`,
    averageAge: metrics.averageAge,
    averageSalary: metrics.averageSalary,
    medianSalary: metrics.medianSalary,
    averageTenure: `${metrics.averageTenure} years`,
    averageTrainingHours: metrics.averageTrainingHours,
    trainingCostPerEmployee: metrics.trainingCostPerEmployee,
    promotionRate: `${metrics.promotionRate}%`,
    absenteeismRate: `${metrics.absenteeismRate} days/emp`,
    averageLeaveDays: metrics.averageLeaveDays,
    genderRatio: metrics.genderRatio,
    topDepartmentsByPerformance: metrics.topDepartmentsByPerformance,
    bottomDepartmentsByPerformance: metrics.bottomDepartmentsByPerformance,
    departmentTurnover: Object.keys(metrics.departmentTurnover).map(d => ({
      department: d,
      resigned: metrics.departmentTurnover[d].resigned,
      total: metrics.departmentTurnover[d].total,
      rate: `${metrics.departmentTurnover[d].rate}%`
    }))
  };

  const prompt = `
You are a Senior HR Analytics Expert and Strategic Advisor. Review the following summarized HR metrics for an organization:

${JSON.stringify(summaryMetrics, null, 2)}

Generate a comprehensive Executive HR Analytics Dashboard Report in Markdown format. The report must contain these exact sections:

# Executive Insights Report

## Executive Summary
Provide a high-level summary of the organizational health based on headcount, active vs resigned, and general stats.

## Key Insights
Provide 3-5 major takeaways from this dataset (e.g. core strengths or warning signals).

## Positive Trends
Detail what is working well (e.g. retention, training investment, or high performance in certain departments).

## Negative Trends
Detail areas of concern (e.g. high turnover departments, absenteeism issues, or low promotion rates).

## Attrition Risk
Analyze which departments or roles are at highest risk of turnover, why, and what the metrics show.

## Department Analysis
Briefly analyze department performance and headcount distribution.

## Salary Analysis
Comment on average vs median salary, salary equity, and salary distributions.

## Training Effectiveness
Assess if the training hours and costs are yielding positive performance or retention outcomes.

## SWOT Analysis
Create a SWOT grid representing:
- Strengths
- Weaknesses
- Opportunities
- Threats

## Recommendations
Provide 4 actionable, data-driven recommendations.

## Future HR Strategy
Outline a mid-to-long term talent strategy based on these findings.

## Executive Action Plan
Provide a concrete step-by-step checklist of immediate next steps for the CHRO.

Format output cleanly in Markdown, using tables, bullet points, and headings. Be professional, direct, and strategic.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * 3. Generate Board-ready HR Strategic Report
 */
export async function generateBoardReport(
  metrics: HRMetrics,
  apiKey?: string
): Promise<string> {
  const genAI = getGeminiClient(apiKey);
  const actualKey = apiKey || getStoredApiKey();
  const modelName = await getValidModelName(actualKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Clean metrics for prompt
  const summaryMetrics = {
    headcount: metrics.headcount,
    activeCount: metrics.activeCount,
    resignedCount: metrics.resignedCount,
    turnoverRate: `${metrics.turnoverRate}%`,
    retentionRate: `${metrics.retentionRate}%`,
    averageAge: metrics.averageAge,
    averageSalary: metrics.averageSalary,
    averageTenure: `${metrics.averageTenure} years`,
    averageTrainingHours: metrics.averageTrainingHours,
    trainingCostPerEmployee: metrics.trainingCostPerEmployee,
    promotionRate: `${metrics.promotionRate}%`,
    absenteeismRate: `${metrics.absenteeismRate} days/emp`,
    averageLeaveDays: metrics.averageLeaveDays,
    genderRatio: metrics.genderRatio,
    departmentHeadcount: metrics.departmentHeadcount,
    topDepartmentsByPerformance: metrics.topDepartmentsByPerformance,
    bottomDepartmentsByPerformance: metrics.bottomDepartmentsByPerformance,
    locationDistribution: metrics.locationDistribution,
    levelDistribution: metrics.levelDistribution
  };

  const prompt = `
You are a Senior Strategic HR Consultant. Write a formal, detailed "Annual Board HR Strategic Report" for the Board of Directors. 

Use the following HR metadata:
${JSON.stringify(summaryMetrics, null, 2)}

The report should be extensive, professional, and contain these specific sections:
# Board of Directors - HR Strategic Report

## Executive Summary
A formal summary of the workforce size, active headcount, overall turnover rate, and strategic alignment of human capital.

## Key Metrics
Present a structured markdown table of the key KPIs (Headcount, Turnover, Average Salary, Avg Age, Tenure, Training Hours, Promotion Rate, Absence Rate).

## Charts Summary
An analytical walkthrough explaining the findings of the charts (headcount by department, gender split, performance curves, and salary distribution).

## Department Analysis
In-depth review of department structures, identifying largest departments, understaffed locations, and operational divisions.

## Attrition Analysis
Deep dive into why staff are resigning, highlight the turnover rates by department, and estimate the impact of turnover.

## Performance Analysis
Analyze the rating curves, top-performing vs bottom-performing divisions, and how performance correlates with roles.

## Salary Analysis
Analyze the pay bands, average vs median salary, and potential compensation compression or equity gaps.

## Training Analysis
Evaluate the ROI of training budgets ($${metrics.totalTrainingCost.toLocaleString()} total spent) relative to hours completed.

## Promotion Analysis
Address the promotion rate (${metrics.promotionRate}%) and its implications on talent pathing and career development.

## Recommendations
Strategic suggestions for the executive leadership.

## Strategic Actions
Immediate items to execute over the next 12 months.

## Conclusion
A summary of the organization's workforce outlook.

Make the language extremely professional, analytical, and board-ready. Avoid generic filler. Cite the actual numbers in the prompt.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * 4. Chat Q&A QA Chatbot
 */
export async function askGeminiAboutHR(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  userQuestion: string,
  metrics: HRMetrics,
  apiKey?: string
): Promise<string> {
  const genAI = getGeminiClient(apiKey);
  const actualKey = apiKey || getStoredApiKey();
  const modelName = await getValidModelName(actualKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  // Clean metrics for context
  const contextMetrics = {
    headcount: metrics.headcount,
    activeCount: metrics.activeCount,
    resignedCount: metrics.resignedCount,
    turnoverRate: `${metrics.turnoverRate}%`,
    retentionRate: `${metrics.retentionRate}%`,
    averageAge: metrics.averageAge,
    averageSalary: metrics.averageSalary,
    medianSalary: metrics.medianSalary,
    averageTenure: `${metrics.averageTenure} years`,
    averageTrainingHours: metrics.averageTrainingHours,
    trainingCostPerEmployee: metrics.trainingCostPerEmployee,
    promotionRate: `${metrics.promotionRate}%`,
    absenteeismRate: `${metrics.absenteeismRate} days/emp`,
    averageLeaveDays: metrics.averageLeaveDays,
    genderRatio: metrics.genderRatio,
    departmentHeadcount: metrics.departmentHeadcount,
    topDepartmentsByPerformance: metrics.topDepartmentsByPerformance,
    bottomDepartmentsByPerformance: metrics.bottomDepartmentsByPerformance,
    locationDistribution: metrics.locationDistribution,
    levelDistribution: metrics.levelDistribution,
    statusDistribution: metrics.statusDistribution
  };

  const formattedHistory = chatHistory.map(h => `${h.role === 'user' ? 'User' : 'HR Assistant'}: ${h.content}`).join('\n');

  const prompt = `
You are an HR Analytics AI assistant. You help HR managers analyze their employee dataset based on the following computed metrics:

${JSON.stringify(contextMetrics, null, 2)}

Here is the conversation history:
${formattedHistory}

User: ${userQuestion}

Instructions:
- Provide a direct, professional, and clear answer based strictly on the provided HR metrics.
- If the question asks for details not present in the metrics (such as individual names or specific details of a particular employee not captured in the averages), state clearly that the aggregated dashboard data does not contain that detail, but answer as best as you can with the metrics.
- Keep the answer concise (2-4 paragraphs max) and focus on providing value-added HR insights.
- Do not make up figures. Use the provided metrics.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
