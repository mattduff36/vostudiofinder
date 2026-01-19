'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { showSuccess, showError } from '@/lib/toast';
import { CheckCircle, XCircle, AlertCircle, Users, TrendingUp, Eye } from 'lucide-react';

interface AuditFinding {
  id: string;
  user_id: string;
  studio_profile_id: string | null;
  classification: 'JUNK' | 'NEEDS_UPDATE' | 'NOT_ADVERTISING' | 'EXCEPTION' | 'HEALTHY';
  reasons: string[];
  completeness_score: number;
  recommended_action: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  users: {
    id: string;
    username: string;
    email: string;
    display_name: string;
    status: string;
    created_at: string;
    last_login: string | null;
  };
  studio_profiles: {
    id: string;
    name: string;
    city: string;
    status: string;
    is_profile_visible: boolean;
    updated_at: string;
  } | null;
  enrichment_suggestions: {
    id: string;
    field_name: string;
    confidence: string;
  }[];
}

interface EnrichmentSuggestion {
  id: string;
  field_name: string;
  current_value: string | null;
  suggested_value: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence_url: string | null;
  evidence_type: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  audit_finding: {
    users: {
      username: string;
      display_name: string;
    };
    studio_profiles: {
      name: string;
    } | null;
  };
}

export default function AdminAuditUsersPage() {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'findings' | 'suggestions'>('findings');
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState<string>('PENDING');

  const fetchFindings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClassification !== 'all') {
        params.append('classification', selectedClassification);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/admin/audit/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch findings');

      const data = await response.json();
      setFindings(data.findings);
      setSummary(data.summary);
    } catch (error) {
      showError('Failed to load audit findings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedClassification]);

  const fetchSuggestions = useCallback(async (findingId?: string, statusFilter?: string) => {
    try {
      const params = new URLSearchParams();
      if (findingId) {
        params.append('findingId', findingId);
      } else if (statusFilter) {
        params.append('status', statusFilter);
      }
      params.append('limit', '100');

      const response = await fetch(`/api/admin/audit/suggestions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');

      const data = await response.json();
      setSuggestions(data.suggestions);
    } catch (error) {
      showError('Failed to load suggestions');
      console.error(error);
    }
  }, []);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  useEffect(() => {
    if (selectedFinding) {
      fetchSuggestions(selectedFinding.id);
    } else {
      fetchSuggestions(undefined, suggestionStatusFilter);
    }
  }, [selectedFinding, suggestionStatusFilter, fetchSuggestions]);

  const handleApproveSuggestions = async () => {
    if (selectedSuggestions.size === 0) {
      showError('Please select suggestions to approve');
      return;
    }

    try {
      const response = await fetch('/api/admin/audit/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionIds: Array.from(selectedSuggestions),
          action: 'APPROVE',
        }),
      });

      if (!response.ok) throw new Error('Failed to approve suggestions');

      const data = await response.json();
      showSuccess(`Approved ${data.updated} suggestions - switch to APPROVED filter to apply them`);
      setSelectedSuggestions(new Set());
      setSuggestionStatusFilter('APPROVED');
      await fetchSuggestions(selectedFinding?.id, 'APPROVED');
    } catch (error) {
      showError('Failed to approve suggestions');
      console.error(error);
    }
  };

  const handleRejectSuggestions = async () => {
    if (selectedSuggestions.size === 0) {
      showError('Please select suggestions to reject');
      return;
    }

    try {
      const response = await fetch('/api/admin/audit/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionIds: Array.from(selectedSuggestions),
          action: 'REJECT',
        }),
      });

      if (!response.ok) throw new Error('Failed to reject suggestions');

      const data = await response.json();
      showSuccess(`Rejected ${data.updated} suggestions`);
      setSelectedSuggestions(new Set());
      await fetchSuggestions(selectedFinding?.id, suggestionStatusFilter);
    } catch (error) {
      showError('Failed to reject suggestions');
      console.error(error);
    }
  };

  const handleApplySuggestions = async () => {
    if (selectedSuggestions.size === 0) {
      showError('Please select approved suggestions to apply');
      return;
    }

    try {
      const response = await fetch('/api/admin/audit/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionIds: Array.from(selectedSuggestions),
        }),
      });

      if (!response.ok) throw new Error('Failed to apply suggestions');

      const data = await response.json();
      showSuccess(`Applied ${data.applied} of ${data.total} suggestions`);
      
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((error: string) => showError(error));
      }

      setSelectedSuggestions(new Set());
      await fetchSuggestions(selectedFinding?.id, suggestionStatusFilter);
      await fetchFindings(); // Refresh findings to show updated completeness scores
    } catch (error) {
      showError('Failed to apply suggestions');
      console.error(error);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'HEALTHY': return 'text-green-600 bg-green-50';
      case 'NEEDS_UPDATE': return 'text-yellow-600 bg-yellow-50';
      case 'NOT_ADVERTISING': return 'text-blue-600 bg-blue-50';
      case 'JUNK': return 'text-red-600 bg-red-50';
      case 'EXCEPTION': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'text-green-600 bg-green-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCompletenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="px-4 py-4 md:p-6">
      <AdminTabs activeTab="audit" />

      <div className="max-w-7xl mx-auto mt-4 md:mt-6">
        {/* Under Construction Warning */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                🚧 Feature Under Development
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                This user audit system is currently under construction and not fully functional. Some features may not work as expected. 
                We will complete this feature in a future update.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">User Profile Audit</h1>
              <p className="text-sm text-gray-600 mt-1">
                Review and enrich user profiles based on automated classification
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setViewMode('findings')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  viewMode === 'findings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Findings
              </button>
              <button
                onClick={() => setViewMode('suggestions')}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  viewMode === 'suggestions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Suggestions
              </button>
            </div>
          </div>

          {/* Summary Stats - Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Healthy</span>
              </div>
              <div className="text-2xl font-bold text-green-700">{summary.HEALTHY || 0}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">Needs Update</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700">{summary.NEEDS_UPDATE || 0}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Not Advertising</span>
              </div>
              <div className="text-2xl font-bold text-blue-700">{summary.NOT_ADVERTISING || 0}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">Junk</span>
              </div>
              <div className="text-2xl font-bold text-red-700">{summary.JUNK || 0}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Exception</span>
              </div>
              <div className="text-2xl font-bold text-orange-700">{summary.EXCEPTION || 0}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Classification
            </label>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classifications</option>
              <option value="HEALTHY">Healthy</option>
              <option value="NEEDS_UPDATE">Needs Update</option>
              <option value="NOT_ADVERTISING">Not Advertising</option>
              <option value="JUNK">Junk</option>
              <option value="EXCEPTION">Exception</option>
            </select>
          </div>

          {/* View: Findings */}
          {viewMode === 'findings' && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading findings...</p>
                </div>
              ) : findings.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  No findings found
                </div>
              ) : (
                findings.map((finding) => (
                  <div
                    key={finding.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {finding.users.display_name} (@{finding.users.username})
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getClassificationColor(
                              finding.classification
                            )}`}
                          >
                            {finding.classification.replace('_', ' ')}
                          </span>
                          <span className={`font-bold ${getCompletenessColor(finding.completeness_score)}`}>
                            {finding.completeness_score}%
                          </span>
                        </div>

                        {finding.studio_profiles && (
                          <p className="text-sm text-gray-600 mb-2">
                            Studio: <span className="font-medium">{finding.studio_profiles.name}</span> • {finding.studio_profiles.city}
                          </p>
                        )}

                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Reasons:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {finding.reasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        </div>

                        {finding.recommended_action && (
                          <p className="text-sm text-blue-600">
                            <span className="font-medium">Recommended:</span> {finding.recommended_action}
                          </p>
                        )}

                        {finding.enrichment_suggestions.length > 0 && (
                          <p className="text-sm text-green-600 mt-2">
                            {finding.enrichment_suggestions.length} enrichment suggestion(s) available
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedFinding(finding);
                          setViewMode('suggestions');
                          fetchSuggestions(finding.id);
                        }}
                        className="ml-0 md:ml-4 mt-3 md:mt-0 w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* View: Suggestions */}
          {viewMode === 'suggestions' && (
            <div>
              {selectedFinding && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Suggestions for: {selectedFinding.users.display_name} (@{selectedFinding.users.username})
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedFinding(null);
                      setSuggestionStatusFilter('PENDING');
                      fetchSuggestions(undefined, 'PENDING');
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    ← Back to all suggestions
                  </button>
                </div>
              )}

              {!selectedFinding && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Status
                  </label>
                  <select
                    value={suggestionStatusFilter}
                    onChange={(e) => {
                      setSuggestionStatusFilter(e.target.value);
                      fetchSuggestions(undefined, e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved (ready to apply)</option>
                    <option value="APPLIED">Applied</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              )}

              {selectedSuggestions.size > 0 && (
                <div className="mb-4 flex flex-col md:flex-row gap-2">
                  <button
                    onClick={handleApproveSuggestions}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm w-full md:w-auto"
                  >
                    Approve Selected ({selectedSuggestions.size})
                  </button>
                  <button
                    onClick={handleRejectSuggestions}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm w-full md:w-auto"
                  >
                    Reject Selected ({selectedSuggestions.size})
                  </button>
                  <button
                    onClick={handleApplySuggestions}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm w-full md:w-auto"
                  >
                    Apply Approved ({selectedSuggestions.size})
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {suggestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    No suggestions found
                  </div>
                ) : (
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.has(suggestion.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedSuggestions);
                            if (e.target.checked) {
                              newSet.add(suggestion.id);
                            } else {
                              newSet.delete(suggestion.id);
                            }
                            setSelectedSuggestions(newSet);
                          }}
                          className="mt-1 w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{suggestion.field_name}</span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(
                                suggestion.confidence
                              )}`}
                            >
                              {suggestion.confidence}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                suggestion.status === 'PENDING'
                                  ? 'bg-yellow-50 text-yellow-700'
                                  : suggestion.status === 'APPROVED'
                                  ? 'bg-green-50 text-green-700'
                                  : suggestion.status === 'APPLIED'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {suggestion.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Current:</p>
                              <p className="text-sm text-gray-700 font-mono">
                                {suggestion.current_value || '(empty)'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Suggested:</p>
                              <p className="text-sm text-green-700 font-mono font-medium">
                                {suggestion.suggested_value}
                              </p>
                            </div>
                          </div>

                          {suggestion.evidence_url && (
                            <p className="text-xs text-gray-600">
                              Source: <a href={suggestion.evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{suggestion.evidence_url}</a>
                              {suggestion.evidence_type && ` (${suggestion.evidence_type})`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
