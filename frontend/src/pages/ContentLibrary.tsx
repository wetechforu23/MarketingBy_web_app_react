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
  approved_by_name?: string;
  client_name: string;
  created_at: string;
  updated_at: string;
  post_count: number;
  posted_count: number;
}

const ContentLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false); // Start with false to prevent black screen
  // For admin users, null means "All Clients", undefined means "not initialized yet"
  const [selectedClient, setSelectedClient] = useState<number | null | undefined>(undefined);
  const [clients, setClients] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isClientUser, setIsClientUser] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'content' | 'scheduled'>('content');
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  // Fetch current user to determine role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await http.get('/auth/me');
        const userData = response.data;
        setUser(userData);
        
        // Check if user is client_admin or client_user
        const isClient = userData.role === 'client_admin' || userData.role === 'client_user';
        setIsClientUser(isClient);
        
        // If client user, automatically set their client_id
        if (isClient && userData.client_id) {
          console.log('👤 Client user detected, auto-setting client_id:', userData.client_id);
          setSelectedClient(userData.client_id);
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
      }
    };
    
    fetchUser();
  }, []);

  useEffect(() => {
    // Only fetch clients if user is NOT a client user (admins need to select clients)
    if (!isClientUser) {
      fetchClients();
    }
  }, [isClientUser]);

  useEffect(() => {
    // Fetch contents and stats when filters change
    // For client users: always fetch (they can only see their own content)
    // For admin users: fetch if client is selected OR if "All Clients" is selected (selectedClient is null)
    // Don't fetch if selectedClient is still undefined (initial state)
    if (activeView === 'content') {
      if (isClientUser) {
        // Client users: always fetch
        fetchContents();
        fetchStats();
      } else if (selectedClient !== undefined) {
        // Admin users: fetch if selectedClient is set (null = All Clients, number = specific client)
        fetchContents();
        fetchStats();
      } else {
        // Admin user but not initialized yet - show empty state
        setContents([]);
        setStats(null);
        setLoading(false);
      }
    } else if (activeView === 'scheduled') {
      fetchScheduledPosts();
    }
  }, [selectedClient, statusFilter, platformFilter, searchQuery, isClientUser, activeView]);

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
      
      // Initialize selectedClient to null (All Clients) for admin users after clients are loaded
      if (!isClientUser && selectedClient === undefined) {
        setSelectedClient(null);
      }
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
      
      // Exclude scheduled status from Content Library (scheduled posts show in Scheduled Posts tab)
      // If user selects "scheduled" in status filter, we'll still exclude it and show empty
      if (statusFilter !== 'all' && statusFilter !== 'scheduled') {
        params.status = statusFilter;
      } else if (statusFilter === 'all') {
        // When showing all, exclude scheduled status
        params.exclude_status = 'scheduled';
      }
      
      if (platformFilter !== 'all') params.platform = platformFilter;
      if (searchQuery) params.search = searchQuery;

      console.log('🔍 Fetch params:', params);
      const response = await http.get('/content', { params });
      console.log('✅ Contents fetched:', response.data);
      console.log('📊 Response structure:', {
        hasContent: !!response.data.content,
        contentLength: response.data.content?.length || 0,
        total: response.data.total,
        success: response.data.success
      });
      
      // Handle both response formats: { content: [...] } or { content: { content: [...] } }
      const contentList = response.data.content || response.data || [];
      console.log('📦 Final content list:', contentList.length, 'items');
      setContents(Array.isArray(contentList) ? contentList : []);
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
      const params: any = {};
      
      // For client users, always filter by their client_id
      if (selectedClient) {
        params.client_id = selectedClient;
      }
      
      const response = await http.get('/content/stats/overview', { params });
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

  const getStatusColor = (status: string) => {
    const colors: any = {
      draft: 'bg-gray-100 text-gray-800',
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

  // Generate time options in 10-minute intervals
  const generateTimeOptions = (): string[] => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = minute.toString().padStart(2, '0');
        options.push(`${hourStr}:${minuteStr}`);
      }
    }
    return options;
  };

  const fetchScheduledPosts = async () => {
    setScheduledLoading(true);
    try {
      const params: any = { status: 'scheduled' };
      if (selectedClient) {
        // Note: The API should filter by client_id automatically based on user role
      }
      console.log('📅 Fetching scheduled posts with params:', params);
      
      // First, try debug endpoint to see all scheduled posts
      try {
        const debugResponse = await http.get('/posts/debug/scheduled');
        console.log('🔍 [DEBUG] All scheduled posts (no filters):', debugResponse.data);
        console.log('🔍 [DEBUG] Count:', debugResponse.data.count);
      } catch (debugError) {
        console.log('⚠️ Debug endpoint not available');
      }
      
      const response = await http.get('/posts', { params });
      console.log('✅ Scheduled posts response:', response.data);
      console.log('📊 Number of scheduled posts:', response.data.posts?.length || 0);
      
      if (response.data.posts && response.data.posts.length > 0) {
        console.log('📋 First post:', response.data.posts[0]);
      }
      
      setScheduledPosts(response.data.posts || []);
    } catch (error: any) {
      console.error('❌ Error fetching scheduled posts:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      setScheduledPosts([]);
    } finally {
      setScheduledLoading(false);
    }
  };

  const handleCancelPost = async (postId: number) => {
    if (!confirm('Are you sure you want to cancel this scheduled post?')) return;

    try {
      await http.delete(`/posts/${postId}`);
      alert('✅ Post cancelled successfully');
      fetchScheduledPosts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to cancel post');
    }
  };

  const handleReschedulePost = async () => {
    if (!selectedPost || !rescheduleDate || !rescheduleTime) {
      alert('Please select both date and time');
      return;
    }

    const scheduledDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      alert('Scheduled time must be in the future');
      return;
    }

    try {
      await http.put(`/posts/${selectedPost.id}/reschedule`, {
        scheduledTime: scheduledDateTime.toISOString()
      });
      alert('✅ Post rescheduled successfully');
      setShowRescheduleModal(false);
      setSelectedPost(null);
      setRescheduleDate('');
      setRescheduleTime('');
      fetchScheduledPosts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reschedule post');
    }
  };

  const openRescheduleModal = (post: any) => {
    setSelectedPost(post);
    const scheduledDate = new Date(post.scheduled_time);
    setRescheduleDate(scheduledDate.toISOString().split('T')[0]);
    const hours = scheduledDate.getHours().toString().padStart(2, '0');
    const minutes = Math.floor(scheduledDate.getMinutes() / 10) * 10;
    setRescheduleTime(`${hours}:${minutes.toString().padStart(2, '0')}`);
    setShowRescheduleModal(true);
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

        {/* Client Selector - Only show for admins, not for client users */}
        {!isClientUser && clients.length > 0 && (
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
              value={selectedClient === undefined ? 'all' : (selectedClient || 'all')}
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
            <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>
              ✅ Approved
              {stats.latest_approved_by && (
                <span style={{ fontSize: '11px', display: 'block', marginTop: '4px', opacity: 0.85 }}>
                  by {stats.latest_approved_by}
                </span>
              )}
            </p>
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

      {/* View Tabs */}
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        marginBottom: '20px',
        display: 'flex',
        gap: '10px'
      }}>
        <button
          onClick={() => setActiveView('content')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            background: activeView === 'content' 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
              : '#f7fafc',
            color: activeView === 'content' ? 'white' : '#4a5568',
            transition: 'all 0.2s'
          }}
        >
          📚 Content Library
        </button>
        <button
          onClick={() => setActiveView('scheduled')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            background: activeView === 'scheduled' 
              ? 'linear-gradient(135deg, #2E86AB 0%, #1E6A8A 100%)' 
              : '#f7fafc',
            color: activeView === 'scheduled' ? 'white' : '#4a5568',
            transition: 'all 0.2s'
          }}
        >
          📅 Scheduled Posts
        </button>
      </div>

      {/* Filters (only show for content view) */}
      {activeView === 'content' && (
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
      )}

      {/* Content Grid */}
      {activeView === 'content' && (
      <>
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
                  <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Approved By</th>
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
                    <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                      {content.approved_by_name || '-'}
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
      </>
      )}

      {/* Scheduled Posts View */}
      {activeView === 'scheduled' && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {scheduledLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
              Loading scheduled posts...
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>📅 No scheduled posts</p>
              <p style={{ fontSize: '14px' }}>Schedule posts from the Content Library</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #2E86AB 0%, #1E6A8A 100%)', color: 'white' }}>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Content Title</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Platform</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Scheduled Time</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Client</th>
                    <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledPosts.map((post, index) => (
                    <tr key={post.id} style={{ 
                      borderBottom: index < scheduledPosts.length - 1 ? '1px solid #e2e8f0' : 'none',
                      background: index % 2 === 0 ? 'white' : '#f7fafc'
                    }}>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                        {post.content_title || 'Untitled'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '20px' }}>{getPlatformIcon(post.platform)}</span>
                        <span style={{ marginLeft: '8px', fontSize: '14px', color: '#4a5568', textTransform: 'capitalize' }}>
                          {post.platform}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                        {new Date(post.scheduled_time).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#4a5568' }}>
                        {post.client_name || '-'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => openRescheduleModal(post)}
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
                            title="Reschedule"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleCancelPost(post.id)}
                            style={{
                              background: '#e53e3e',
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                            title="Cancel"
                          >
                            ❌ Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedPost && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
          onClick={() => setShowRescheduleModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '25px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#2d3748'
              }}>
                ✏️ Reschedule Post
              </h2>
              <button
                onClick={() => setShowRescheduleModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#a0aec0',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '25px' }}>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f7fafc', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', color: '#4a5568', marginBottom: '5px' }}>
                  <strong>Content:</strong> {selectedPost.content_title || 'Untitled'}
                </p>
                <p style={{ fontSize: '14px', color: '#4a5568' }}>
                  <strong>Platform:</strong> {getPlatformIcon(selectedPost.platform)} {selectedPost.platform}
                </p>
              </div>

              {/* Date Picker */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2d3748',
                  fontSize: '15px'
                }}>
                  Select New Date *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Time Picker (10-minute intervals) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2d3748',
                  fontSize: '15px'
                }}>
                  Select New Time (10-minute intervals) *
                </label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid #e2e8f0',
                    fontSize: '15px',
                    cursor: 'pointer',
                    background: 'white'
                  }}
                >
                  <option value="">Select time...</option>
                  {generateTimeOptions().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '25px'
              }}>
                <button
                  onClick={handleReschedulePost}
                  disabled={!rescheduleDate || !rescheduleTime}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #2E86AB 0%, #1E6A8A 100%)',
                    color: '#ffffff',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: !rescheduleDate || !rescheduleTime ? 'not-allowed' : 'pointer',
                    opacity: !rescheduleDate || !rescheduleTime ? 0.5 : 1
                  }}
                >
                  ✅ Reschedule Post
                </button>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  style={{
                    flex: 1,
                    background: 'white',
                    color: '#4a5568',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentLibrary;

