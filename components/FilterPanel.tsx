import React from 'react';
import { FilterState } from '../types/hr';
import { Search, RotateCcw, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterPanelProps {
  filters: FilterState;
  filterOptions: {
    departments: string[];
    locations: string[];
    genders: string[];
    employmentStatuses: string[];
    businessUnits: string[];
    managers: string[];
    levels: string[];
  };
  toggleFilter: (key: keyof FilterState, value: any) => void;
  setRangeFilter: (key: 'ageRange' | 'salaryRange', range: [number, number]) => void;
  setDateFilter: (start: Date | null, end: Date | null) => void;
  setSearchQuery: (query: string) => void;
  clearAllFilters: () => void;
  dataAgeBounds: [number, number];
  dataSalaryBounds: [number, number];
}

export default function FilterPanel({
  filters,
  filterOptions,
  toggleFilter,
  setRangeFilter,
  setDateFilter,
  setSearchQuery,
  clearAllFilters,
  dataAgeBounds,
  dataSalaryBounds
}: FilterPanelProps) {
  // Local state to toggle collapsible filter sections
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    search: true,
    demographics: true,
    org: true,
    metrics: true,
    dates: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Safe handlers for numeric ranges
  const handleRangeChange = (key: 'ageRange' | 'salaryRange', index: 0 | 1, val: string) => {
    const parsed = val === '' ? 0 : parseFloat(val);
    const bounds = key === 'ageRange' ? dataAgeBounds : dataSalaryBounds;
    const currentRange = filters[key];
    const nextRange: [number, number] = [...currentRange];
    
    if (index === 0) {
      nextRange[0] = Math.max(bounds[0], Math.min(parsed, currentRange[1]));
    } else {
      nextRange[1] = Math.min(bounds[1], Math.max(parsed, currentRange[0]));
    }
    
    setRangeFilter(key, nextRange);
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-80 text-foreground overflow-y-auto custom-scrollbar">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg tracking-tight">Data Filters</h3>
        </div>
        <button
          onClick={clearAllFilters}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Reset Filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* SECTION 1: SEARCH */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search employee..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-accent/30 border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary placeholder-muted-foreground transition-all"
            />
          </div>
        </div>

        {/* SECTION 2: ORGANIZATIONAL */}
        <div className="border border-border rounded-2xl overflow-hidden glass-card">
          <button
            onClick={() => toggleSection('org')}
            className="w-full p-4 flex items-center justify-between bg-accent/10 border-b border-border text-sm font-semibold"
          >
            <span>Organization</span>
            {expandedSections.org ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {expandedSections.org && (
            <div className="p-4 space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar text-xs">
              {/* Department */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Departments</label>
                <div className="space-y-1">
                  {filterOptions.departments.map(dept => (
                    <label key={dept} className="flex items-center gap-2 py-0.5 cursor-pointer hover:text-primary transition-all">
                      <input
                        type="checkbox"
                        checked={filters.departments.includes(dept)}
                        onChange={() => toggleFilter('departments', dept)}
                        className="rounded border-border bg-accent text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span>{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Locations</label>
                <div className="space-y-1">
                  {filterOptions.locations.map(loc => (
                    <label key={loc} className="flex items-center gap-2 py-0.5 cursor-pointer hover:text-primary transition-all">
                      <input
                        type="checkbox"
                        checked={filters.locations.includes(loc)}
                        onChange={() => toggleFilter('locations', loc)}
                        className="rounded border-border bg-accent text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span>{loc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Levels */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Job Levels</label>
                <div className="space-y-1">
                  {filterOptions.levels.map(level => (
                    <label key={level} className="flex items-center gap-2 py-0.5 cursor-pointer hover:text-primary transition-all">
                      <input
                        type="checkbox"
                        checked={filters.levels.includes(level)}
                        onChange={() => toggleFilter('levels', level)}
                        className="rounded border-border bg-accent text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: DEMOGRAPHICS & STATUS */}
        <div className="border border-border rounded-2xl overflow-hidden glass-card">
          <button
            onClick={() => toggleSection('demographics')}
            className="w-full p-4 flex items-center justify-between bg-accent/10 border-b border-border text-sm font-semibold"
          >
            <span>Demographics & Status</span>
            {expandedSections.demographics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedSections.demographics && (
            <div className="p-4 space-y-4 text-xs">
              {/* Gender */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Gender</label>
                <div className="flex gap-4">
                  {filterOptions.genders.map(gender => (
                    <label key={gender} className="flex items-center gap-2 cursor-pointer hover:text-primary">
                      <input
                        type="checkbox"
                        checked={filters.genders.includes(gender)}
                        onChange={() => toggleFilter('genders', gender)}
                        className="rounded border-border bg-accent text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span>{gender}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Employment Status</label>
                <div className="space-y-1">
                  {filterOptions.employmentStatuses.map(status => (
                    <label key={status} className="flex items-center gap-2 py-0.5 cursor-pointer hover:text-primary">
                      <input
                        type="checkbox"
                        checked={filters.employmentStatuses.includes(status)}
                        onChange={() => toggleFilter('employmentStatuses', status)}
                        className="rounded border-border bg-accent text-primary focus:ring-primary w-3.5 h-3.5"
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: RANGE METRICS */}
        <div className="border border-border rounded-2xl overflow-hidden glass-card">
          <button
            onClick={() => toggleSection('metrics')}
            className="w-full p-4 flex items-center justify-between bg-accent/10 border-b border-border text-sm font-semibold"
          >
            <span>Compensation & Demographics Ranges</span>
            {expandedSections.metrics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedSections.metrics && (
            <div className="p-4 space-y-4 text-xs">
              {/* Age Range Inputs */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Age Range</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={filters.ageRange[0]}
                    min={dataAgeBounds[0]}
                    max={filters.ageRange[1]}
                    onChange={(e) => handleRangeChange('ageRange', 0, e.target.value)}
                    className="w-20 bg-accent/30 border border-border rounded-lg py-1 px-2 text-center"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="number"
                    value={filters.ageRange[1]}
                    min={filters.ageRange[0]}
                    max={dataAgeBounds[1]}
                    onChange={(e) => handleRangeChange('ageRange', 1, e.target.value)}
                    className="w-20 bg-accent/30 border border-border rounded-lg py-1 px-2 text-center"
                  />
                </div>
              </div>

              {/* Salary Range Inputs */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Salary Range ($)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={filters.salaryRange[0]}
                    min={dataSalaryBounds[0]}
                    max={filters.salaryRange[1]}
                    step={1000}
                    onChange={(e) => handleRangeChange('salaryRange', 0, e.target.value)}
                    className="w-24 bg-accent/30 border border-border rounded-lg py-1 px-2 text-center"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input
                    type="number"
                    value={filters.salaryRange[1]}
                    min={filters.salaryRange[0]}
                    max={dataSalaryBounds[1]}
                    step={1000}
                    onChange={(e) => handleRangeChange('salaryRange', 1, e.target.value)}
                    className="w-24 bg-accent/30 border border-border rounded-lg py-1 px-2 text-center"
                  />
                </div>
              </div>

              {/* Performance Rating */}
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block">Performance Rating</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => toggleFilter('performanceRatings', rating)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                        filters.performanceRatings.includes(rating)
                          ? 'bg-primary border-primary text-white'
                          : 'border-border bg-accent/30 hover:bg-accent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ★ {rating}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 5: TIMELINE */}
        <div className="border border-border rounded-2xl overflow-hidden glass-card">
          <button
            onClick={() => toggleSection('dates')}
            className="w-full p-4 flex items-center justify-between bg-accent/10 border-b border-border text-sm font-semibold"
          >
            <span>Hiring Date Range</span>
            {expandedSections.dates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedSections.dates && (
            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Start Date
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : null;
                    setDateFilter(d, filters.dateRange.end);
                  }}
                  value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                  className="w-full bg-accent/30 border border-border rounded-lg py-1 px-2"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground mb-2 block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> End Date
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    const d = e.target.value ? new Date(e.target.value) : null;
                    setDateFilter(filters.dateRange.start, d);
                  }}
                  value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                  className="w-full bg-accent/30 border border-border rounded-lg py-1 px-2"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
