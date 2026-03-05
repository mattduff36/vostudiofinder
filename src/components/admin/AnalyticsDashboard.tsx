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
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#14b8a6', // teal
  '#a855f7', // violet
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
// KPI Card — matches AdminDashboard stat card pattern
// ---------------------------------------------------------------------------

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function KpiCard({ label, value, icon: Icon, color }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-3 md:p-6 hover:shadow-md hover:ring-2 hover:ring-[#fecaca] transition-all">
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <div className={`p-2 md:p-3 ${color} rounded-lg`}>
          <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
        </div>
      </div>
      <div>
        <p className="text-xs md:text-sm font-medium text-gray-600">{label}</p>
        <p className="text-xl md:text-3xl font-bold text-gray-900 mt-0.5 md:mt-1">{formatNumber(value)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeseries Chart — matches AdminInsights chart card pattern
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
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
        <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-teal-600 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{title}</h3>
          <p className="text-xs md:text-sm text-gray-600 hidden sm:block">Daily unique visitors and total page views</p>
        </div>
      </div>
      {chartData.length === 0 ? (
        <div className="h-[250px] md:h-[350px] flex items-center justify-center text-gray-500 text-sm">
          No data available yet — views will appear as visitors browse the site
        </div>
      ) : (
        <div className="h-[250px] md:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPageviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
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
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorVisitors)"
                name="Visitors"
              />
              <Area
                type="monotone"
                dataKey="pageviews"
                stroke="#14b8a6"
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
  iconColor: string;
  entries: BreakdownEntry[];
  keyLabel?: string;
}

function BreakdownTable({ title, icon: Icon, iconColor, entries, keyLabel = 'Name' }: BreakdownTableProps) {
  const maxVisitors = Math.max(...entries.map((e) => e.visitors), 1);

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor} flex-shrink-0`} />
        <h3 className="text-sm md:text-lg font-bold text-gray-900">{title}</h3>
      </div>
      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">No data available</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_70px_70px] gap-2 text-xs font-medium text-gray-500 pb-1 border-b border-gray-200">
            <span>{keyLabel}</span>
            <span className="text-right">Visitors</span>
            <span className="text-right">Views</span>
          </div>
          {entries.map((entry, i) => (
            <div key={entry.key + i} className="grid grid-cols-[1fr_70px_70px] gap-2 items-center text-sm">
              <div className="relative min-w-0">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-[#fef2f2]"
                  style={{ width: `${(entry.visitors / maxVisitors) * 100}%` }}
                />
                <span className="relative z-10 truncate block px-1.5 py-0.5 text-gray-800">{entry.key || '(direct)'}</span>
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
// Horizontal Bar Chart
// ---------------------------------------------------------------------------

interface HBarChartProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  entries: BreakdownEntry[];
}

function HBarChart({ title, icon: Icon, iconColor, entries }: HBarChartProps) {
  const chartData = entries.map((e) => ({ name: e.key || '(unknown)', visitors: e.visitors }));

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor} flex-shrink-0`} />
        <h3 className="text-sm md:text-lg font-bold text-gray-900">{title}</h3>
      </div>
      {chartData.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">No data available</p>
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
                  <Cell key={idx} fill={COLORS[idx % COLORS.length] ?? '#8b5cf6'} />
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
    <div className="space-y-4 md:space-y-8">
      {/* KPI Row — semantic colors matching AdminDashboard stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <KpiCard label="Visitors (24h)" value={summary.visitors24h} icon={Eye} color="bg-blue-500" />
        <KpiCard label="Pageviews (24h)" value={summary.pageviews24h} icon={FileText} color="bg-green-500" />
        <KpiCard label="Visitors (7d)" value={summary.visitors7d} icon={Users} color="bg-purple-500" />
        <KpiCard label="Pageviews (7d)" value={summary.pageviews7d} icon={TrendingUp} color="bg-orange-500" />
      </div>

      {/* Timeseries Toggle + Chart */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '7d'
                ? 'bg-[#d42027] text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              timeRange === '30d'
                ? 'bg-[#d42027] text-white shadow-sm'
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
        <BreakdownTable title="Top Pages" icon={FileText} iconColor="text-blue-600" entries={topPages} keyLabel="Path" />
        <BreakdownTable title="Top Referrers" icon={ArrowUpRight} iconColor="text-indigo-600" entries={topReferrers} keyLabel="Referrer" />
      </div>

      {/* Breakdown: Countries */}
      <BreakdownTable title="Top Countries" icon={Globe} iconColor="text-green-600" entries={topCountries} keyLabel="Country" />

      {/* Bar Charts: Browsers, OS, Devices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        <HBarChart title="Browsers" icon={Globe} iconColor="text-purple-600" entries={topBrowsers} />
        <HBarChart title="Operating Systems" icon={Monitor} iconColor="text-teal-600" entries={topOS} />
        <HBarChart title="Devices" icon={Smartphone} iconColor="text-orange-600" entries={topDevices} />
      </div>
    </div>
  );
}
