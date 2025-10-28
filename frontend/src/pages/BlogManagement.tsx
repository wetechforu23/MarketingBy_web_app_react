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
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'ai'>('list');
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  
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
      
      // Ensure we have an array
      if (Array.isArray(response.data)) {
        setClients(response.data);
        if (response.data.length > 0) {
          setSelectedClient(response.data[0].id);
        }
      } else {
        console.warn('Unexpected clients API response:', response.data);
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
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '0.5rem' }}>
          📝 Blog Management
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Create, manage, and publish blog posts with AI-powered content generation
        </p>
      </div>
      
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
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          background: getStatusColor(blog.status) + '20',
                          color: getStatusColor(blog.status),
                          fontWeight: '600',
                          fontSize: '12px'
                        }}>
                          {getStatusIcon(blog.status)} {blog.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          fontWeight: '700',
                          color: (blog.seo_score || 0) >= 80 ? '#28a745' : (blog.seo_score || 0) >= 60 ? '#ffc107' : '#dc3545'
                        }}>
                          {blog.seo_score || 0}/100
                        </span>
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
    </div>
  );
};

export default BlogManagement;

