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
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsConfigured, setSettingsConfigured] = useState({
    wordpress: false,
    ai: false
  });
  
  // Testing state
  const [testingWordPress, setTestingWordPress] = useState(false);
  const [testingAI, setTestingAI] = useState(false);
  const [wpTestResult, setWpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: [] as string[],
    categories: [] as string[],
    tags: [] as string[],
    featured_image_url: '',
    image_photographer: '',
    image_photographer_url: '',
    author_name: ''
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
  
  // Preview modal
  const [previewBlog, setPreviewBlog] = useState<BlogPost | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Image generation modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<any[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  
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
  
  useEffect(() => {
    if (selectedClient && activeTab === 'settings') {
      fetchSettings();
    }
  }, [selectedClient, activeTab]);
  
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
  
  const fetchSettings = async () => {
    if (!selectedClient) return;
    
    setLoadingSettings(true);
    try {
      const response = await axios.get(`/api/blogs/settings/${selectedClient}`);
      
      if (response.data && response.data.settings) {
        const settings = response.data.settings;
        
        // Update configured status
        setSettingsConfigured({
          wordpress: settings.wordpress?.configured || false,
          ai: settings.ai?.configured || false
        });
        
        // Update AI max credits if available
        if (settings.ai?.max_credits) {
          setAiMaxCredits(parseInt(settings.ai.max_credits));
        }
        
        console.log('✅ Settings loaded:', settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };
  
  const testWordPressConnection = async () => {
    if (!selectedClient) return;
    
    setTestingWordPress(true);
    setWpTestResult(null);
    try {
      const response = await axios.post('/api/blogs/settings/test-wordpress', {
        client_id: selectedClient
      });
      
      setWpTestResult({
        success: true,
        message: response.data.message || '✅ WordPress connection successful!'
      });
    } catch (error: any) {
      setWpTestResult({
        success: false,
        message: error.response?.data?.error || '❌ Failed to connect to WordPress. Please check your credentials.'
      });
    } finally {
      setTestingWordPress(false);
    }
  };
  
  const testAIConnection = async () => {
    if (!selectedClient) return;
    
    setTestingAI(true);
    setAiTestResult(null);
    try {
      const response = await axios.post('/api/blogs/settings/test-ai', {
        client_id: selectedClient
      });
      
      setAiTestResult({
        success: true,
        message: response.data.message || '✅ Google AI API key is valid!'
      });
    } catch (error: any) {
      setAiTestResult({
        success: false,
        message: error.response?.data?.error || '❌ Failed to validate AI API key. Please check your credentials.'
      });
    } finally {
      setTestingAI(false);
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
  
  const generateImages = async () => {
    if (!formData.title) {
      alert('Please enter a blog title first. The AI will search for images based on your title.');
      return;
    }
    
    setGeneratingImages(true);
    setShowImageModal(true);
    
    try {
      const response = await axios.post('/api/blogs/generate-image', {
        query: formData.title,
        orientation: 'landscape'
      });
      
      setGeneratedImages(response.data.images);
    } catch (error: any) {
      alert(`Error generating images: ${error.response?.data?.error || error.message}`);
      setShowImageModal(false);
    } finally {
      setGeneratingImages(false);
    }
  };
  
  const selectGeneratedImage = async (image: any) => {
    // Track download with Unsplash (REQUIRED for API compliance)
    if (image.download_location) {
      try {
        await axios.post(`${API_BASE_URL}/api/blogs/track-unsplash-download`, {
          download_location: image.download_location
        });
        console.log('✅ Unsplash download tracked');
      } catch (error) {
        console.error('⚠️ Failed to track Unsplash download:', error);
      }
    }
    
    // Set image with attribution
    setFormData({ 
      ...formData, 
      featured_image_url: image.url,
      image_photographer: image.photographer,
      image_photographer_url: image.photographer_url
    });
    setShowImageModal(false);
    setGeneratedImages([]);
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
      tags: [],
      featured_image_url: '',
      image_photographer: '',
      image_photographer_url: '',
      author_name: ''
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
      tags: blog.tags || [],
      featured_image_url: blog.featured_image_url || '',
      image_photographer: blog.image_photographer || '',
      image_photographer_url: blog.image_photographer_url || '',
      author_name: blog.author_name || ''
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
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => {
                              setPreviewBlog(blog);
                              setShowPreview(true);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Preview
                          </button>
                          
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
                            <>
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
                                title="Publish directly to WordPress"
                              >
                                🚀 Publish Now
                              </button>
                            </>
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
                          
                          {blog.status === 'published' && blog.wordpress_url && (
                            <>
                              <button
                                onClick={() => window.open(blog.wordpress_url, '_blank')}
                                style={{
                                  padding: '6px 12px',
                                  background: '#17a2b8',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                                title="View on WordPress"
                              >
                                🌐 View Live
                              </button>
                              
                              <button
                                onClick={() => {
                                  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(blog.wordpress_url || '')}`;
                                  window.open(linkedInUrl, '_blank', 'width=600,height=600');
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: '#0077b5',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                                title="Share on LinkedIn"
                              >
                                💼 LinkedIn
                              </button>
                            </>
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
            
            {/* Featured Image */}
            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '2px dashed #ddd'
            }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '16px' }}>
                🖼️ Featured Image
              </label>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>
                Add a featured image to make your blog more attractive and improve social media sharing
              </p>
              
              {/* Current Image Preview */}
              {formData.featured_image_url && (
                <div style={{ marginBottom: '1rem' }}>
                  <img 
                    src={formData.featured_image_url} 
                    alt="Featured" 
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}
                  />
                  {/* Attribution (if from Unsplash) */}
                  {formData.image_photographer && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#666',
                      border: '1px solid #e0e0e0'
                    }}>
                      📸 Photo by{' '}
                      <a 
                        href={`${formData.image_photographer_url}?utm_source=MarketingBy&utm_medium=referral`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}
                      >
                        {formData.image_photographer}
                      </a>
                      {' '}on{' '}
                      <a 
                        href="https://unsplash.com?utm_source=MarketingBy&utm_medium=referral"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}
                      >
                        Unsplash
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => setFormData({ 
                      ...formData, 
                      featured_image_url: '',
                      image_photographer: '',
                      image_photographer_url: ''
                    })}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Remove Image
                  </button>
                </div>
              )}
              
              {/* Upload Options */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* Manual Upload */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setFormData({ ...formData, featured_image_url: event.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: 'none' }}
                    id="imageUpload"
                  />
                  <label
                    htmlFor="imageUpload"
                    style={{
                      display: 'inline-block',
                      padding: '10px 20px',
                      background: '#4682B4',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    📤 Upload Image
                  </label>
                </div>
                
                {/* AI Image Generation */}
                <button
                  onClick={generateImages}
                  disabled={!formData.title}
                  style={{
                    padding: '10px 20px',
                    background: !formData.title ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: !formData.title ? 'not-allowed' : 'pointer',
                    opacity: !formData.title ? 0.6 : 1
                  }}
                  title={!formData.title ? 'Please enter a blog title first' : 'Search for professional images'}
                >
                  🤖 Generate with AI
                </button>
                
                {/* Image URL */}
                <input
                  type="text"
                  value={formData.featured_image_url || ''}
                  onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                  placeholder="Or paste image URL"
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                💡 Recommended: 1200x628px (optimal for social media sharing)
              </div>
            </div>
            
            {/* Categories */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                📁 Categories
              </label>
              <input
                type="text"
                value={formData.categories.join(', ')}
                onChange={(e) => setFormData({ ...formData, categories: e.target.value.split(',').map(c => c.trim()).filter(c => c) })}
                placeholder="e.g., Healthcare Marketing, Digital Strategy, Patient Engagement"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Separate multiple categories with commas
              </div>
            </div>
            
            {/* Tags */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                🏷️ Tags
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                placeholder="e.g., SEO, social media, content marketing, lead generation"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                Tags help with searchability and organization
              </div>
            </div>
            
            {/* Author Name */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                👤 Author Name <span style={{ color: '#999', fontWeight: '400', fontSize: '12px' }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.author_name}
                onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                placeholder="e.g., WeTechForU Team, Dr. Smith, Marketing Department (Leave empty to hide author)"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                💡 Leave empty to hide author information on the blog post
              </div>
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
        <div style={{ padding: '0' }}>
          <div className="page-header" style={{ marginBottom: '1.5rem' }}>
            <h1>⚙️ Blog Settings</h1>
            <p className="text-muted">
              Configure WordPress and AI credentials for {clients.find(c => c.id === selectedClient)?.name || 'selected client'}
            </p>
          </div>
          
          {!selectedClient ? (
            <div className="card">
              <div style={{
                padding: '3rem',
                textAlign: 'center'
              }}>
                <i className="fas fa-info-circle" style={{ fontSize: '48px', color: '#ffc107', marginBottom: '1rem' }}></i>
                <p style={{ color: '#856404', marginBottom: 0, fontSize: '16px', fontWeight: '600' }}>
                  ⚠️ Please select a client first to manage their blog settings
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              
              {/* WordPress Credentials Section */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">
                      <i className="fas fa-wordpress" style={{ marginRight: '8px', color: '#4682B4' }}></i>
                      WordPress Publishing Credentials
                      {settingsConfigured.wordpress && (
                        <span style={{
                          marginLeft: '10px',
                          padding: '4px 12px',
                          background: '#28a745',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                          Configured
                        </span>
                      )}
                    </h2>
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      {settingsConfigured.wordpress 
                        ? 'Credentials are saved. Update them below if needed.'
                        : 'Configure WordPress for automated blog publishing'
                      }
                    </span>
                  </div>
                  {loadingSettings && (
                    <i className="fas fa-spinner fa-spin" style={{ color: '#4682B4', fontSize: '18px' }}></i>
                  )}
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '600px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        WordPress Site URL *
                      </label>
                      <input
                        type="url"
                        value={wpSiteUrl}
                        onChange={(e) => setWpSiteUrl(e.target.value)}
                        placeholder="https://clientwebsite.com"
                        className="form-control"
                        style={{
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                        Full URL including https://
                      </small>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        WordPress Username *
                      </label>
                      <input
                        type="text"
                        value={wpUsername}
                        onChange={(e) => setWpUsername(e.target.value)}
                        placeholder="admin or editor username"
                        className="form-control"
                        style={{
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        WordPress Application Password *
                      </label>
                      <input
                        type="password"
                        value={wpAppPassword}
                        onChange={(e) => setWpAppPassword(e.target.value)}
                        placeholder="xxxx xxxx xxxx xxxx"
                        className="form-control"
                        style={{
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                        NOT your WordPress password. Generate from Users → Profile → Application Passwords
                      </small>
                    </div>
                    
                    {/* Test WordPress Connection Button */}
                    <div>
                      <button
                        onClick={testWordPressConnection}
                        disabled={testingWordPress || !settingsConfigured.wordpress}
                        style={{
                          padding: '10px 20px',
                          background: testingWordPress ? '#6c757d' : '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: testingWordPress || !settingsConfigured.wordpress ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: !settingsConfigured.wordpress ? 0.5 : 1
                        }}
                      >
                        {testingWordPress ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Testing Connection...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-plug"></i>
                            Test WordPress Connection
                          </>
                        )}
                      </button>
                      {!settingsConfigured.wordpress && (
                        <small style={{ fontSize: '12px', color: '#856404', marginTop: '6px', display: 'block' }}>
                          💡 Save your credentials first to enable testing
                        </small>
                      )}
                    </div>
                    
                    {/* Test Result Display */}
                    {wpTestResult && (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        background: wpTestResult.success ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${wpTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                        color: wpTestResult.success ? '#155724' : '#721c24',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <i className={`fas fa-${wpTestResult.success ? 'check-circle' : 'exclamation-triangle'}`}></i>
                        {wpTestResult.message}
                      </div>
                    )}
                    
                    <div style={{
                      background: '#f8f9fa',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef',
                      fontSize: '13px',
                      lineHeight: '1.6'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#4682B4' }}>
                        <i className="fas fa-info-circle" style={{ marginRight: '6px' }}></i>
                        How to get Application Password:
                      </strong>
                      <ol style={{ paddingLeft: '1.2rem', margin: 0, color: '#666' }}>
                        <li>Log into WordPress admin (/wp-admin)</li>
                        <li>Go to: Users → Your Profile</li>
                        <li>Scroll to "Application Passwords"</li>
                        <li>Name: "MarketingBy Blog Publisher"</li>
                        <li>Click "Add New" and copy the password</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Google AI Credentials Section */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">
                      <i className="fas fa-robot" style={{ marginRight: '8px', color: '#4682B4' }}></i>
                      AI Blog Generation Settings
                      {settingsConfigured.ai && (
                        <span style={{
                          marginLeft: '10px',
                          padding: '4px 12px',
                          background: '#28a745',
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          <i className="fas fa-check-circle" style={{ marginRight: '4px' }}></i>
                          Configured
                        </span>
                      )}
                    </h2>
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      {settingsConfigured.ai 
                        ? 'AI credentials are saved. Update them below if needed.'
                        : 'Configure Google Gemini AI for content generation'
                      }
                    </span>
                  </div>
                  {loadingSettings && (
                    <i className="fas fa-spinner fa-spin" style={{ color: '#4682B4', fontSize: '18px' }}></i>
                  )}
                </div>
                
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gap: '1.25rem', maxWidth: '600px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        Google AI API Key *
                      </label>
                      <input
                        type="password"
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="form-control"
                        style={{
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                        Get from: https://makersuite.google.com/app/apikey
                      </small>
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        Maximum Free Credits (Tokens/Month)
                      </label>
                      <input
                        type="number"
                        value={aiMaxCredits}
                        onChange={(e) => setAiMaxCredits(parseInt(e.target.value))}
                        min="0"
                        step="10000"
                        className="form-control"
                        style={{
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                        Default: 100,000 tokens/month (~50 blog posts). Adjust based on client needs.
                      </small>
                    </div>
                    
                    {/* Test AI Connection Button */}
                    <div>
                      <button
                        onClick={testAIConnection}
                        disabled={testingAI || !settingsConfigured.ai}
                        style={{
                          padding: '10px 20px',
                          background: testingAI ? '#6c757d' : '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: testingAI || !settingsConfigured.ai ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: !settingsConfigured.ai ? 0.5 : 1
                        }}
                      >
                        {testingAI ? (
                          <>
                            <i className="fas fa-spinner fa-spin"></i>
                            Testing API Key...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-plug"></i>
                            Test AI API Key
                          </>
                        )}
                      </button>
                      {!settingsConfigured.ai && (
                        <small style={{ fontSize: '12px', color: '#856404', marginTop: '6px', display: 'block' }}>
                          💡 Save your API key first to enable testing
                        </small>
                      )}
                    </div>
                    
                    {/* Test Result Display */}
                    {aiTestResult && (
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: '6px',
                        background: aiTestResult.success ? '#d4edda' : '#f8d7da',
                        border: `1px solid ${aiTestResult.success ? '#c3e6cb' : '#f5c6cb'}`,
                        color: aiTestResult.success ? '#155724' : '#721c24',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <i className={`fas fa-${aiTestResult.success ? 'check-circle' : 'exclamation-triangle'}`}></i>
                        {aiTestResult.message}
                      </div>
                    )}
                    
                    <div style={{
                      background: '#f8f9fa',
                      padding: '1rem',
                      borderRadius: '6px',
                      border: '1px solid #e9ecef',
                      fontSize: '13px',
                      lineHeight: '1.6'
                    }}>
                      <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#4682B4' }}>
                        <i className="fas fa-lightbulb" style={{ marginRight: '6px' }}></i>
                        Credit Usage Info:
                      </strong>
                      <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#666' }}>
                        <li>Average blog post: ~2,000 tokens</li>
                        <li>100K credits = ~50 blog posts</li>
                        <li>Resets monthly automatically</li>
                        <li>Client-specific tracking enabled</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              <button
                onClick={async () => {
                  if (!selectedClient) return;
                  setSavingSettings(true);
                  
                  // Clear test results
                  setWpTestResult(null);
                  setAiTestResult(null);
                  
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
                    
                    // Refresh settings to update configured status
                    await fetchSettings();
                    
                    alert('✅ Settings saved successfully! You can now test the connections.');
                  } catch (error: any) {
                    alert('❌ Error saving settings: ' + (error.response?.data?.error || error.message));
                  } finally {
                    setSavingSettings(false);
                  }
                }}
                disabled={savingSettings || !selectedClient}
                className="btn btn-primary"
                style={{
                  padding: '12px 24px',
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
      
      {/* Image Selection Modal */}
      {showImageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '1000px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
                  🎨 Select a Featured Image
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
                  Professional, royalty-free images powered by Unsplash
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setGeneratedImages([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}
              >
                ×
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {generatingImages ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#667eea' }}></i>
                  <div style={{ marginTop: '1rem', color: '#666', fontSize: '18px' }}>
                    Searching for perfect images...
                  </div>
                </div>
              ) : generatedImages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                  <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🖼️</div>
                  <h3>No images found</h3>
                  <p style={{ color: '#666' }}>Try a different search term or upload your own image.</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px'
                }}>
                  {generatedImages.map((image, index) => (
                    <div
                      key={image.id || index}
                      onClick={() => selectGeneratedImage(image)}
                      style={{
                        cursor: 'pointer',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '2px solid #e0e0e0',
                        transition: 'all 0.3s ease',
                        background: '#f8f9fa'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.border = '2px solid #667eea';
                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(102, 126, 234, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.border = '2px solid #e0e0e0';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img
                        src={image.url_small || image.url}
                        alt={image.description || 'Blog image'}
                        style={{
                          width: '100%',
                          height: '180px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ padding: '12px' }}>
                        <div style={{
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {image.description || 'Click to select'}
                        </div>
                        {image.photographer && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#999',
                            marginBottom: '8px'
                          }}>
                            📸 Photo by{' '}
                            <a 
                              href={`${image.photographer_url}?utm_source=MarketingBy&utm_medium=referral`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: '#667eea',
                                textDecoration: 'none',
                                fontWeight: '500'
                              }}
                            >
                              {image.photographer}
                            </a>
                            {' '}on{' '}
                            <a 
                              href="https://unsplash.com?utm_source=MarketingBy&utm_medium=referral"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: '#667eea',
                                textDecoration: 'none',
                                fontWeight: '500'
                              }}
                            >
                              Unsplash
                            </a>
                          </div>
                        )}
                        <div style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          background: '#667eea',
                          color: 'white',
                          borderRadius: '4px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          ✅ Select This Image
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            {generatedImages.length > 0 && (
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #e0e0e0',
                background: '#f8f9fa',
                fontSize: '12px',
                color: '#666'
              }}>
                <p style={{ margin: 0 }}>
                  📸 Images provided by <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>Unsplash</a> • 
                  Free to use for your blog • High-resolution professional photography
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Preview Modal */}
      {showPreview && previewBlog && (
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>
                  👁️ Blog Preview
                </h2>
                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '14px' }}>
                  {previewBlog.generated_by === 'google_ai' ? '🤖 AI Generated' : '✍️ Manual'} • 
                  SEO Score: <span style={{ 
                    fontWeight: 'bold',
                    color: (previewBlog.seo_score || 0) >= 80 ? '#28a745' : (previewBlog.seo_score || 0) >= 60 ? '#ffc107' : '#dc3545'
                  }}>
                    {previewBlog.seo_score || 0}/100
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewBlog(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f0f0f0'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              >
                ×
              </button>
            </div>
            
            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Blog Title */}
              <h1 style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#222',
                marginBottom: '12px',
                lineHeight: '1.2'
              }}>
                {previewBlog.title}
              </h1>
              
              {/* Meta Info */}
              <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '2px solid #e0e0e0',
                flexWrap: 'wrap',
                fontSize: '14px',
                color: '#666'
              }}>
                <div>
                  <strong>Status:</strong> <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    background: '#f0f0f0',
                    marginLeft: '4px'
                  }}>
                    {previewBlog.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <strong>Created:</strong> {new Date(previewBlog.created_at).toLocaleDateString()}
                </div>
                {previewBlog.categories && previewBlog.categories.length > 0 && (
                  <div>
                    <strong>Categories:</strong> {previewBlog.categories.join(', ')}
                  </div>
                )}
                {previewBlog.tags && previewBlog.tags.length > 0 && (
                  <div>
                    <strong>Tags:</strong> {previewBlog.tags.join(', ')}
                  </div>
                )}
              </div>
              
              {/* Excerpt */}
              {previewBlog.excerpt && (
                <div style={{
                  background: '#f8f9fa',
                  padding: '16px',
                  borderLeft: '4px solid #4682B4',
                  marginBottom: '24px',
                  fontStyle: 'italic',
                  color: '#555',
                  fontSize: '16px',
                  lineHeight: '1.6'
                }}>
                  {previewBlog.excerpt}
                </div>
              )}
              
              {/* Featured Image */}
              {previewBlog.featured_image_url && (
                <div style={{ marginBottom: '24px' }}>
                  <img 
                    src={previewBlog.featured_image_url} 
                    alt={previewBlog.title}
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      maxHeight: '400px',
                      objectFit: 'cover'
                    }}
                  />
                  {/* Attribution (if from Unsplash) */}
                  {previewBlog.image_photographer && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px 12px',
                      background: '#f8f9fa',
                      borderRadius: '6px',
                      fontSize: '13px',
                      color: '#666',
                      border: '1px solid #e0e0e0',
                      textAlign: 'center'
                    }}>
                      📸 Photo by{' '}
                      <a 
                        href={`${previewBlog.image_photographer_url}?utm_source=MarketingBy&utm_medium=referral`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}
                      >
                        {previewBlog.image_photographer}
                      </a>
                      {' '}on{' '}
                      <a 
                        href="https://unsplash.com?utm_source=MarketingBy&utm_medium=referral"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: '500' }}
                      >
                        Unsplash
                      </a>
                    </div>
                  )}
                </div>
              )}
              
              {/* Blog Content */}
              <div 
                style={{
                  fontSize: '16px',
                  lineHeight: '1.8',
                  color: '#333'
                }}
                dangerouslySetInnerHTML={{ __html: previewBlog.content }}
              />
              
              {/* SEO Metadata Section */}
              <div style={{
                marginTop: '40px',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#4682B4' }}>
                  🔍 SEO Metadata
                </h3>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  {previewBlog.meta_title && (
                    <div>
                      <strong style={{ color: '#555' }}>Meta Title:</strong>
                      <div style={{ 
                        marginTop: '4px',
                        padding: '8px',
                        background: 'white',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        {previewBlog.meta_title} 
                        <span style={{ color: '#999', marginLeft: '8px' }}>
                          ({previewBlog.meta_title.length} chars)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {previewBlog.meta_description && (
                    <div>
                      <strong style={{ color: '#555' }}>Meta Description:</strong>
                      <div style={{ 
                        marginTop: '4px',
                        padding: '8px',
                        background: 'white',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        {previewBlog.meta_description}
                        <span style={{ color: '#999', marginLeft: '8px' }}>
                          ({previewBlog.meta_description.length} chars)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {previewBlog.meta_keywords && previewBlog.meta_keywords.length > 0 && (
                    <div>
                      <strong style={{ color: '#555' }}>Keywords:</strong>
                      <div style={{ 
                        marginTop: '4px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {previewBlog.meta_keywords.map((keyword, idx) => (
                          <span key={idx} style={{
                            padding: '4px 12px',
                            background: '#4682B4',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '13px'
                          }}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white'
            }}>
              <button
                onClick={() => {
                  setShowPreview(false);
                  editBlog(previewBlog);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#4682B4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✏️ Edit Blog
              </button>
              
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewBlog(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;

