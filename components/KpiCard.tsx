import { motion } from 'framer-motion';
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function KpiCard({ title, value, subtext, icon, trend }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between"
    >
      {/* Background Decorative Gradient Radial Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="p-2.5 rounded-xl glass text-primary flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div>
        <motion.h3 
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold tracking-tight mb-1 font-sans text-foreground"
        >
          {value}
        </motion.h3>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{subtext}</span>
          {trend && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.isPositive 
                ? 'bg-emerald-500/10 text-emerald-400 light:bg-emerald-500/15 light:text-emerald-600' 
                : 'bg-rose-500/10 text-rose-400 light:bg-rose-500/15 light:text-rose-600'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
