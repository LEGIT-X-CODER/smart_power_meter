import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, BarChart2, TrendingUp, RefreshCw } from 'lucide-react';
import { listenToPowerLogs } from '../../lib/firestore';
import type { PowerLog, LogPeriod } from '../../types';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface Props { deviceId: string; }

const PERIODS: { key: LogPeriod; label: string }[] = [
  { key: 'minute', label: 'Hourly' },
  { key: 'daily',  label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly',label: 'Monthly' },
];

type ChartType = 'line' | 'bar';

const formatLabel = (ts: number, period: LogPeriod) => {
  if (period === 'minute') return format(ts, 'HH:mm');
  if (period === 'daily')  return format(ts, 'HH:mm');
  if (period === 'weekly') return format(ts, 'EEE dd');
  return format(ts, 'MMM dd');
};

export default function PowerLogs({ deviceId }: Props) {
  const [period, setPeriod] = useState<LogPeriod>('daily');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [logs, setLogs] = useState<PowerLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = listenToPowerLogs(deviceId, period, (data) => {
      setLogs(data);
      setLoading(false);
    });
    return unsub;
  }, [deviceId, period]);

  const chartData = logs.map((log) => ({
    time: formatLabel(log.timestamp, period),
    Power: parseFloat(log.power.toFixed(1)),
    Voltage: parseFloat(log.voltage.toFixed(1)),
    Current: parseFloat(log.current.toFixed(2)),
    Energy: parseFloat(log.totalEnergy.toFixed(2)),
    ts: log.timestamp,
  }));

  const exportCSV = () => {
    const csv = Papa.unparse(logs.map((l) => ({
      Timestamp: format(l.timestamp, 'yyyy-MM-dd HH:mm:ss'),
      'Voltage (V)': l.voltage.toFixed(2),
      'Current (A)': l.current.toFixed(3),
      'Power (W)': l.power.toFixed(1),
      'Total Energy (Wh)': l.totalEnergy.toFixed(2),
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `power-log-${deviceId}-${period}-${format(Date.now(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(51, 65, 85, 0.8)',
    borderRadius: '12px',
    color: '#fff',
  };

  return (
    <div className="space-y-4">
      {/* Period tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            id={`log-period-${key}`}
            onClick={() => setPeriod(key)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all
                       ${period === key ? 'bg-cyan-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart type toggle + export */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
          <button onClick={() => setChartType('line')} className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>
            <TrendingUp size={14} />
          </button>
          <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>
            <BarChart2 size={14} />
          </button>
        </div>

        <button id="export-csv" onClick={exportCSV} disabled={logs.length === 0} className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-40 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Chart */}
      <div className="glass-card p-4">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <RefreshCw size={24} className="text-slate-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2">
            <BarChart2 size={32} className="text-slate-600" />
            <p className="text-slate-500 text-sm">No data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="Power" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Voltage" stroke="#3b82f6" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Power" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Energy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Avg Power', value: `${(logs.reduce((a, l) => a + l.power, 0) / logs.length).toFixed(1)} W` },
            { label: 'Peak Power', value: `${Math.max(...logs.map((l) => l.power)).toFixed(1)} W` },
            { label: 'Total Energy', value: logs[logs.length - 1]?.totalEnergy >= 1000
                ? `${(logs[logs.length - 1].totalEnergy / 1000).toFixed(2)} kWh`
                : `${logs[logs.length - 1]?.totalEnergy?.toFixed(0)} Wh` },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className="text-slate-400 text-[10px] font-medium">{s.label}</p>
              <p className="text-white text-sm font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
