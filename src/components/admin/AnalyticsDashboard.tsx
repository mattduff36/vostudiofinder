'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Eye,
  FileText,
  Globe,
  Monitor,
  ArrowUpRight,
  TrendingUp,
  Users,
  Smartphone,
} from 'lucide-react';
import { useState } from 'react';
import type { AnalyticsDetail, BreakdownEntry, TimeseriesPoint } from '@/lib/vercel-analytics';

interface AnalyticsDashboardProps {
  data: AnalyticsDetail;
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#06b6d4', '#f97316', '#14b8a6',
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDateLabel(d: string): string {
  try {
    const date = new Date(d);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return d;
  }
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function KpiCard({ label, value, icon: Icon, color }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs md:text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-gray-900">{formatNumber(value)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeseries Chart
// ---------------------------------------------------------------------------

interface TimeseriesChartProps {
  points: TimeseriesPoint[];
  title: string;
}

function TimeseriesChart({ points, title }: TimeseriesChartProps) {
  const chartData = points.map((p) => ({
    date: formatDateLabel(p.date),
    visitors: p.visitors,
    pageviews: p.pageviews,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-4">{title}</h3>
      {chartData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      ) : (
        <div className="h-[250px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={11}
                interval={Math.max(0, Math.floor(chartData.length / 7))}
              />
              <YAxis stroke="#6b7280" fontSize={11} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorVisitors)"
                name="Visitors"
              />
              <Area
                type="monotone"
                dataKey="pageviews"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorPageviews)"
                name="Pageviews"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakdown Table
// ---------------------------------------------------------------------------

interface BreakdownTableProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  entries: BreakdownEntry[];
  keyLabel?: string;
}

function BreakdownTable({ title, icon: Icon, entries, keyLabel = 'Name' }: BreakdownTableProps) {
  const maxVisitors = Math.max(...entries.map((e) => e.visitors), 1);

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
        <h3 className="text-sm md:text-lg font-bold text-gray-900">{title}</h3>
      </div>
      {entries.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No data available</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_70px_70px] gap-2 text-xs font-medium text-gray-500 pb-1 border-b border-gray-100">
            <span>{keyLabel}</span>
            <span className="text-right">Visitors</span>
            <span className="text-right">Views</span>
          </div>
          {entries.map((entry, i) => (
            <div key={entry.key + i} className="grid grid-cols-[1fr_70px_70px] gap-2 items-center text-sm">
              <div className="relative min-w-0">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-indigo-100"
                  style={{ width: `${(entry.visitors / maxVisitors) * 100}%` }}
                />
                <span className="relative z-10 truncate block px-1.5 py-0.5">{entry.key || '(direct)'}</span>
              </div>
              <span className="text-right font-medium text-gray-900">{formatNumber(entry.visitors)}</span>
              <span className="text-right text-gray-600">{formatNumber(entry.pageviews)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal Bar Chart for Devices / Browsers / OS
// ---------------------------------------------------------------------------

interface HBarChartProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  entries: BreakdownEntry[];
}

function HBarChart({ title, icon: Icon, entries }: HBarChartProps) {
  const chartData = entries.map((e) => ({ name: e.key || '(unknown)', visitors: e.visitors }));

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
        <h3 className="text-sm md:text-lg font-bold text-gray-900">{title}</h3>
      </div>
      {chartData.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">No data available</p>
      ) : (
        <div className="h-[250px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" stroke="#6b7280" fontSize={11} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#6b7280"
                fontSize={11}
                width={90}
                tick={{ fill: '#374151' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <Bar dataKey="visitors" radius={[0, 4, 4, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length] ?? '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const { summary, timeseries7d, timeseries30d, topPages, topReferrers, topCountries, topBrowsers, topOS, topDevices } = data;
  const [timeRange, setTimeRange] = useState<'7d' | '30d'>('7d');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <KpiCard label="Visitors (24h)" value={summary.visitors24h} icon={Eye} color="bg-indigo-500" />
        <KpiCard label="Pageviews (24h)" value={summary.pageviews24h} icon={FileText} color="bg-green-500" />
        <KpiCard label="Visitors (7d)" value={summary.visitors7d} icon={Users} color="bg-purple-500" />
        <KpiCard label="Pageviews (7d)" value={summary.pageviews7d} icon={TrendingUp} color="bg-blue-500" />
      </div>

      {/* Timeseries Toggle + Chart */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '7d'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '30d'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            30 Days
          </button>
        </div>
        <TimeseriesChart
          points={timeRange === '7d' ? timeseries7d : timeseries30d}
          title={`Visitors & Pageviews — Last ${timeRange === '7d' ? '7' : '30'} Days`}
        />
      </div>

      {/* Breakdown Tables: Pages + Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <BreakdownTable title="Top Pages" icon={FileText} entries={topPages} keyLabel="Path" />
        <BreakdownTable title="Top Referrers" icon={ArrowUpRight} entries={topReferrers} keyLabel="Referrer" />
      </div>

      {/* Breakdown: Countries */}
      <BreakdownTable title="Top Countries" icon={Globe} entries={topCountries} keyLabel="Country" />

      {/* Bar Charts: Browsers, OS, Devices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <HBarChart title="Browsers" icon={Globe} entries={topBrowsers} />
        <HBarChart title="Operating Systems" icon={Monitor} entries={topOS} />
        <HBarChart title="Devices" icon={Smartphone} entries={topDevices} />
      </div>
    </div>
  );
}
