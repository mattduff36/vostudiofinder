'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardData {
  studios: {
    total: number;
    active: number;
  };
  faqs: {
    total: number;
  };
  users: {
    total: number;
  };
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-raleway font-medium">Error Loading Dashboard</h3>
        <p className="text-red-600 mt-1 font-raleway">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-raleway"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-raleway font-light text-text-primary mb-2">
          🎭 VOSF Studio Management
        </h1>
        <p className="text-text-secondary font-raleway">
          Voice Over Studio Finder - Admin Dashboard
        </p>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Studios */}
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-lg border border-primary-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-raleway font-medium text-primary-900">🎭 Total Studios</h3>
            <div className="text-primary-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-raleway font-medium text-primary-700 mb-1">
            {dashboardData.studios.total}
          </div>
          <p className="text-primary-600 text-sm mb-3 font-raleway">
            Studio profiles in database
          </p>
          <Link 
            href="/admin/studios"
            className="inline-flex items-center text-primary-800 hover:text-primary-900 font-raleway font-medium text-sm"
          >
            Manage Studios →
          </Link>
        </div>

        {/* Active Profiles */}
        <div className="bg-gradient-to-br from-accent-50 to-accent-100 p-6 rounded-lg border border-accent-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-raleway font-medium text-accent-900">✅ Active Profiles</h3>
            <div className="text-accent-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-raleway font-medium text-accent-700 mb-1">
            {dashboardData.studios.active}
          </div>
          <p className="text-accent-600 text-sm mb-3 font-raleway">
            Complete studio profiles
          </p>
          <Link 
            href="/admin/studios"
            className="inline-flex items-center text-accent-800 hover:text-accent-900 font-raleway font-medium text-sm"
          >
            View Studios →
          </Link>
        </div>

        {/* FAQ Knowledge Base */}
        <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 p-6 rounded-lg border border-secondary-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-raleway font-medium text-secondary-900">❓ FAQ Articles</h3>
            <div className="text-secondary-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-raleway font-medium text-secondary-700 mb-1">
            {dashboardData.faqs.total}
          </div>
          <p className="text-secondary-600 text-sm mb-3 font-raleway">
            Published FAQ articles
          </p>
          <Link 
            href="/admin/faq"
            className="inline-flex items-center text-secondary-800 hover:text-secondary-900 font-raleway font-medium text-sm"
          >
            Manage FAQ →
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-secondary-50 rounded-lg p-6">
        <h2 className="text-lg font-raleway font-light text-text-primary mb-4">🚀 Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/admin/query"
            className="flex items-center p-4 bg-white border border-secondary-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex-shrink-0 mr-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="font-raleway font-medium text-text-primary">SQL Query</h3>
              <p className="text-sm text-text-secondary font-raleway">Run custom queries</p>
            </div>
          </Link>

          <Link 
            href="/admin/browse"
            className="flex items-center p-4 bg-white border border-secondary-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex-shrink-0 mr-3">
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="font-raleway font-medium text-text-primary">Browse Tables</h3>
              <p className="text-sm text-text-secondary font-raleway">Explore raw data</p>
            </div>
          </Link>

          <Link 
            href="/admin/schema"
            className="flex items-center p-4 bg-white border border-secondary-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex-shrink-0 mr-3">
              <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="font-raleway font-medium text-text-primary">Database Schema</h3>
              <p className="text-sm text-text-secondary font-raleway">View table structures</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
