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
    <div className="space-y-8">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Studio Types - Combined (Individual + Combinations) - Left side, spans 2 columns */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Studio Types (Home, Recording & Podcast)</h3>
              <p className="text-sm text-gray-600">Individual types and common combinations</p>
            </div>
          </div>
          {insights.studioTypeStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.min(insights.studioTypeStats.length * 40 + 100, 400)}>
              <BarChart data={insights.studioTypeStats.map(item => ({
                name: item.name, // Names are already formatted correctly from server
                count: item.count,
              }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={180}
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
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                  {insights.studioTypeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
              No studio type data available
            </div>
          )}
        </div>

        {/* Right Column - Stacked Charts */}
        <div className="flex flex-col gap-6">
          {/* Location/Country Distribution - Top Right */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Studio Locations</h3>
                <p className="text-sm text-gray-600">Top 4 countries + other</p>
              </div>
            </div>
            {insights.locationStats.length > 0 ? (
              <div className="flex items-center justify-center px-4 py-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <Pie
                      data={insights.locationStats.map(item => ({
                        name: item.name,
                        value: item.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {insights.locationStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value} studios`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
                No location data available
              </div>
            )}
          </div>

          {/* Custom Connections Chart - Bottom Right */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <LinkIcon className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Custom Connection Methods</h3>
                <p className="text-sm text-gray-600">Most popular user-added connections</p>
              </div>
            </div>
            {customConnectionsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
              <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
                No custom connections yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Charts (Full Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
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
                  formatter={(value: number | undefined, name: string) => {
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

