import { EmployeeRecord, HRMetrics, TrendPoint } from '../types/hr';

/**
 * Calculates median value of an array of numbers
 */
function calculateMedian(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[half];
  }
  return (sorted[half - 1] + sorted[half]) / 2.0;
}

/**
 * Calculates the tenure of an employee in years
 */
export function calculateTenure(record: EmployeeRecord, referenceDate: Date = new Date()): number {
  if (!record.joinDate) return 0;
  const end = record.resignDate || referenceDate;
  const diffTime = Math.max(0, end.getTime() - record.joinDate.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Number((diffDays / 365.25).toFixed(2));
}

/**
 * Compute all HR metrics and distributions from a list of records
 */
export function calculateHRMetrics(records: EmployeeRecord[]): HRMetrics {
  const headcount = records.length;
  
  if (headcount === 0) {
    return {
      headcount: 0,
      activeCount: 0,
      resignedCount: 0,
      turnoverRate: 0,
      retentionRate: 0,
      averageAge: 0,
      genderRatio: { male: 0, female: 0, other: 0, malePercentage: 0, femalePercentage: 0 },
      averageSalary: 0,
      medianSalary: 0,
      averageTenure: 0,
      averageTrainingHours: 0,
      totalTrainingCost: 0,
      trainingCostPerEmployee: 0,
      promotionRate: 0,
      absenteeismRate: 0,
      averageLeaveDays: 0,
      departmentHeadcount: {},
      genderByDepartment: {},
      genderDistribution: {},
      statusDistribution: {},
      performanceDistribution: {},
      salaryDistribution: [],
      positionDistribution: {},
      levelDistribution: {},
      locationDistribution: {},
      departmentPerformance: {},
      departmentTurnover: {},
      topDepartmentsByPerformance: [],
      bottomDepartmentsByPerformance: [],
      hiringTrend: [],
      salaryVsPerformance: []
    };
  }

  // Active vs Resigned
  // An employee is resigned if status contains resigned/terminated/inactive/left or they have a resignDate
  let activeCount = 0;
  let resignedCount = 0;
  const referenceDate = new Date(); // Current date as baseline

  records.forEach(r => {
    const isResigned = r.resignDate !== null || 
                       ['resigned', 'terminated', 'inactive', 'left'].includes(r.employmentStatus.toLowerCase());
    if (isResigned) {
      resignedCount++;
    } else {
      activeCount++;
    }
  });

  const turnoverRate = Number(((resignedCount / headcount) * 100).toFixed(1));
  const retentionRate = Number(((activeCount / headcount) * 100).toFixed(1));

  // Averages (Age, Salary, Tenure, Training, Absence, Leave)
  let totalAge = 0;
  let totalSalary = 0;
  const salaries: number[] = [];
  let totalTenure = 0;
  let totalTrainingHours = 0;
  let totalTrainingCost = 0;
  let promotedCount = 0;
  let totalAbsence = 0;
  let totalLeaveDays = 0;

  records.forEach(r => {
    totalAge += r.age;
    totalSalary += r.salary;
    salaries.push(r.salary);
    totalTenure += calculateTenure(r, referenceDate);
    totalTrainingHours += r.trainingHours;
    totalTrainingCost += r.trainingCost;
    if (r.promotion) promotedCount++;
    totalAbsence += r.absence;
    totalLeaveDays += r.leaveDays;
  });

  const averageAge = Number((totalAge / headcount).toFixed(1));
  const averageSalary = Number((totalSalary / headcount).toFixed(2));
  const medianSalary = Number(calculateMedian(salaries).toFixed(2));
  const averageTenure = Number((totalTenure / headcount).toFixed(1));
  const averageTrainingHours = Number((totalTrainingHours / headcount).toFixed(1));
  const trainingCostPerEmployee = Number((totalTrainingCost / headcount).toFixed(2));
  const promotionRate = Number(((promotedCount / headcount) * 100).toFixed(1));
  const absenteeismRate = Number((totalAbsence / headcount).toFixed(1));
  const averageLeaveDays = Number((totalLeaveDays / headcount).toFixed(1));

  // Gender Distribution
  let maleCount = 0;
  let femaleCount = 0;
  let otherGenderCount = 0;

  records.forEach(r => {
    const g = r.gender.toLowerCase();
    if (g.startsWith('m')) maleCount++;
    else if (g.startsWith('f')) femaleCount++;
    else otherGenderCount++;
  });

  const genderRatio = {
    male: maleCount,
    female: femaleCount,
    other: otherGenderCount,
    malePercentage: Number(((maleCount / headcount) * 100).toFixed(1)),
    femalePercentage: Number(((femaleCount / headcount) * 100).toFixed(1))
  };

  // Categorical Distributions
  const departmentHeadcount: Record<string, number> = {};
  const genderByDepartment: Record<string, { male: number; female: number; other: number }> = {};
  const genderDistribution: Record<string, number> = {};
  const statusDistribution: Record<string, number> = {};
  const performanceDistribution: Record<number, number> = {};
  const positionDistribution: Record<string, number> = {};
  const levelDistribution: Record<string, number> = {};
  const locationDistribution: Record<string, number> = {};

  // Salary Buckets
  // Determine bounds based on actual salaries in dataset
  const minSal = Math.min(...salaries);
  const maxSal = Math.max(...salaries);
  const bucketSize = (maxSal - minSal) / 6 || 20000;
  
  const salaryBuckets = [
    { range: `< $${Math.round((minSal + bucketSize) / 1000)}k`, count: 0, maxVal: minSal + bucketSize },
    { range: `$${Math.round((minSal + bucketSize) / 1000)}k - $${Math.round((minSal + bucketSize * 2) / 1000)}k`, count: 0, maxVal: minSal + bucketSize * 2 },
    { range: `$${Math.round((minSal + bucketSize * 2) / 1000)}k - $${Math.round((minSal + bucketSize * 3) / 1000)}k`, count: 0, maxVal: minSal + bucketSize * 3 },
    { range: `$${Math.round((minSal + bucketSize * 3) / 1000)}k - $${Math.round((minSal + bucketSize * 4) / 1000)}k`, count: 0, maxVal: minSal + bucketSize * 4 },
    { range: `$${Math.round((minSal + bucketSize * 4) / 1000)}k - $${Math.round((minSal + bucketSize * 5) / 1000)}k`, count: 0, maxVal: minSal + bucketSize * 5 },
    { range: `> $${Math.round((minSal + bucketSize * 5) / 1000)}k`, count: 0, maxVal: Infinity }
  ];

  // Department analyses
  const departmentPerformance: Record<string, { totalRating: number; count: number; avgRating: number }> = {};
  const departmentTurnover: Record<string, { resigned: number; total: number; rate: number }> = {};

  // Relationships
  const salaryVsPerformance: { name: string; salary: number; performance: number; department: string }[] = [];

  records.forEach(r => {
    // Dept Headcount
    departmentHeadcount[r.department] = (departmentHeadcount[r.department] || 0) + 1;

    // Gender by Dept
    if (!genderByDepartment[r.department]) {
      genderByDepartment[r.department] = { male: 0, female: 0, other: 0 };
    }
    const g = r.gender.toLowerCase();
    if (g.startsWith('m')) genderByDepartment[r.department].male++;
    else if (g.startsWith('f')) genderByDepartment[r.department].female++;
    else genderByDepartment[r.department].other++;

    // Gender Main
    const genderKey = r.gender.trim();
    genderDistribution[genderKey] = (genderDistribution[genderKey] || 0) + 1;

    // Status
    statusDistribution[r.employmentStatus] = (statusDistribution[r.employmentStatus] || 0) + 1;

    // Performance
    const perfKey = Math.round(r.performanceRating);
    performanceDistribution[perfKey] = (performanceDistribution[perfKey] || 0) + 1;

    // Salary Distribution Bucketing
    const matchedBucket = salaryBuckets.find(b => r.salary <= b.maxVal);
    if (matchedBucket) {
      matchedBucket.count++;
    }

    // Position, Level, Location
    positionDistribution[r.position] = (positionDistribution[r.position] || 0) + 1;
    levelDistribution[r.level] = (levelDistribution[r.level] || 0) + 1;
    locationDistribution[r.location] = (locationDistribution[r.location] || 0) + 1;

    // Performance by Dept
    if (!departmentPerformance[r.department]) {
      departmentPerformance[r.department] = { totalRating: 0, count: 0, avgRating: 0 };
    }
    departmentPerformance[r.department].totalRating += r.performanceRating;
    departmentPerformance[r.department].count += 1;

    // Turnover by Dept
    if (!departmentTurnover[r.department]) {
      departmentTurnover[r.department] = { resigned: 0, total: 0, rate: 0 };
    }
    departmentTurnover[r.department].total += 1;
    const isResigned = r.resignDate !== null || 
                       ['resigned', 'terminated', 'inactive', 'left'].includes(r.employmentStatus.toLowerCase());
    if (isResigned) {
      departmentTurnover[r.department].resigned += 1;
    }

    // Scatter relation
    salaryVsPerformance.push({
      name: r.name,
      salary: r.salary,
      performance: r.performanceRating,
      department: r.department
    });
  });

  // Calculate averages for departments
  Object.keys(departmentPerformance).forEach(dept => {
    const item = departmentPerformance[dept];
    item.avgRating = Number((item.totalRating / item.count).toFixed(2));
  });

  Object.keys(departmentTurnover).forEach(dept => {
    const item = departmentTurnover[dept];
    item.rate = Number(((item.resigned / item.total) * 100).toFixed(1));
  });

  // Sort department ratings for top/bottom
  const sortedDepts = Object.keys(departmentPerformance)
    .map(dept => ({ department: dept, avgRating: departmentPerformance[dept].avgRating }))
    .sort((a, b) => b.avgRating - a.avgRating);

  const topDepartmentsByPerformance = sortedDepts.slice(0, 3);
  const bottomDepartmentsByPerformance = [...sortedDepts].reverse().slice(0, 3);

  // Salary Distribution
  const salaryDistribution = salaryBuckets.map(b => ({ range: b.range, count: b.count }));

  // Trend Calculations (Double Line Trend of Joiners / Leavers and Cumulative Headcount)
  // Gather all dates and group them
  const monthlyData: Record<string, { joiners: number; leavers: number }> = {};
  
  records.forEach(r => {
    if (r.joinDate) {
      const joinStr = `${r.joinDate.getFullYear()}-${String(r.joinDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[joinStr]) monthlyData[joinStr] = { joiners: 0, leavers: 0 };
      monthlyData[joinStr].joiners += 1;
    }
    
    const isResigned = r.resignDate !== null || 
                       ['resigned', 'terminated', 'inactive', 'left'].includes(r.employmentStatus.toLowerCase());
    if (isResigned && r.resignDate) {
      const resignStr = `${r.resignDate.getFullYear()}-${String(r.resignDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[resignStr]) monthlyData[resignStr] = { joiners: 0, leavers: 0 };
      monthlyData[resignStr].leavers += 1;
    }
  });

  // Sort months chronologically
  const months = Object.keys(monthlyData).sort();

  let hiringTrend: TrendPoint[] = [];
  if (months.length > 0) {
    // Generate full monthly timeline between min and max months to avoid gaps
    const startParts = months[0].split('-');
    const endParts = months[months.length - 1].split('-');
    
    let curYear = parseInt(startParts[0]);
    let curMonth = parseInt(startParts[1]);
    const endYear = parseInt(endParts[0]);
    const endMonth = parseInt(endParts[1]);

    let runningHeadcount = 0;

    // To establish a starting running headcount, let's see how many joined before our window
    // (Actually, since we start at the earliest join date, the running headcount starts at 0 and climbs)
    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const dateStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;
      const data = monthlyData[dateStr] || { joiners: 0, leavers: 0 };
      
      runningHeadcount += data.joiners - data.leavers;
      // Headcount cannot be negative
      runningHeadcount = Math.max(0, runningHeadcount);

      hiringTrend.push({
        dateStr,
        joiners: data.joiners,
        leavers: data.leavers,
        headcount: runningHeadcount
      });

      // Increment month
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }
  }

  // Slice trend to last 24 months if it is too long to display nicely on a chart
  if (hiringTrend.length > 24) {
    hiringTrend = hiringTrend.slice(-24);
  }

  return {
    headcount,
    activeCount,
    resignedCount,
    turnoverRate,
    retentionRate,
    averageAge,
    genderRatio,
    averageSalary,
    medianSalary,
    averageTenure,
    averageTrainingHours,
    totalTrainingCost,
    trainingCostPerEmployee,
    promotionRate,
    absenteeismRate,
    averageLeaveDays,
    departmentHeadcount,
    genderByDepartment,
    genderDistribution,
    statusDistribution,
    performanceDistribution,
    salaryDistribution,
    positionDistribution,
    levelDistribution,
    locationDistribution,
    departmentPerformance,
    departmentTurnover,
    topDepartmentsByPerformance,
    bottomDepartmentsByPerformance,
    hiringTrend,
    salaryVsPerformance
  };
}
