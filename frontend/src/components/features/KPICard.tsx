"use client";

import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
}

export function KPICard({ title, value, icon: Icon, trend }: KPICardProps) {
  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden group">
      {/* Background Gradient Blob */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl transition-all duration-500 group-hover:bg-cyan-500/20" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-gray-400 font-medium text-sm">{title}</h3>
        <div className="p-2 bg-white/5 rounded-lg border border-white/5">
          <Icon className="w-5 h-5 text-violet-400" />
        </div>
      </div>
      
      <div className="relative z-10 flex items-baseline gap-3">
        <div className="text-3xl font-bold text-white">{value}</div>
        {trend !== undefined && (
          <div className={`text-sm font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </div>
        )}
      </div>
    </div>
  );
}
