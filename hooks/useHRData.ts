import { useState, useMemo, useEffect } from 'react';
import { ColumnMapping, EmployeeRecord, FilterState, HRMetrics } from '../types/hr';
import { calculateHRMetrics } from '../utils/hrCalculations';
import { mapRawDataToHRRecords } from '../utils/excelParser';

const initialFilterState: FilterState = {
  departments: [],
  locations: [],
  genders: [],
  employmentStatuses: [],
  performanceRatings: [],
  businessUnits: [],
  managers: [],
  levels: [],
  ageRange: [18, 65],
  salaryRange: [0, 500000],
  dateRange: { start: null, end: null },
  searchQuery: ''
};

export function useHRData() {
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  
  // Track system ranges based on dataset
  const [dataAgeBounds, setDataAgeBounds] = useState<[number, number]>([18, 65]);
  const [dataSalaryBounds, setDataSalaryBounds] = useState<[number, number]>([0, 500000]);

  // Map raw data when mapping changes
  useEffect(() => {
    if (rawRows.length > 0 && mapping) {
      const { records: mapped, warnings: mapWarnings } = mapRawDataToHRRecords(rawRows, mapping);
      setRecords(mapped);
      setWarnings(mapWarnings);
      
      // Auto-compute filter ranges from full dataset
      if (mapped.length > 0) {
        const ages = mapped.map(r => r.age);
        const salaries = mapped.map(r => r.salary);
        const minAge = Math.min(...ages);
        const maxAge = Math.max(...ages);
        const minSal = Math.min(...salaries);
        const maxSal = Math.max(...salaries);
        
        setDataAgeBounds([minAge, maxAge]);
        setDataSalaryBounds([minSal, maxSal]);
        
        // Reset filters with the new bounds
        setFilters(prev => ({
          ...prev,
          ageRange: [minAge, maxAge],
          salaryRange: [minSal, maxSal]
        }));
      }
    } else {
      setRecords([]);
      setWarnings([]);
    }
  }, [rawRows, mapping]);

  // Compute unique values in the dataset for filtering drop downs
  const filterOptions = useMemo(() => {
    const opts = {
      departments: new Set<string>(),
      locations: new Set<string>(),
      genders: new Set<string>(),
      employmentStatuses: new Set<string>(),
      businessUnits: new Set<string>(),
      managers: new Set<string>(),
      levels: new Set<string>()
    };

    records.forEach(r => {
      if (r.department) opts.departments.add(r.department);
      if (r.location) opts.locations.add(r.location);
      if (r.gender) opts.genders.add(r.gender);
      if (r.employmentStatus) opts.employmentStatuses.add(r.employmentStatus);
      if (r.businessUnit) opts.businessUnits.add(r.businessUnit);
      if (r.manager) opts.managers.add(r.manager);
      if (r.level) opts.levels.add(r.level);
    });

    return {
      departments: Array.from(opts.departments).sort(),
      locations: Array.from(opts.locations).sort(),
      genders: Array.from(opts.genders).sort(),
      employmentStatuses: Array.from(opts.employmentStatuses).sort(),
      businessUnits: Array.from(opts.businessUnits).sort(),
      managers: Array.from(opts.managers).sort(),
      levels: Array.from(opts.levels).sort()
    };
  }, [records]);

  // Filter records in real-time
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search text (Name or ID)
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesId = r.id.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      // Dropdowns
      if (filters.departments.length > 0 && !filters.departments.includes(r.department)) return false;
      if (filters.locations.length > 0 && !filters.locations.includes(r.location)) return false;
      if (filters.genders.length > 0 && !filters.genders.includes(r.gender)) return false;
      if (filters.employmentStatuses.length > 0 && !filters.employmentStatuses.includes(r.employmentStatus)) return false;
      if (filters.businessUnits.length > 0 && !filters.businessUnits.includes(r.businessUnit)) return false;
      if (filters.managers.length > 0 && !filters.managers.includes(r.manager)) return false;
      if (filters.levels.length > 0 && !filters.levels.includes(r.level)) return false;
      if (filters.performanceRatings.length > 0 && !filters.performanceRatings.includes(Math.round(r.performanceRating))) return false;

      // Ranges
      if (r.age < filters.ageRange[0] || r.age > filters.ageRange[1]) return false;
      if (r.salary < filters.salaryRange[0] || r.salary > filters.salaryRange[1]) return false;

      // Dates (joining/resigning dates)
      if (filters.dateRange.start && r.joinDate && r.joinDate < filters.dateRange.start) return false;
      if (filters.dateRange.end && r.joinDate && r.joinDate > filters.dateRange.end) return false;

      return true;
    });
  }, [records, filters]);

  // Calculate metrics for filtered subset
  const metrics = useMemo<HRMetrics>(() => {
    return calculateHRMetrics(filteredRecords);
  }, [filteredRecords]);

  // Helpers to update filters
  const toggleFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => {
      const current = prev[key];
      if (Array.isArray(current)) {
        const arr = current as any[];
        if (arr.includes(value)) {
          return { ...prev, [key]: arr.filter(x => x !== value) };
        } else {
          return { ...prev, [key]: [...arr, value] };
        }
      }
      return prev;
    });
  };

  const setRangeFilter = (key: 'ageRange' | 'salaryRange', range: [number, number]) => {
    setFilters(prev => ({ ...prev, [key]: range }));
  };

  const setDateFilter = (start: Date | null, end: Date | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { start, end }
    }));
  };

  const setSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const clearAllFilters = () => {
    setFilters({
      ...initialFilterState,
      ageRange: dataAgeBounds,
      salaryRange: dataSalaryBounds
    });
  };

  const resetData = () => {
    setRawRows([]);
    setHeaders([]);
    setSheetNames([]);
    setSelectedSheet('');
    setMapping(null);
    setRecords([]);
    setWarnings([]);
    setFilters(initialFilterState);
  };

  return {
    rawRows,
    setRawRows,
    headers,
    setHeaders,
    sheetNames,
    setSheetNames,
    selectedSheet,
    setSelectedSheet,
    mapping,
    setMapping,
    records,
    warnings,
    filters,
    setFilters,
    filterOptions,
    filteredRecords,
    metrics,
    dataAgeBounds,
    dataSalaryBounds,
    toggleFilter,
    setRangeFilter,
    setDateFilter,
    setSearchQuery,
    clearAllFilters,
    resetData
  };
}
