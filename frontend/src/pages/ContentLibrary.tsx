import React, { useState, useEffect } from 'react';
import { http } from '../api/http';
import { useNavigate } from 'react-router-dom';

interface Content {
  id: number;
  client_id: number;
  title: string;
  content_type: string;
  content_text: string;
  media_urls: string[];
  hashtags: string[];
  mentions: string[];
  target_platforms: string[];
  status: string;
  created_by: number;
  created_by_name: string;
  client_name: string;
  created_at: string;
  updated_at: string;
  post_count: number;
  posted_count: number;
}

const ContentLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      setSelectedClient(clients[0].id);
    }
  }, [clients]);

  useEffect(() => {
    if (selectedClient) {
      fetchContents();
      fetchStats();
    }
  }, [selectedClient, statusFilter, platformFilter, searchQuery]);

  const fetchClients = async () => {
    try {
      const response = await http.get('/api/clients');
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchContents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (platformFilter !== 'all') params.platform = platformFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await http.get('/api/content', { params });
      setContents(response.data.content || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await http.get('/api/content/stats/overview');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await http.delete(`/api/content/${id}`);
      fetchContents();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete content');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await http.post(`/api/content/${id}/duplicate`);
      fetchContents();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to duplicate content');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800',
      pending_wtfu_approval: 'bg-yellow-100 text-yellow-800',
      pending_client_approval: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      posted: 'bg-purple-100 text-purple-800',
      scheduled: 'bg-indigo-100 text-indigo-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      draft: 'Draft',
      pending_wtfu_approval: 'Pending WeTechForU',
      pending_client_approval: 'Pending Client',
      approved: 'Approved',
      rejected: 'Rejected',
      posted: 'Posted',
      scheduled: 'Scheduled',
      failed: 'Failed',
    };
    return labels[status] || status;
  };

  const getPlatformIcon = (platform: string) => {
    const icons: any = {
      facebook: '📘',
      linkedin: '💼',
      instagram: '📷',
      twitter: '🐦',
      google_business: '📍',
    };
    return icons[platform] || '📱';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Library</h1>
            <p className="text-gray-600 mt-1">Create, manage, and schedule social media content</p>
          </div>
          <button
            onClick={() => navigate('/app/content-library/create')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
          >
            <span>+</span>
            Create New Content
          </button>
        </div>

        {/* Client Selector */}
        {clients.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client
            </label>
            <select
              value={selectedClient || ''}
              onChange={(e) => setSelectedClient(Number(e.target.value))}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.business_name || client.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Draft</p>
            <p className="text-2xl font-bold text-gray-900">{stats.draft_count}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <p className="text-yellow-700 text-sm">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-800">
              {parseInt(stats.pending_wtfu_count) + parseInt(stats.pending_client_count)}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <p className="text-green-700 text-sm">Approved</p>
            <p className="text-2xl font-bold text-green-800">{stats.approved_count}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg shadow">
            <p className="text-purple-700 text-sm">Posted</p>
            <p className="text-2xl font-bold text-purple-800">{stats.posted_count}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <p className="text-blue-700 text-sm">Total</p>
            <p className="text-2xl font-bold text-blue-800">{stats.total_count}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by title or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_wtfu_approval">Pending WeTechForU</option>
              <option value="pending_client_approval">Pending Client</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform
            </label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Platforms</option>
              <option value="facebook">📘 Facebook</option>
              <option value="linkedin">💼 LinkedIn</option>
              <option value="instagram">📷 Instagram</option>
              <option value="twitter">🐦 Twitter</option>
              <option value="google_business">📍 Google Business</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading content...</p>
        </div>
      ) : contents.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">No content found</p>
          <button
            onClick={() => navigate('/app/content-library/create')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Create Your First Content
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contents.map((content) => (
            <div key={content.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Media Preview */}
              {content.media_urls && content.media_urls.length > 0 && (
                <div className="h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={content.media_urls[0]}
                    alt={content.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Preview%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}

              {/* Content Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg flex-1">{content.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(content.status)}`}>
                    {getStatusLabel(content.status)}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {content.content_text}
                </p>

                {/* Platforms */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {content.target_platforms?.map((platform) => (
                    <span
                      key={platform}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium"
                    >
                      {getPlatformIcon(platform)} {platform}
                    </span>
                  ))}
                </div>

                {/* Hashtags */}
                {content.hashtags && content.hashtags.length > 0 && (
                  <div className="mb-3">
                    <p className="text-blue-600 text-sm">
                      {content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}
                    </p>
                  </div>
                )}

                {/* Meta Info */}
                <div className="text-xs text-gray-500 mb-3">
                  <p>Created by: {content.created_by_name}</p>
                  <p>Created: {new Date(content.created_at).toLocaleDateString()}</p>
                  {content.posted_count > 0 && (
                    <p className="text-green-600 font-medium">✓ Posted to {content.posted_count} platform(s)</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/app/content-library/${content.id}/edit`)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(content.id)}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 text-sm font-medium"
                    title="Duplicate"
                  >
                    📋
                  </button>
                  {content.status === 'draft' && (
                    <button
                      onClick={() => handleDelete(content.id)}
                      className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 text-sm font-medium"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentLibrary;

