import React, { useState, useEffect } from 'react';
import axios from 'axios';

// =====================================================
// Interfaces
// =====================================================

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  status: string;
  view_count: number;
  unique_views: number;
  avg_time_on_page: number;
  bounce_rate: number;
  conversion_count: number;
  published_at: string;
}

interface Client {
  id: number;
  name: string;
}

interface Analytics {
  total_views: number;
  unique_visitors: number;
  avg_time_on_page: number;
  bounces: number;
  conversions: number;
  countries: number;
  cities: number;
}

// =====================================================
// BlogAnalytics Component
// =====================================================

const BlogAnalytics: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    fetchClients();
  }, []);
  
  useEffect(() => {
    if (selectedClient) {
      fetchPublishedBlogs();
    }
  }, [selectedClient]);
  
  useEffect(() => {
    if (selectedBlog) {
      fetchBlogAnalytics();
    }
  }, [selectedBlog]);
  
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
  
  const fetchPublishedBlogs = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/blogs/${selectedClient}`, {
        params: { status: 'published' }
      });
      setBlogs(response.data.posts);
      if (response.data.posts.length > 0) {
        setSelectedBlog(response.data.posts[0].id);
      } else {
        setSelectedBlog(null);
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching blogs:', error);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchBlogAnalytics = async () => {
    if (!selectedBlog) return;
    
    try {
      const response = await axios.get(`/api/blogs/${selectedBlog}/analytics`);
      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };
  
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };
  
  const selectedBlogData = blogs.find(b => b.id === selectedBlog);
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '0.5rem' }}>
          📊 Blog Analytics
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Track performance and engagement for your published blog posts
        </p>
      </div>
      
      {/* Filters */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
            Select Client:
          </label>
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
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
            Select Blog Post:
          </label>
          <select
            value={selectedBlog || ''}
            onChange={(e) => setSelectedBlog(parseInt(e.target.value))}
            disabled={blogs.length === 0}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              minWidth: '350px'
            }}
          >
            {blogs.length === 0 ? (
              <option value="">No published blogs</option>
            ) : (
              blogs.map(blog => (
                <option key={blog.id} value={blog.id}>
                  {blog.title}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#4682B4' }}></i>
          <div style={{ marginTop: '1rem', color: '#666' }}>Loading analytics...</div>
        </div>
      ) : blogs.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          background: '#f8f9fa',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📝</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No Published Blogs Yet</h3>
          <p style={{ color: '#666' }}>
            Publish a blog post to start tracking analytics
          </p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Total Views */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Total Views
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {selectedBlogData?.view_count || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '0.5rem' }}>
                👁️ All page views
              </div>
            </div>
            
            {/* Unique Visitors */}
            <div style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Unique Visitors
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {selectedBlogData?.unique_views || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '0.5rem' }}>
                👥 Individual visitors
              </div>
            </div>
            
            {/* Avg Time on Page */}
            <div style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Avg Time on Page
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {formatTime(selectedBlogData?.avg_time_on_page || 0)}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '0.5rem' }}>
                ⏱️ Engagement time
              </div>
            </div>
            
            {/* Bounce Rate */}
            <div style={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Bounce Rate
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {(Number(selectedBlogData?.bounce_rate) || 0).toFixed(1)}%
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '0.5rem' }}>
                🚪 Exit without action
              </div>
            </div>
            
            {/* Conversions */}
            <div style={{
              background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '0.5rem' }}>
                Conversions
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                {selectedBlogData?.conversion_count || 0}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '0.5rem' }}>
                ✅ Goal completions
              </div>
            </div>
          </div>
          
          {/* Detailed Analytics */}
          {analytics && (
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1.5rem' }}>
                Detailed Analytics
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem'
              }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                    Countries Reached
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#333' }}>
                    {analytics.countries} 🌍
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                    Cities Reached
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#333' }}>
                    {analytics.cities} 🏙️
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>
                    Total Bounces
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#333' }}>
                    {analytics.bounces}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Blog List Table */}
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '1rem' }}>
              All Published Blogs
            </h2>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Title</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Views</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Unique</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Avg Time</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Bounce %</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Conversions</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map(blog => (
                    <tr
                      key={blog.id}
                      style={{
                        borderBottom: '1px solid #e0e0e0',
                        background: selectedBlog === blog.id ? '#f0f8ff' : 'white',
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedBlog(blog.id)}
                    >
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600' }}>{blog.title}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{blog.slug}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700' }}>
                        {blog.view_count}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {blog.unique_views}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {formatTime(blog.avg_time_on_page)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          color: (blog.bounce_rate || 0) > 70 ? '#dc3545' : (blog.bounce_rate || 0) > 50 ? '#ffc107' : '#28a745',
                          fontWeight: '700'
                        }}>
                          {(Number(blog.bounce_rate) || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#28a745' }}>
                        {blog.conversion_count}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
                        {new Date(blog.published_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BlogAnalytics;

