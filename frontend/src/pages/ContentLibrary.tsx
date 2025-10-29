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
    fetchContents();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchContents();
    fetchStats();
  }, [selectedClient, statusFilter, platformFilter, searchQuery]);

  const fetchClients = async () => {
    try {
      console.log('📊 Fetching clients...');
      const response = await http.get('/clients');
      console.log('✅ Clients fetched:', response.data);
      console.log('📋 Number of clients:', response.data.clients?.length || 0);
      if (response.data.clients && response.data.clients.length > 0) {
        console.log('👤 First client:', response.data.clients[0]);
      }
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      setClients([]);
    }
  };

  const fetchContents = async () => {
    setLoading(true);
    try {
      console.log('📚 Fetching contents for client:', selectedClient);
      const params: any = {};
      
      // Add client filter
      if (selectedClient) {
        params.client_id = selectedClient;
      }
      
      if (statusFilter !== 'all') params.status = statusFilter;
      if (platformFilter !== 'all') params.platform = platformFilter;
      if (searchQuery) params.search = searchQuery;

      console.log('🔍 Fetch params:', params);
      const response = await http.get('/content', { params });
      console.log('✅ Contents fetched:', response.data);
      setContents(response.data.content || []);
    } catch (error) {
      console.error('❌ Error fetching contents:', error);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('📈 Fetching stats...');
      const response = await http.get('/content/stats/overview');
      console.log('✅ Stats fetched:', response.data);
      setStats(response.data.stats);
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      setStats(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      await http.delete(`/content/${id}`);
      fetchContents();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete content');
    }
  };

  const handleDuplicate = async (id: number) => {
    try {
      await http.post(`/content/${id}/duplicate`);
      fetchContents();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to duplicate content');
    }
  };

  const handleRepost = async (id: number) => {
    if (!confirm('🔄 Repost this content?\n\nThis will post the same content again with NEW UTM tracking parameters.')) return;

    try {
      const response = await http.post(`/content/${id}/repost`);
      alert('✅ Content reposted successfully!\n\n' + (response.data.message || 'Posted with new UTM tracking'));
      fetchContents();
      fetchStats();
    } catch (error: any) {
      alert('❌ Failed to repost\n\n' + (error.response?.data?.error || 'Please try again'));
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

  const getStatusStyle = (status: string) => {
    const styles: any = {
      draft: { background: '#e2e8f0', color: '#2d3748' },
      pending_wtfu_approval: { background: '#fef3c7', color: '#92400e' },
      pending_client_approval: { background: '#dbeafe', color: '#1e40af' },
      approved: { background: '#d1fae5', color: '#065f46' },
      rejected: { background: '#fee2e2', color: '#991b1b' },
      posted: { background: '#e9d5ff', color: '#6b21a8' },
      scheduled: { background: '#c7d2fe', color: '#3730a3' },
      failed: { background: '#fee2e2', color: '#991b1b' },
    };
    return styles[status] || { background: '#e2e8f0', color: '#2d3748' };
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
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f7fa', 
      padding: '30px'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: '#1a202c',
              marginBottom: '8px'
            }}>
              📚 Content Library
            </h1>
            <p style={{ 
              color: '#718096', 
              fontSize: '16px' 
            }}>
              Create, manage, and schedule social media content across multiple platforms
            </p>
          </div>
          <button
            onClick={() => navigate('/app/content-library/create')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
            }}
          >
            <span style={{ fontSize: '20px' }}>+</span>
            Create New Content
          </button>
        </div>

        {/* Client Selector */}
        {clients.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '8px'
            }}>
              Select Client
            </label>
            <select
              value={selectedClient || 'all'}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedClient(value === 'all' ? null : Number(value));
              }}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '10px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '15px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.client_name || client.business_name || client.name || `Client ${client.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.2)',
            color: 'white'
          }}>
            <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>📝 Draft</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.draft_count || 0}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(240, 147, 251, 0.2)',
            color: 'white'
          }}>
            <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>⏳ Pending Approval</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>
              {parseInt(stats.pending_wtfu_count || 0) + parseInt(stats.pending_client_count || 0)}
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(79, 172, 254, 0.2)',
            color: 'white'
          }}>
            <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>✅ Approved</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.approved_count || 0}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(67, 233, 123, 0.2)',
            color: 'white'
          }}>
            <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>🚀 Posted</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.posted_count || 0}</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 4px 15px rgba(250, 112, 154, 0.2)',
            color: 'white'
          }}>
            <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>📊 Total</p>
            <p style={{ fontSize: '32px', fontWeight: 'bold' }}>{stats.total_count || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        marginBottom: '30px'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#2d3748', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔍 Filter & Search
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px'
        }}>
          {/* Search */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '8px'
            }}>
              🔎 Search
            </label>
            <input
              type="text"
              placeholder="Search by title or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '15px'
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '8px'
            }}>
              📋 Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '15px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="draft">📝 Draft</option>
              <option value="pending_wtfu_approval">⏳ Pending WeTechForU</option>
              <option value="pending_client_approval">⏳ Pending Client</option>
              <option value="approved">✅ Approved</option>
              <option value="posted">🚀 Posted</option>
              <option value="rejected">❌ Rejected</option>
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#4a5568',
              marginBottom: '8px'
            }}>
              📱 Platform
            </label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '15px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
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
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ color: '#718096', fontSize: '16px', fontWeight: '500' }}>Loading content...</p>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      ) : contents.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          padding: '60px 30px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📭</div>
          <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#2d3748', marginBottom: '10px' }}>
            No content found
          </h3>
          <p style={{ color: '#718096', marginBottom: '25px', fontSize: '15px' }}>
            Start creating amazing social media content for your clients!
          </p>
          <button
            onClick={() => navigate('/app/content-library/create')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span> Create Your First Content
          </button>
        </div>
      ) : (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Title</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Status</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Platforms</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Client</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Created By</th>
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Created Date</th>
                  <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contents.map((content, index) => (
                  <tr 
                    key={content.id} 
                    style={{ 
                      borderBottom: '1px solid #e2e8f0',
                      background: index % 2 === 0 ? 'white' : '#f7fafc',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#edf2f7'}
                    onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#f7fafc'}
                  >
                    <td style={{ padding: '16px', maxWidth: '250px' }}>
                      <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>
                        {content.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#718096', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {content.content_text}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        ...getStatusStyle(content.status)
                      }}>
                        {getStatusLabel(content.status)}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {content.target_platforms?.map((platform) => (
                          <span
                            key={platform}
                            style={{
                              background: '#f7fafc',
                              color: '#4a5568',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}
                          >
                            {getPlatformIcon(platform)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                      {content.client_name || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                      {content.created_by_name || '-'}
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568', whiteSpace: 'nowrap' }}>
                      {new Date(content.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {/* Only show Edit button if content is NOT posted */}
                        {content.status !== 'posted' && (
                          <button
                            onClick={() => navigate(`/app/content-library/${content.id}/edit`)}
                            style={{
                              background: '#4299e1',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Edit"
                          >
                            ✏️ Edit
                          </button>
                        )}
                        {/* Show Repost button ONLY for posted content */}
                        {content.status === 'posted' && (
                          <button
                            onClick={() => handleRepost(content.id)}
                            style={{
                              background: '#48bb78',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            title="Repost with new UTM tracking"
                            onMouseEnter={(e) => e.currentTarget.style.background = '#38a169'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#48bb78'}
                          >
                            🔄 Repost
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicate(content.id)}
                          style={{
                            background: '#a0aec0',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          title="Duplicate"
                        >
                          📋
                        </button>
                        <button
                          onClick={() => handleDelete(content.id)}
                          style={{
                            background: '#fc8181',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentLibrary;

