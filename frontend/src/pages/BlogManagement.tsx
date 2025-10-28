import React, { useState, useEffect } from 'react';
import axios from 'axios';

// =====================================================
// Interfaces
// =====================================================

interface BlogPost {
  id: number;
  client_id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  seo_score?: number;
  generated_by: 'manual' | 'google_ai';
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'rejected' | 'archived';
  author_name?: string;
  categories?: string[];
  tags?: string[];
  view_count?: number;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: number;
  rejection_reason?: string;
}

interface Client {
  id: number;
  name: string;
  email: string;
}

// =====================================================
// BlogManagement Component
// =====================================================

const BlogManagement: React.FC = () => {
  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'ai' | 'settings'>('list');
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  
  // Settings state
  const [wpSiteUrl, setWpSiteUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiMaxCredits, setAiMaxCredits] = useState(100000);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: [] as string[],
    categories: [] as string[],
    tags: [] as string[]
  });
  
  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'casual' | 'friendly' | 'technical'>('professional');
  const [aiWordCount, setAiWordCount] = useState(1000);
  const [generating, setGenerating] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Help panels
  const [showSEOGuide, setShowSEOGuide] = useState(false);
  const [showPublishGuide, setShowPublishGuide] = useState(false);
  
  // ===================================================
  // Effects
  // ===================================================
  
  useEffect(() => {
    fetchClients();
  }, []);
  
  useEffect(() => {
    if (selectedClient) {
      fetchBlogs();
    }
  }, [selectedClient, statusFilter, searchQuery]);
  
  // ===================================================
  // API Calls
  // ===================================================
  
  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      
      // ✅ FIX: API returns {clients: [], pagination: {}} so extract the clients array
      const responseData = response.data;
      
      if (responseData.clients && Array.isArray(responseData.clients)) {
        setClients(responseData.clients);
        if (responseData.clients.length > 0) {
          setSelectedClient(responseData.clients[0].id);
        }
      } else if (Array.isArray(responseData)) {
        // Fallback: in case API returns array directly
        setClients(responseData);
        if (responseData.length > 0) {
          setSelectedClient(responseData[0].id);
        }
      } else {
        console.error('❌ Clients API returned unexpected format:', responseData);
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };
  
  const fetchBlogs = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      
      const response = await axios.get(`/api/blogs/${selectedClient}`, { params });
      
      // Ensure we have an array, fallback to empty array if not
      if (response.data && Array.isArray(response.data.posts)) {
        setBlogs(response.data.posts);
      } else if (response.data && Array.isArray(response.data)) {
        // In case backend returns array directly
        setBlogs(response.data);
      } else {
        console.warn('Unexpected API response format:', response.data);
        setBlogs([]);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBlogs([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  const createBlog = async () => {
    if (!selectedClient) return;
    
    try {
      const response = await axios.post('/api/blogs', {
        client_id: selectedClient,
        ...formData
      });
      
      alert('Blog post created successfully!');
      resetForm();
      setActiveTab('list');
      fetchBlogs();
    } catch (error: any) {
      alert(`Error creating blog: ${error.response?.data?.error || error.message}`);
    }
  };
  
  const generateBlogWithAI = async () => {
    if (!selectedClient || !aiPrompt) {
      alert('Please select a client and enter a prompt');
      return;
    }
    
    setGenerating(true);
    try {
      const response = await axios.post('/api/blogs/generate-ai', {
        client_id: selectedClient,
        prompt: aiPrompt,
        tone: aiTone,
        target_word_count: aiWordCount
      });
      
      const generatedBlog = response.data.post;
      
      // Populate form with AI-generated content
      setFormData({
        title: generatedBlog.title,
        content: generatedBlog.content,
        excerpt: generatedBlog.excerpt,
        meta_title: generatedBlog.meta_title,
        meta_description: generatedBlog.meta_description,
        meta_keywords: generatedBlog.meta_keywords || [],
        categories: [],
        tags: []
      });
      
      setEditingBlog(generatedBlog);
      setActiveTab('create');
      
      alert(`AI generated blog successfully! SEO Score: ${generatedBlog.seo_score}/100`);
    } catch (error: any) {
      alert(`Error generating blog: ${error.response?.data?.error || error.message}`);
    } finally {
      setGenerating(false);
    }
  };
  
  const updateBlog = async (blogId: number) => {
    try {
      await axios.put(`/api/blogs/${blogId}`, formData);
      alert('Blog updated successfully!');
      resetForm();
      setActiveTab('list');
      fetchBlogs();
    } catch (error: any) {
      alert(`Error updating blog: ${error.response?.data?.error || error.message}`);
    }
  };
  
  const deleteBlog = async (blogId: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    
    try {
      await axios.delete(`/api/blogs/${blogId}`);
      alert('Blog deleted successfully!');
      fetchBlogs();
    } catch (error: any) {
      alert(`Error deleting blog: ${error.response?.data?.error || error.message}`);
    }
  };
  
  const sendForApproval = async (blogId: number) => {
    try {
      const response = await axios.post(`/api/blogs/${blogId}/send-approval`);
      alert(`Blog sent for approval! Approval link: ${response.data.approval_url}`);
      fetchBlogs();
    } catch (error: any) {
      alert(`Error sending for approval: ${error.response?.data?.error || error.message}`);
    }
  };
  
  const publishBlog = async (blogId: number) => {
    if (!confirm('Are you sure you want to publish this blog to WordPress?')) return;
    
    try {
      const response = await axios.post(`/api/blogs/${blogId}/publish`);
      alert(`Blog published successfully! URL: ${response.data.url}`);
      fetchBlogs();
    } catch (error: any) {
      alert(`Error publishing blog: ${error.response?.data?.error || error.message}`);
    }
  };
  
  // ===================================================
  // Helper Functions
  // ===================================================
  
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: [],
      categories: [],
      tags: []
    });
    setEditingBlog(null);
    setAiPrompt('');
  };
  
  const editBlog = (blog: BlogPost) => {
    setFormData({
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt || '',
      meta_title: blog.meta_title || '',
      meta_description: blog.meta_description || '',
      meta_keywords: blog.meta_keywords || [],
      categories: blog.categories || [],
      tags: blog.tags || []
    });
    setEditingBlog(blog);
    setActiveTab('create');
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#6c757d';
      case 'pending_approval': return '#ffc107';
      case 'approved': return '#28a745';
      case 'published': return '#007bff';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return '📝';
      case 'pending_approval': return '⏳';
      case 'approved': return '✅';
      case 'published': return '🚀';
      case 'rejected': return '❌';
      default: return '📄';
    }
  };
  
  // ===================================================
  // Render
  // ===================================================
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700' }}>
            📝 Blog Management
          </h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowSEOGuide(!showSEOGuide)}
              style={{
                padding: '8px 16px',
                background: '#4682B4',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {showSEOGuide ? '✕' : '💡'} SEO Guide
            </button>
            <button
              onClick={() => setShowPublishGuide(!showPublishGuide)}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              {showPublishGuide ? '✕' : '🚀'} Publishing Guide
            </button>
          </div>
        </div>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Create, manage, and publish blog posts with AI-powered content generation
        </p>
      </div>
      
      {/* SEO Guide Panel */}
      {showSEOGuide && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span> Understanding SEO Score
          </h2>
          
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            <p style={{ marginBottom: '0.5rem', fontSize: '14px' }}><strong>What is SEO Score?</strong></p>
            <p style={{ fontSize: '13px', lineHeight: '1.6', opacity: 0.95 }}>
              SEO Score is a 0-100 rating that measures how well your blog post is optimized for search engines like Google. 
              Higher scores mean better chances of ranking in search results and getting organic traffic.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                🎯 Score Breakdown
              </div>
              <ul style={{ fontSize: '13px', lineHeight: '1.8', paddingLeft: '1.2rem', margin: 0 }}>
                <li><strong>80-100:</strong> Excellent - Ready to rank!</li>
                <li><strong>60-79:</strong> Good - Minor improvements needed</li>
                <li><strong>0-59:</strong> Needs work - Follow tips below</li>
              </ul>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                ✅ How to Improve
              </div>
              <ul style={{ fontSize: '13px', lineHeight: '1.8', paddingLeft: '1.2rem', margin: 0 }}>
                <li>Use focus keyword in title</li>
                <li>Write 150-160 char meta description</li>
                <li>Add 3-5 relevant keywords</li>
                <li>Use H2/H3 headings in content</li>
                <li>Aim for 1000+ words</li>
                <li>Include internal/external links</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Publishing Guide Panel */}
      {showPublishGuide && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚀</span> Publishing & Tracking Guide
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                📝 WordPress Publishing
              </div>
              <ol style={{ fontSize: '13px', lineHeight: '1.8', paddingLeft: '1.2rem', margin: 0 }}>
                <li>Approve blog post first</li>
                <li>Click "Publish to WordPress" button</li>
                <li>Enter WordPress credentials in Settings</li>
                <li>Post auto-publishes with SEO meta</li>
                <li>External URL will be saved</li>
              </ol>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                🌐 Custom Website (Embed Code)
              </div>
              <ol style={{ fontSize: '13px', lineHeight: '1.8', paddingLeft: '1.2rem', margin: 0 }}>
                <li>Copy blog HTML content</li>
                <li>Add to your website's HTML</li>
                <li>Include meta tags in &lt;head&gt;</li>
                <li>Add canonical URL tag</li>
                <li>Test on mobile & desktop</li>
              </ol>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '0.5rem' }}>
                📊 Google Analytics Setup
              </div>
              <ol style={{ fontSize: '13px', lineHeight: '1.8', paddingLeft: '1.2rem', margin: 0 }}>
                <li>Get GA4 tracking code from Google</li>
                <li>Add to website &lt;head&gt; section</li>
                <li>Set up custom events (page views, scroll, clicks)</li>
                <li>Monitor in Analytics dashboard</li>
                <li>Track conversions & goals</li>
              </ol>
            </div>
          </div>
          
          <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
              <strong>💡 Pro Tip:</strong> Use UTM parameters in your blog links to track traffic sources in Google Analytics. 
              Add ?utm_source=blog&utm_medium=content&utm_campaign=blog_name to your blog URLs when sharing on social media or email.
            </p>
          </div>
        </div>
      )}
      
      {/* Client Selector */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ fontWeight: '600', fontSize: '14px' }}>Select Client:</label>
        <select
          value={selectedClient || ''}
          onChange={(e) => setSelectedClient(parseInt(e.target.value))}
          style={{
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            fontSize: '14px',
            minWidth: '250px'
          }}
        >
          <option value="">-- Select a Client --</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Tabs */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #e0e0e0' }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'list' ? '3px solid #4682B4' : 'none',
              color: activeTab === 'list' ? '#4682B4' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            📋 All Blogs
          </button>
          <button
            onClick={() => { setActiveTab('create'); resetForm(); }}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'create' ? '3px solid #4682B4' : 'none',
              color: activeTab === 'create' ? '#4682B4' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            ✍️ Manual Create
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ai' ? '3px solid #4682B4' : 'none',
              color: activeTab === 'ai' ? '#4682B4' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            🤖 AI Generate
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '3px solid #4682B4' : 'none',
              color: activeTab === 'settings' ? '#4682B4' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'list' && (
        <div>
          {/* Filters */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
            
            <input
              type="text"
              placeholder="Search blogs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '14px',
                flex: 1,
                minWidth: '250px'
              }}
            />
            
            <button
              onClick={fetchBlogs}
              style={{
                padding: '10px 20px',
                background: '#4682B4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
          </div>
          
          {/* Blog List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#4682B4' }}></i>
              <div style={{ marginTop: '1rem', color: '#666' }}>Loading blogs...</div>
            </div>
          ) : !Array.isArray(blogs) || blogs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem',
              background: '#f8f9fa',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📝</div>
              <h3 style={{ marginBottom: '0.5rem' }}>No blog posts yet</h3>
              <p style={{ color: '#666' }}>Create your first blog post using Manual Create or AI Generate</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Title</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>SEO Score</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Views</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map(blog => (
                    <tr key={blog.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{blog.title}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {blog.generated_by === 'google_ai' && '🤖 AI Generated'}
                          {blog.generated_by === 'manual' && '✍️ Manual'}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            background: getStatusColor(blog.status) + '20',
                            color: getStatusColor(blog.status),
                            fontWeight: '600',
                            fontSize: '12px',
                            display: 'inline-block'
                          }}>
                            {getStatusIcon(blog.status)} {blog.status.replace('_', ' ')}
                          </span>
                          
                          {/* Show approval/rejection details */}
                          {blog.status === 'approved' && blog.approved_at && (
                            <div style={{ fontSize: '11px', color: '#28a745', marginTop: '4px' }}>
                              ✓ Approved {new Date(blog.approved_at).toLocaleDateString()}
                            </div>
                          )}
                          
                          {blog.status === 'rejected' && blog.rejection_reason && (
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#dc3545', 
                              marginTop: '4px',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={blog.rejection_reason}>
                              ✗ Reason: {blog.rejection_reason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div>
                          <span style={{
                            fontWeight: '700',
                            color: (blog.seo_score || 0) >= 80 ? '#28a745' : (blog.seo_score || 0) >= 60 ? '#ffc107' : '#dc3545'
                          }}>
                            {blog.seo_score || 0}/100
                          </span>
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            {(blog.seo_score || 0) >= 80 ? '🎯 Excellent' : 
                             (blog.seo_score || 0) >= 60 ? '⚠️ Good' : '❌ Needs Work'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {blog.view_count || 0}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                        {new Date(blog.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => editBlog(blog)}
                            style={{
                              padding: '6px 12px',
                              background: '#4682B4',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            ✏️ Edit
                          </button>
                          
                          {blog.status === 'draft' && (
                            <button
                              onClick={() => sendForApproval(blog.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#ffc107',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              📤 Send for Approval
                            </button>
                          )}
                          
                          {blog.status === 'approved' && (
                            <button
                              onClick={() => publishBlog(blog.id)}
                              style={{
                                padding: '6px 12px',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              🚀 Publish
                            </button>
                          )}
                          
                          <button
                            onClick={() => deleteBlog(blog.id)}
                            style={{
                              padding: '6px 12px',
                              background: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Delete
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
      
      {activeTab === 'create' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>
            {editingBlog ? '✏️ Edit Blog Post' : '✍️ Create New Blog Post'}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Title */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter blog title (50-60 characters recommended)"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {formData.title.length} characters
              </div>
            </div>
            
            {/* Content */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Content * (HTML supported)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter blog content with HTML tags..."
                rows={15}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
            </div>
            
            {/* Excerpt */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Excerpt
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief summary (2-3 sentences)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Meta Description */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Meta Description
              </label>
              <textarea
                value={formData.meta_description}
                onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                placeholder="SEO meta description (150-160 characters)"
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                {formData.meta_description.length} characters
              </div>
            </div>
            
            {/* Keywords */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={formData.meta_keywords.join(', ')}
                onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value.split(',').map(k => k.trim()) })}
                placeholder="keyword1, keyword2, keyword3"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => editingBlog ? updateBlog(editingBlog.id) : createBlog()}
                disabled={!formData.title || !formData.content}
                style={{
                  padding: '12px 32px',
                  background: formData.title && formData.content ? '#28a745' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: formData.title && formData.content ? 'pointer' : 'not-allowed'
                }}
              >
                {editingBlog ? '✅ Update Blog' : '💾 Save as Draft'}
              </button>
              
              <button
                onClick={() => { resetForm(); setActiveTab('list'); }}
                style={{
                  padding: '12px 32px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'ai' && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>🤖 Generate Blog with AI</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Prompt */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Blog Topic / Prompt *
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Example: Write a blog about the benefits of telehealth for elderly patients, including statistics and practical tips"
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Tone */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Tone
              </label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
              </select>
            </div>
            
            {/* Word Count */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Target Word Count
              </label>
              <input
                type="number"
                value={aiWordCount}
                onChange={(e) => setAiWordCount(parseInt(e.target.value))}
                min={300}
                max={2000}
                step={100}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            
            {/* Generate Button */}
            <button
              onClick={generateBlogWithAI}
              disabled={!aiPrompt || generating}
              style={{
                padding: '16px',
                background: aiPrompt && !generating ? '#4682B4' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '18px',
                cursor: aiPrompt && !generating ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {generating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generating blog with AI...
                </>
              ) : (
                '🤖 Generate Blog Post'
              )}
            </button>
            
            {/* Info Box */}
            <div style={{
              background: '#e3f2fd',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0d47a1'
            }}>
              <strong>💡 Tip:</strong> Be specific in your prompt for better results. 
              The AI will generate a complete blog post with proper HTML formatting, SEO meta tags, and keywords.
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '24px', fontWeight: '700' }}>
            ⚙️ Blog Settings for {clients.find(c => c.id === selectedClient)?.name || 'Client'}
          </h2>
          
          {!selectedClient ? (
            <div style={{
              padding: '2rem',
              background: '#fff3cd',
              borderRadius: '8px',
              border: '1px solid #ffc107',
              textAlign: 'center'
            }}>
              <p style={{ color: '#856404', marginBottom: 0 }}>
                ⚠️ Please select a client first to manage their blog settings
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '2rem' }}>
              
              {/* WordPress Credentials Section */}
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '2rem',
                borderRadius: '12px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📝</span> WordPress Publishing Credentials
                </h3>
                <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '1.5rem' }}>
                  Configure WordPress site details to enable one-click blog publishing
                </p>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600' }}>
                      WordPress Site URL *
                    </label>
                    <input
                      type="url"
                      value={wpSiteUrl}
                      onChange={(e) => setWpSiteUrl(e.target.value)}
                      placeholder="https://clientwebsite.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        fontSize: '14px',
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white'
                      }}
                    />
                    <small style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', display: 'block' }}>
                      Full URL including https://
                    </small>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600' }}>
                      WordPress Username *
                    </label>
                    <input
                      type="text"
                      value={wpUsername}
                      onChange={(e) => setWpUsername(e.target.value)}
                      placeholder="admin or editor username"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        fontSize: '14px',
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600' }}>
                      WordPress Application Password *
                    </label>
                    <input
                      type="password"
                      value={wpAppPassword}
                      onChange={(e) => setWpAppPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        fontSize: '14px',
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', display: 'block' }}>
                      NOT your WordPress password. Generate from Users → Profile → Application Passwords
                    </small>
                  </div>
                  
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1rem',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>📖 How to get Application Password:</strong>
                    <ol style={{ paddingLeft: '1.2rem', margin: 0 }}>
                      <li>Log into WordPress admin (/wp-admin)</li>
                      <li>Go to: Users → Your Profile</li>
                      <li>Scroll to "Application Passwords"</li>
                      <li>Name: "MarketingBy Blog Publisher"</li>
                      <li>Click "Add New" and copy the password</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              {/* Google AI Credentials Section */}
              <div style={{
                background: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
                padding: '2rem',
                borderRadius: '12px',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤖</span> AI Blog Generation Settings
                </h3>
                <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '1.5rem' }}>
                  Configure Google Gemini AI for automated blog content generation
                </p>
                
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600' }}>
                      Google AI API Key *
                    </label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        fontSize: '14px',
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white',
                        fontFamily: 'monospace'
                      }}
                    />
                    <small style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', display: 'block' }}>
                      Get from: https://makersuite.google.com/app/apikey
                    </small>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600' }}>
                      Maximum Free Credits (Tokens/Month)
                    </label>
                    <input
                      type="number"
                      value={aiMaxCredits}
                      onChange={(e) => setAiMaxCredits(parseInt(e.target.value))}
                      min="0"
                      step="10000"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.3)',
                        fontSize: '14px',
                        background: 'rgba(255,255,255,0.15)',
                        color: 'white'
                      }}
                    />
                    <small style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px', display: 'block' }}>
                      Default: 100,000 tokens/month (~50 blog posts). Adjust based on client needs.
                    </small>
                  </div>
                  
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '1rem',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}>
                    <strong style={{ display: 'block', marginBottom: '0.5rem' }}>💡 Credit Usage Info:</strong>
                    <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                      <li>Average blog post: ~2,000 tokens</li>
                      <li>100K credits = ~50 blog posts</li>
                      <li>Resets monthly automatically</li>
                      <li>Client-specific tracking enabled</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              <button
                onClick={async () => {
                  if (!selectedClient) return;
                  setSavingSettings(true);
                  try {
                    // Save WordPress credentials
                    if (wpSiteUrl && wpUsername && wpAppPassword) {
                      await axios.post('/api/blogs/settings/wordpress', {
                        client_id: selectedClient,
                        site_url: wpSiteUrl,
                        username: wpUsername,
                        app_password: wpAppPassword
                      });
                    }
                    
                    // Save AI credentials
                    if (aiApiKey) {
                      await axios.post('/api/blogs/settings/ai', {
                        client_id: selectedClient,
                        api_key: aiApiKey,
                        max_credits: aiMaxCredits
                      });
                    }
                    
                    alert('✅ Settings saved successfully!');
                  } catch (error: any) {
                    alert('❌ Error saving settings: ' + (error.response?.data?.error || error.message));
                  } finally {
                    setSavingSettings(false);
                  }
                }}
                disabled={savingSettings || !selectedClient}
                style={{
                  padding: '16px 32px',
                  background: savingSettings ? '#6c757d' : 'linear-gradient(135deg, #4682B4, #5a9fd4)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: savingSettings ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s ease'
                }}
              >
                {savingSettings ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Saving Settings...
                  </>
                ) : (
                  '💾 Save All Settings'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlogManagement;

