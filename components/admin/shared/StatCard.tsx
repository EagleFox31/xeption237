
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, color = "text-white" }) => {
  return (
    <div className="bg-black/40 backdrop-blur-md border border-white/5 p-6 relative overflow-hidden group hover:border-white/20 transition-all rounded-sm shadow-lg">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
            <Icon className={`w-32 h-32 ${color}`} />
        </div>
        <div className="relative z-10">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
            <h3 className="text-3xl lg:text-4xl font-bold text-white font-tech">
                {value} <span className="text-xs text-gray-600 block sm:inline">{sub}</span>
            </h3>
        </div>
    </div>
  );
};

export default StatCard;
