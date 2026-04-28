import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void;
}

export default function StatCard({
  title, value, subtitle, icon: Icon, iconColor = 'text-cyan-400',
  bgColor = 'bg-cyan-500/10', trend, trendValue, onClick
}: Props) {
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div
      className={`glass-card p-4 flex items-start gap-3 ${onClick ? 'cursor-pointer glass-card-hover' : ''}`}
      onClick={onClick}
    >
      <div className={`${bgColor} ${iconColor} p-2.5 rounded-xl shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-400 text-xs font-medium truncate">{title}</p>
        <p className="text-white text-xl font-bold mt-0.5">{value}</p>
        {(subtitle || trendValue) && (
          <p className={`text-xs mt-0.5 ${trendValue ? trendColor : 'text-slate-500'}`}>
            {trendValue ? `${trendSymbol} ${trendValue}` : subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
