import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } from 'docx';
import pptxgen from 'pptxgenjs';
import { EmployeeRecord, HRMetrics } from '../types/hr';

// ─── 1. Export Data to Excel ────────────────────────────────
export function exportToExcel(records: EmployeeRecord[], fileName = 'HR_Analytics_Data.xlsx') {
  const dataToExport = records.map(r => ({
    'Employee ID': r.id,
    'Employee Name': r.name,
    'Gender': r.gender,
    'Age': r.age,
    'Department': r.department,
    'Division': r.division,
    'Business Unit': r.businessUnit,
    'Position': r.position,
    'Level': r.level,
    'Manager': r.manager,
    'Join Date': r.joinDate ? r.joinDate.toISOString().split('T')[0] : 'N/A',
    'Resign Date': r.resignDate ? r.resignDate.toISOString().split('T')[0] : 'N/A',
    'Employment Status': r.employmentStatus,
    'Salary ($)': r.salary,
    'Allowance ($)': r.allowance,
    'Performance Rating': r.performanceRating,
    'Training Hours': r.trainingHours,
    'Training Cost ($)': r.trainingCost,
    'Promotion': r.promotion ? 'Yes' : 'No',
    'Absence Days': r.absence,
    'Leave Days Taken': r.leaveDays,
    'Location': r.location
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Data');
  XLSX.writeFile(workbook, fileName);
}

// ─── 2. Export HTML Element → PDF ───────────────────────────
export async function exportElementToPdf(elementId: string, fileName = 'HR_Analytics_Dashboard.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#0a0a0a'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
  }
}

// ─── 3. Export HTML Element → PNG ───────────────────────────
export async function exportElementToPng(elementId: string, fileName = 'HR_Dashboard_Snapshot.png') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#0a0a0a'
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = fileName;
    link.click();
  } catch (error) {
    console.error('Failed to capture PNG snapshot:', error);
  }
}

// ─── Helper: create a simple table cell ─────────────────────
const makeCell = (text: string, bold = false) =>
  new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })]
      })
    ]
  });

// ─── 4. Export Word Document (.docx) ────────────────────────
export async function exportToWord(metrics: HRMetrics, recordsCount: number, fileName = 'HR_Strategic_Analysis.docx') {
  const kpiTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          makeCell('HR Indicator', true),
          makeCell('Value', true),
          makeCell('Description', true)
        ]
      }),
      new TableRow({
        children: [
          makeCell('Total Headcount'),
          makeCell(String(metrics.headcount)),
          makeCell('Total size of surveyed workforce')
        ]
      }),
      new TableRow({
        children: [
          makeCell('Turnover Rate'),
          makeCell(`${metrics.turnoverRate}%`),
          makeCell('Resignations relative to total headcount')
        ]
      }),
      new TableRow({
        children: [
          makeCell('Retention Rate'),
          makeCell(`${metrics.retentionRate}%`),
          makeCell('Active employees ratio')
        ]
      }),
      new TableRow({
        children: [
          makeCell('Average Tenure'),
          makeCell(`${metrics.averageTenure} years`),
          makeCell('Average length of employment')
        ]
      }),
      new TableRow({
        children: [
          makeCell('Average Salary'),
          makeCell(metrics.averageSalary.toLocaleString('en-US', { style: 'currency', currency: 'USD' })),
          makeCell('Mean salary calculated')
        ]
      }),
      new TableRow({
        children: [
          makeCell('Training Hours'),
          makeCell(`${metrics.averageTrainingHours} hrs/emp`),
          makeCell('Training hours completed per employee')
        ]
      })
    ]
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'HR STRATEGIC METRICS & REPORT', bold: true, size: 32, color: '4F46E5' })
            ],
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Generated for dataset containing ${recordsCount} employees.`, italics: true })
            ],
            spacing: { after: 400 }
          }),
          new Paragraph({
            children: [new TextRun({ text: '1. Executive HR Metrics Key Indicators', bold: true, size: 24 })],
            spacing: { after: 200, before: 200 }
          }),
          kpiTable,
          new Paragraph({
            children: [new TextRun({ text: '2. Department Performance Rankings', bold: true, size: 24 })],
            spacing: { after: 200, before: 400 }
          }),
          ...metrics.topDepartmentsByPerformance.map((dept, idx) =>
            new Paragraph({ text: `• Top #${idx + 1}: ${dept.department} (Avg Rating: ${dept.avgRating})` })
          ),
          ...metrics.bottomDepartmentsByPerformance.map((dept, idx) =>
            new Paragraph({ text: `• Bottom #${idx + 1}: ${dept.department} (Avg Rating: ${dept.avgRating})` })
          ),
          new Paragraph({
            children: [new TextRun({ text: '3. Training & Development Summary', bold: true, size: 24 })],
            spacing: { after: 200, before: 400 }
          }),
          new Paragraph({
            text: `Total training spend: $${metrics.totalTrainingCost.toLocaleString()}. Average: $${metrics.trainingCostPerEmployee.toLocaleString()}/employee. Average training hours: ${metrics.averageTrainingHours}. Promotion rate: ${metrics.promotionRate}%.`
          }),
          new Paragraph({
            children: [new TextRun({ text: '4. Absenteeism and Leave Analysis', bold: true, size: 24 })],
            spacing: { after: 200, before: 400 }
          }),
          new Paragraph({
            text: `Average leave taken: ${metrics.averageLeaveDays} days. Absenteeism rate: ${metrics.absenteeismRate} unexcused days per employee.`
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBlob(doc);
  const url = URL.createObjectURL(buffer);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── 5. Export PowerPoint (.pptx) ───────────────────────────
export function exportToPptx(metrics: HRMetrics, recordsCount: number, fileName = 'HR_Analytics_Presentation.pptx') {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  // ── Slide 1: Title ─────────────────
  const s1 = pptx.addSlide();
  s1.background = { fill: '17171b' };
  s1.addText('HR Executive Analytics Dashboard', {
    x: 1, y: 2.2, w: 8, h: 1.2,
    fontSize: 36, bold: true, color: 'ffffff', fontFace: 'Arial'
  });
  s1.addText(`Board-ready insights for ${recordsCount.toLocaleString()} employees`, {
    x: 1, y: 3.5, w: 8, h: 0.5,
    fontSize: 16, color: 'a78bfa', fontFace: 'Arial'
  });

  // ── Slide 2: Key Metrics Table ─────
  const s2 = pptx.addSlide();
  s2.background = { fill: 'ffffff' };
  s2.addText('Key HR Performance Metrics', {
    x: 0.5, y: 0.4, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: '4F46E5'
  });

  // pptxgenjs table rows must be arrays of cell objects
  const pptxRows: pptxgen.TableRow[] = [
    [
      { text: 'Indicator', options: { bold: true, fill: { color: '4F46E5' }, color: 'ffffff' } },
      { text: 'Value',     options: { bold: true, fill: { color: '4F46E5' }, color: 'ffffff' } },
      { text: 'Notes',     options: { bold: true, fill: { color: '4F46E5' }, color: 'ffffff' } }
    ],
    [
      { text: 'Total Headcount' }, { text: String(metrics.headcount) }, { text: 'Total surveyed workforce' }
    ],
    [
      { text: 'Turnover Rate' }, { text: `${metrics.turnoverRate}%` }, { text: 'Percentage resigned' }
    ],
    [
      { text: 'Retention Rate' }, { text: `${metrics.retentionRate}%` }, { text: 'Percentage active' }
    ],
    [
      { text: 'Average Salary' },
      { text: metrics.averageSalary.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) },
      { text: 'Average base pay' }
    ],
    [
      { text: 'Average Tenure' }, { text: `${metrics.averageTenure} yrs` }, { text: 'Duration with company' }
    ],
    [
      { text: 'Training Hrs/Emp' }, { text: `${metrics.averageTrainingHours} hrs` }, { text: 'Average learning' }
    ]
  ];

  s2.addTable(pptxRows, {
    x: 0.5, y: 1.2, w: 9, h: 4.5,
    fontSize: 12,
    border: { type: 'solid', pt: 1, color: 'e2e8f0' }
  });

  // ── Slide 3: Department Rankings ───
  const s3 = pptx.addSlide();
  s3.background = { fill: '17171b' };
  s3.addText('Department Performance', {
    x: 0.5, y: 0.4, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: 'ffffff'
  });

  const topText  = metrics.topDepartmentsByPerformance.map((d, i) => `#${i + 1}  ${d.department} (Avg: ${d.avgRating})`).join('\n');
  const botText  = metrics.bottomDepartmentsByPerformance.map((d, i) => `#${i + 1}  ${d.department} (Avg: ${d.avgRating})`).join('\n');

  s3.addText('Top Departments', { x: 0.5, y: 1.5, w: 4.5, h: 0.5, fontSize: 18, bold: true, color: '34d399' });
  s3.addText(topText, { x: 0.5, y: 2.2, w: 4.5, h: 3, fontSize: 14, color: 'ffffff', bullet: true });

  s3.addText('Needs Improvement', { x: 5.5, y: 1.5, w: 4, h: 0.5, fontSize: 18, bold: true, color: 'f87171' });
  s3.addText(botText, { x: 5.5, y: 2.2, w: 4, h: 3, fontSize: 14, color: 'ffffff', bullet: true });

  // ── Slide 4: Recommendations ───────
  const s4 = pptx.addSlide();
  s4.background = { fill: 'ffffff' };
  s4.addText('Strategic Recommendations', {
    x: 0.5, y: 0.4, w: 9, h: 0.5,
    fontSize: 24, bold: true, color: '4F46E5'
  });

  const bullets = [
    `Address retention in departments exceeding benchmark. Overall turnover: ${metrics.turnoverRate}%.`,
    `Optimize $${metrics.totalTrainingCost.toLocaleString()} training budget toward high-attrition areas.`,
    `Audit salary bands to address compression. Average: ${metrics.averageSalary.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`,
    `Implement wellness programs to reduce absenteeism of ${metrics.absenteeismRate} days/employee.`
  ].join('\n\n');

  s4.addText(bullets, { x: 0.5, y: 1.5, w: 9, h: 4.5, fontSize: 14, color: '1e293b', bullet: true });

  pptx.writeFile({ fileName });
}
