import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Treemap
} from 'recharts';
import { HRMetrics } from '../types/hr';

// Custom CSS for charts glow
const CHART_COLORS = {
  primary: '#8b5cf6', // Violet
  secondary: '#3b82f6', // Blue
  accent: '#10b981', // Emerald
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Rose
  pink: '#ec4899', // Pink
  other: '#6b7280', // Gray
  genders: ['#8b5cf6', '#ec4899', '#3b82f6'],
  palette: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#f43f5e']
};

interface ChartProps {
  metrics: HRMetrics;
}

// Helper loading wrapper
const ChartWrapper = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col h-[400px]">
      <h4 className="text-sm font-semibold tracking-tight text-foreground/80 mb-4">{title}</h4>
      <div className="flex-1 w-full relative min-h-0">
        {mounted ? (
          children
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

// 1. Hiring Trend Chart (Line Chart of Joiners & Cumulative Headcount)
export function HiringTrendChart({ metrics }: ChartProps) {
  const data = metrics.hiringTrend;

  return (
    <ChartWrapper title="Hiring Trend & Headcount Growth">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="dateStr" stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" fontSize={11} label={{ value: 'Joiners', angle: -90, position: 'insideLeft', style: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } }} />
          <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" fontSize={11} label={{ value: 'Cumulative Headcount', angle: 90, position: 'insideRight', style: { fill: 'rgba(255,255,255,0.4)', fontSize: 10 } }} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelClassName="text-white"
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="left" type="monotone" dataKey="joiners" name="New Hires" stroke={CHART_COLORS.primary} strokeWidth={2.5} activeDot={{ r: 6 }} />
          <Line yAxisId="right" type="monotone" dataKey="headcount" name="Total Headcount" stroke={CHART_COLORS.accent} strokeWidth={2.5} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 2. Turnover Trend Chart (Line Chart of Resignations)
export function TurnoverTrendChart({ metrics }: ChartProps) {
  const data = metrics.hiringTrend;

  return (
    <ChartWrapper title="Turnover Trend (Monthly Resignations)">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="dateStr" stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelClassName="text-white"
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="leavers" name="Resignations" stroke={CHART_COLORS.danger} strokeWidth={2.5} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 3. Department Headcount Chart (Bar Chart)
export function DepartmentHeadcountChart({ metrics }: ChartProps) {
  const data = Object.keys(metrics.departmentHeadcount).map(dept => ({
    name: dept,
    count: metrics.departmentHeadcount[dept]
  })).sort((a, b) => b.count - a.count);

  return (
    <ChartWrapper title="Headcount by Department">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tick={{ fill: 'rgba(255,255,255,0.6)' }} interval={0} angle={-15} textAnchor="end" />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelClassName="text-white"
          />
          <Bar dataKey="count" name="Employees" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 4. Gender by Department Chart (Stacked Bar Chart)
export function GenderByDepartmentChart({ metrics }: ChartProps) {
  const data = Object.keys(metrics.genderByDepartment).map(dept => ({
    name: dept,
    Male: metrics.genderByDepartment[dept].male,
    Female: metrics.genderByDepartment[dept].female,
    Other: metrics.genderByDepartment[dept].other
  }));

  return (
    <ChartWrapper title="Gender Balance by Department">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} angle={-15} textAnchor="end" />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelClassName="text-white"
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Male" stackId="a" fill={CHART_COLORS.primary} />
          <Bar dataKey="Female" stackId="a" fill={CHART_COLORS.pink} />
          <Bar dataKey="Other" stackId="a" fill={CHART_COLORS.secondary} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 5. Gender Pie Chart
export function GenderPieChart({ metrics }: ChartProps) {
  const data = Object.keys(metrics.genderDistribution).map(g => ({
    name: g,
    value: metrics.genderDistribution[g]
  }));

  return (
    <ChartWrapper title="Gender Distribution">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS.genders[index % CHART_COLORS.genders.length] || CHART_COLORS.palette[index]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 6. Employment Status Pie Chart
export function StatusPieChart({ metrics }: ChartProps) {
  const data = Object.keys(metrics.statusDistribution).map(s => ({
    name: s,
    value: metrics.statusDistribution[s]
  }));

  return (
    <ChartWrapper title="Employment Status">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 7. Performance Rating Donut Chart
export function PerformanceDonutChart({ metrics }: ChartProps) {
  const data = Object.keys(metrics.performanceDistribution).map(rating => ({
    name: `Rating ${rating}`,
    value: metrics.performanceDistribution[Number(rating)]
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ChartWrapper title="Performance Ratings Distribution">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name} (${value})`}
            labelLine={true}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={
                  entry.name.includes('5') ? CHART_COLORS.accent :
                  entry.name.includes('4') ? CHART_COLORS.secondary :
                  entry.name.includes('3') ? CHART_COLORS.primary :
                  entry.name.includes('2') ? CHART_COLORS.warning : 
                  CHART_COLORS.danger
                } 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 8. Salary Distribution Histogram (Bar Chart of Buckets)
export function SalaryHistogram({ metrics }: ChartProps) {
  const data = metrics.salaryDistribution;

  return (
    <ChartWrapper title="Salary Distribution (Pay Range)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="range" stroke="rgba(255,255,255,0.4)" fontSize={10} />
          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            labelClassName="text-white"
          />
          <Bar dataKey="count" name="Employees Count" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

// 9. Attrition Heatmap Grid (Custom React-styled Grid representing Attrition Rate by Dept)
export function AttritionHeatmap({ metrics }: ChartProps) {
  const deptsData = Object.keys(metrics.departmentTurnover).map(dept => ({
    name: dept,
    resigned: metrics.departmentTurnover[dept].resigned,
    total: metrics.departmentTurnover[dept].total,
    rate: metrics.departmentTurnover[dept].rate
  })).sort((a, b) => b.rate - a.rate);

  // Helper to determine background shade based on rate
  const getCellColor = (rate: number) => {
    if (rate >= 25) return 'bg-rose-500/20 border-rose-500/40 text-rose-300';
    if (rate >= 15) return 'bg-orange-500/20 border-orange-500/40 text-orange-300';
    if (rate >= 7) return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
  };

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col h-[400px]">
      <h4 className="text-sm font-semibold tracking-tight text-foreground/80 mb-1">Attrition by Department</h4>
      <p className="text-xs text-muted-foreground mb-4">Heatmap representing percentage of resigned employees in each department</p>
      
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {deptsData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No data available</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {deptsData.map((d, index) => (
              <div 
                key={index}
                className={`p-4 rounded-xl border flex flex-col justify-between h-28 transition-all hover:scale-[1.02] ${getCellColor(d.rate)}`}
              >
                <div>
                  <span className="text-xs font-semibold text-foreground truncate block">{d.name}</span>
                  <span className="text-[10px] opacity-75">{d.total} total staff</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-2xl font-bold">{d.rate}%</span>
                  <span className="text-[9px] opacity-80">{d.resigned} resigned</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 10. TreeMap (Org Distribution by Department)
export function OrgTreeMap({ metrics }: ChartProps) {
  const rawData = Object.keys(metrics.departmentHeadcount).map(dept => ({
    name: dept,
    size: metrics.departmentHeadcount[dept]
  }));

  const treeData = [{
    name: 'Organization',
    children: rawData
  }];

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ChartWrapper title="Organization Hierarchy (Treemap)">
      {mounted && rawData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={rawData}
            dataKey="size"
            stroke="#17171b"
            fill={CHART_COLORS.primary}
          >
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            />
          </Treemap>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading Treemap...</div>
      )}
    </ChartWrapper>
  );
}

// 11. Scatter Plot (Salary vs Performance Rating)
export function SalaryVsPerformanceScatter({ metrics }: ChartProps) {
  // Aggregate or map scatter records, capping at 200 random points for visualization density
  const scatterPoints = metrics.salaryVsPerformance.slice(0, 200);

  const formatSalary = (val: any) => {
    return `$${Math.round(val / 1000)}k`;
  };

  return (
    <ChartWrapper title="Salary vs. Performance Rating Correlation">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            type="number" 
            dataKey="salary" 
            name="Salary" 
            unit="" 
            tickFormatter={formatSalary} 
            stroke="rgba(255,255,255,0.4)" 
            fontSize={11}
          />
          <YAxis 
            type="number" 
            dataKey="performance" 
            name="Performance Rating" 
            domain={[1, 5]} 
            tickCount={5} 
            stroke="rgba(255,255,255,0.4)" 
            fontSize={11}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }} 
            contentStyle={{ backgroundColor: 'rgba(23, 23, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            formatter={(value: any, name: any) => {
              if (name === 'Salary') return [value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), name];
              return [value, name];
            }}
          />
          <Scatter name="Employees" data={scatterPoints} fill={CHART_COLORS.accent}>
            {scatterPoints.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS.palette[index % CHART_COLORS.palette.length]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
