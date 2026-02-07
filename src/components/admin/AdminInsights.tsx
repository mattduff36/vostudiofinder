'use client';

import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, MapPin, Building2, Link as LinkIcon } from 'lucide-react';

interface InsightsData {
  customConnectionsStats: Array<[string, number]>;
  locationStats: Array<{ name: string; count: number }>;
  studioTypeStats: Array<{ name: string; count: number }>;
  studioTypeCombinationsStats: Array<{ name: string; count: number }>;
  signupTrend: Array<{ date: string; count: number }>;
  paymentTrend: Array<{ date: string; count: number; amount: number }>;
}

interface AdminInsightsProps {
  insights: InsightsData;
}

// Color palette for charts
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

export function AdminInsights({ insights }: AdminInsightsProps) {
  // Transform custom connections for chart
  const customConnectionsData = insights.customConnectionsStats.map(([name, count]) => ({
    name,
    count,
  }));

  // Transform signup trend for display (format dates)
  const signupChartData = insights.signupTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    signups: item.count,
  }));

  // Transform payment trend for display (format dates and convert to pounds)
  const paymentChartData = insights.paymentTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    payments: item.count,
    revenue: Math.round(item.amount / 100), // Convert pence to pounds
  }));


  return (
    <div className="space-y-6 md:space-y-8">
      {/* Top Charts Grid - Studio Types and Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        
        {/* Studio Types - Same height as Studio Locations */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Studio Types (Home, Recording & Podcast)</h3>
              <p className="text-sm text-gray-600">Individual types and common combinations</p>
            </div>
          </div>
          {insights.studioTypeStats.length > 0 ? (
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={insights.studioTypeStats.map(item => ({
                  name: item.name,
                  count: item.count,
                }))} margin={{ top: 5, right: 10, bottom: 60, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    fontSize={11}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {insights.studioTypeStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] ?? '#8b5cf6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              No studio type data available
            </div>
          )}
        </div>

        {/* Studio Locations - Same height as Studio Types */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Studio Locations</h3>
              <p className="text-sm text-gray-600">Top 4 countries + other</p>
            </div>
          </div>
          {insights.locationStats.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={insights.locationStats.map(item => ({
                      name: item.name,
                      value: item.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                      if (midAngle === undefined) return null;
                      const RADIAN = Math.PI / 180;
                      // Position label in the middle of the slice
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="#000" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          fontSize={13}
                          fontWeight="600"
                        >
                          {`${name} ${percent ? (percent * 100).toFixed(0) : '0'}%`}
                        </text>
                      );
                    }}
                    outerRadius="70%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {insights.locationStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] ?? '#8b5cf6'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number | undefined) => value !== undefined ? [`${value} studios`, 'Count'] : ['0 studios', 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-500 text-sm">
              No location data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Charts Grid - Responsive: stack on mobile, 3 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        
        {/* Custom Connection Methods */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <LinkIcon className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Custom Connection Methods</h3>
              <p className="text-sm text-gray-600">Most popular user-added connections</p>
            </div>
          </div>
          {customConnectionsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={customConnectionsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  stroke="#6b7280" 
                  fontSize={11}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
              No custom connections yet
            </div>
          )}
        </div>
        
        {/* Signups Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Signups (Last 30 Days)</h3>
              <p className="text-sm text-gray-600">Daily user registrations</p>
            </div>
          </div>
          {signupChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={signupChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={11}
                  interval={Math.floor(signupChartData.length / 8)} // Show ~8 labels
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="signups" 
                  stroke="#14b8a6" 
                  strokeWidth={2}
                  dot={{ fill: '#14b8a6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
              No signup data available
            </div>
          )}
        </div>

        {/* Payments Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Payments (Last 30 Days)</h3>
              <p className="text-sm text-gray-600">Daily revenue (£) and transaction count</p>
            </div>
          </div>
          {paymentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={paymentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={11}
                  interval={Math.floor(paymentChartData.length / 8)}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => {
                    if (name === 'revenue' && value !== undefined) return [`£${value}`, 'Revenue'];
                    if (value !== undefined) return [value, 'Payments'];
                    return ['', ''];
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="payments" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
              No payment data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

