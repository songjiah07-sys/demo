export interface EmployeeRecord {
  id: string;
  name: string;
  gender: string;
  age: number;
  department: string;
  division: string;
  businessUnit: string;
  position: string;
  level: string;
  manager: string;
  joinDate: Date | null;
  resignDate: Date | null;
  employmentStatus: string;
  salary: number;
  allowance: number;
  performanceRating: number; // parsed to numerical representation (e.g. 1-5 scale)
  trainingHours: number;
  trainingCost: number;
  promotion: boolean;
  absence: number; // number of absence days
  leaveDays: number; // number of leaves taken
  location: string;
  // Hold any extra custom columns that weren't mapped
  extraColumns?: Record<string, any>;
}

export type HRField = keyof Omit<EmployeeRecord, 'extraColumns'>;

export interface ColumnMapping {
  id: string;
  name: string;
  gender: string;
  age: string;
  department: string;
  division: string;
  businessUnit: string;
  position: string;
  level: string;
  manager: string;
  joinDate: string;
  resignDate: string;
  employmentStatus: string;
  salary: string;
  allowance: string;
  performanceRating: string;
  trainingHours: string;
  trainingCost: string;
  promotion: string;
  absence: string;
  leaveDays: string;
  location: string;
}

export interface FilterState {
  departments: string[];
  locations: string[];
  genders: string[];
  employmentStatuses: string[];
  performanceRatings: number[];
  businessUnits: string[];
  managers: string[];
  levels: string[];
  ageRange: [number, number];
  salaryRange: [number, number];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
}

export interface TrendPoint {
  dateStr: string; // "YYYY-MM"
  joiners: number;
  leavers: number;
  headcount: number;
}

export interface HRMetrics {
  headcount: number;
  activeCount: number;
  resignedCount: number;
  turnoverRate: number; // percentage
  retentionRate: number; // percentage
  averageAge: number;
  genderRatio: {
    male: number;
    female: number;
    other: number;
    malePercentage: number;
    femalePercentage: number;
  };
  averageSalary: number;
  medianSalary: number;
  averageTenure: number; // in years
  averageTrainingHours: number;
  totalTrainingCost: number;
  trainingCostPerEmployee: number;
  promotionRate: number; // percentage
  absenteeismRate: number; // average absence days per employee
  averageLeaveDays: number;
  
  // Categorical distributions (for charts)
  departmentHeadcount: Record<string, number>;
  genderByDepartment: Record<string, { male: number; female: number; other: number }>;
  genderDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  performanceDistribution: Record<number, number>;
  salaryDistribution: { range: string; count: number }[];
  positionDistribution: Record<string, number>;
  levelDistribution: Record<string, number>;
  locationDistribution: Record<string, number>;
  
  // Department ranking
  departmentPerformance: Record<string, { totalRating: number; count: number; avgRating: number }>;
  departmentTurnover: Record<string, { resigned: number; total: number; rate: number }>;
  topDepartmentsByPerformance: { department: string; avgRating: number }[];
  bottomDepartmentsByPerformance: { department: string; avgRating: number }[];
  
  // Trends
  hiringTrend: TrendPoint[];
  
  // Scatter & relationships
  salaryVsPerformance: { name: string; salary: number; performance: number; department: string }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ColumnSuggestion {
  field: HRField;
  matchedHeader: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
}
