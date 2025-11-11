import React, { useState, useEffect } from 'react';
import { http } from '../api/http';
import { useNavigate } from 'react-router-dom';

interface PendingContent {
  id: number;
  client_id: number;
  title: string;
  content_text: string;
  media_urls: string[];
  hashtags: string[];
  target_platforms: string[];
  status: string;
  created_by_name: string;
  created_by_email: string;
  client_name: string;
  created_at: string;
  recent_history: any[];
}

const ApprovalQueue: React.FC = () => {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<PendingContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [selectedContent, setSelectedContent] = useState<PendingContent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'changes'>('approve');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchApprovals();
    fetchStats();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await http.get('/approvals/pending');
      setApprovals(response.data.approvals || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await http.get('/approvals/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleApprove = async (content: PendingContent) => {
    setSelectedContent(content);
    setActionType('approve');
    setNotes('');
    setShowModal(true);
  };

  const handleReject = async (content: PendingContent) => {
    setSelectedContent(content);
    setActionType('reject');
    setNotes('');
    setShowModal(true);
  };

  const handleRequestChanges = async (content: PendingContent) => {
    setSelectedContent(content);
    setActionType('changes');
    setNotes('');
    setShowModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedContent) return;

    setProcessing(true);

    try {
      const isClientApproval = selectedContent.status === 'pending_client_approval';

      if (actionType === 'approve') {
        await http.post(`/api/content/${selectedContent.id}/approve-client`, { notes });
        alert('Content approved successfully!');
      } else if (actionType === 'reject') {
        await http.post(`/api/content/${selectedContent.id}/reject-client`, { notes });
        alert('Content rejected');
      } else if (actionType === 'changes') {
        await http.post(`/api/content/${selectedContent.id}/request-changes`, { notes });
        alert('Changes requested');
      }

      setShowModal(false);
      setSelectedContent(null);
      setNotes('');
      fetchApprovals();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Action failed');
    } finally {
      setProcessing(false);
    }
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

  const getStatusLabel = (status: string) => {
    if (status === 'pending_client_approval') return 'Pending Client Approval';
    return status;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-gray-600 mt-1">Review and approve content before posting</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <p className="text-blue-700 text-sm">Pending Client</p>
            <p className="text-2xl font-bold text-blue-800">{stats.pending_client}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <p className="text-green-700 text-sm">Approved</p>
            <p className="text-2xl font-bold text-green-800">{stats.approved}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <p className="text-red-700 text-sm">Rejected</p>
            <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
          </div>
        </div>
      )}

      {/* Approval List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading approvals...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">No pending approvals</p>
          <button
            onClick={() => navigate('/app/content-library')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Go to Content Library
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((content) => (
            <div key={content.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <div className="flex gap-6">
                {/* Media Preview */}
                {content.media_urls && content.media_urls.length > 0 && (
                  <div className="w-48 h-32 flex-shrink-0">
                    <img
                      src={content.media_urls[0]}
                      alt={content.title}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3ENo Preview%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                )}

                {/* Content Details */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">{content.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>Client: {content.client_name}</span>
                        <span>•</span>
                        <span>Created by: {content.created_by_name}</span>
                        <span>•</span>
                        <span>{new Date(content.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      {getStatusLabel(content.status)}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-3 line-clamp-3">{content.content_text}</p>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {content.target_platforms?.map((platform) => (
                      <span
                        key={platform}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium"
                      >
                        {getPlatformIcon(platform)} {platform}
                      </span>
                    ))}
                  </div>

                  {/* Hashtags */}
                  {content.hashtags && content.hashtags.length > 0 && (
                    <p className="text-blue-600 text-sm mb-3">
                      {content.hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ')}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-3 border-t">
                    <button
                      onClick={() => navigate(`/app/content-library/${content.id}/edit`)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      👁️ Preview
                    </button>
                    <button
                      onClick={() => handleApprove(content)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold text-sm"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(content)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold text-sm"
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={() => handleRequestChanges(content)}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 font-semibold text-sm"
                    >
                      📝 Request Changes
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent History / Feedback */}
              {content.recent_history && content.recent_history.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">📝 Feedback & Comments:</p>
                  <div className="space-y-2">
                    {content.recent_history.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-semibold text-gray-800">
                            {item.approved_by_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                            {item.notes}
                          </p>
                        )}
                        <span className="text-xs text-gray-500 mt-1 block">
                          Type: {item.approval_type?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {showModal && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold mb-4">
              {actionType === 'approve' && '✓ Approve Content'}
              {actionType === 'reject' && '✗ Reject Content'}
              {actionType === 'changes' && '📝 Request Changes'}
            </h2>

            <p className="text-gray-700 mb-4">
              Content: <strong>{selectedContent.title}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes {actionType !== 'approve' && '(Required)'}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={
                  actionType === 'approve'
                    ? 'Optional approval notes...'
                    : actionType === 'reject'
                    ? 'Please explain why this content is being rejected...'
                    : 'Please specify what changes are needed...'
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleConfirmAction}
                disabled={processing || (actionType !== 'approve' && !notes.trim())}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold text-white disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : actionType === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedContent(null);
                  setNotes('');
                }}
                disabled={processing}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;

