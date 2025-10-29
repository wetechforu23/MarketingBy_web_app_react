import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface FacebookFullDataProps {
  clientId: number;
  refreshKey: number;
}

const FacebookFullData: React.FC<FacebookFullDataProps> = ({ clientId, refreshKey }) => {
  const [loading, setLoading] = useState(true);
  const [fullData, setFullData] = useState<any>(null);
  const [followerHistory, setFollowerHistory] = useState<any>(null);
  const [analyticsByType, setAnalyticsByType] = useState<any[]>([]);
  const [bestTimes, setBestTimes] = useState<any[]>([]);
  const [engagementTrend, setEngagementTrend] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'posts' | 'analytics' | 'insights'>('overview');

  useEffect(() => {
    fetchAllData();
  }, [clientId, refreshKey]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      console.log(`📊 [FULL DATA API] Fetching ALL comprehensive Facebook data for client ${clientId}...`);

      // Fetch comprehensive full data
      const fullDataRes = await http.get(`/facebook/full-data/${clientId}?limit=100`);
      if (fullDataRes.data.success) {
        setFullData(fullDataRes.data.data);
        console.log('✅ [FULL DATA] Loaded:', fullDataRes.data.data);
      }

      // Fetch follower history
      try {
        const followerRes = await http.get(`/facebook/follower-history/${clientId}?days=28`);
        if (followerRes.data.success) {
          setFollowerHistory(followerRes.data.data);
          console.log('✅ [FOLLOWER HISTORY] Loaded');
        }
      } catch (err) {
        console.log('⚠️ Follower history not available');
      }

      // Fetch analytics by type
      try {
        const typeRes = await http.get(`/facebook/analytics/by-type/${clientId}`);
        if (typeRes.data.success) {
          setAnalyticsByType(typeRes.data.data);
          console.log('✅ [ANALYTICS BY TYPE] Loaded');
        }
      } catch (err) {
        console.log('⚠️ Analytics by type not available');
      }

      // Fetch best times to post
      try {
        const timesRes = await http.get(`/facebook/analytics/best-time/${clientId}`);
        if (timesRes.data.success) {
          setBestTimes(timesRes.data.data);
          console.log('✅ [BEST TIMES] Loaded');
        }
      } catch (err) {
        console.log('⚠️ Best times not available');
      }

      // Fetch engagement trend
      try {
        const trendRes = await http.get(`/facebook/analytics/engagement-trend/${clientId}?days=30`);
        if (trendRes.data.success) {
          setEngagementTrend(trendRes.data.data);
          console.log('✅ [ENGAGEMENT TREND] Loaded');
        }
      } catch (err) {
        console.log('⚠️ Engagement trend not available');
      }

    } catch (error) {
      console.error('❌ [FULL DATA API] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      console.log('🔄 [REFRESH] Syncing fresh data from Facebook...');
      await http.post(`/facebook/refresh-full-data/${clientId}`);
      await fetchAllData();
    } catch (error) {
      console.error('❌ [REFRESH] Error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        marginTop: '20px',
        textAlign: 'center', 
        padding: '60px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '48px', color: '#4267B2' }}></i>
        <p style={{ marginTop: '20px', color: '#666', fontSize: '16px' }}>Loading comprehensive Facebook data...</p>
      </div>
    );
  }

  if (!fullData) {
    return (
      <div style={{ 
        marginTop: '20px', 
        padding: '40px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '12px',
        border: '2px solid #ffc107'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>⚠️ No Facebook Data Available</h4>
        <p style={{ margin: 0, color: '#856404', lineHeight: '1.6' }}>
          Please click "Refresh All Data" button below to sync your Facebook data.
        </p>
      </div>
    );
  }

  const { overview, posts, analytics } = fullData;

  return (
    <div style={{ marginTop: '20px' }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '30px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          border: '2px solid #4267B2'
        }}>
          {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '25px',
          paddingBottom: '20px',
          borderBottom: '2px solid #e9ecef'
        }}>
          <h3 style={{ margin: 0, color: '#4267B2', fontSize: '28px', fontWeight: '700' }}>
            📊 Facebook Full Data & Analytics
          </h3>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#4267B2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 8px rgba(66, 103, 178, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
            {loading ? 'Syncing...' : 'Refresh All Data'}
          </button>
        </div>

        {/* Sub Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '30px',
          borderBottom: '2px solid #e9ecef',
          paddingBottom: '0',
          overflowX: 'auto'
        }}>
          {[
            { id: 'overview', icon: '📊', label: 'Overview' },
            { id: 'posts', icon: '📝', label: 'Post Performance' },
            { id: 'analytics', icon: '📈', label: 'Advanced Analytics' },
            { id: 'insights', icon: '🎯', label: 'Deep Insights' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                padding: '14px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeSubTab === tab.id ? '3px solid #4267B2' : '3px solid transparent',
                color: activeSubTab === tab.id ? '#4267B2' : '#6c757d',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeSubTab === 'overview' && (
          <div>
            {/* Page Overview Metrics */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>📄 Page Overview</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '20px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  padding: '25px',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Page Views</div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold' }}>{overview?.pageViews?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>📘 Last 28 Days</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  padding: '25px',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(245, 87, 108, 0.3)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Followers</div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold' }}>{overview?.followers?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>👥 Fans</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  padding: '25px',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Reach</div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold' }}>{overview?.reach?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>👁️ Unique</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  padding: '25px',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(67, 233, 123, 0.3)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Impressions</div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold' }}>{overview?.impressions?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>👀 Views</div>
                </div>

                <div style={{
                  background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  padding: '25px',
                  borderRadius: '12px',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(250, 112, 154, 0.3)'
                }}>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Engagement</div>
                  <div style={{ fontSize: '42px', fontWeight: 'bold' }}>{overview?.engagement?.toLocaleString() || 0}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>💬 Users</div>
                </div>
              </div>
            </div>

            {/* Content Summary */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>📊 Content Summary</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '15px'
              }}>
                {[
                  { label: 'Total Posts', value: analytics.totalPosts, color: '#667eea', icon: '📝' },
                  { label: 'Total Reactions', value: analytics.totalReactions, color: '#f5576c', icon: '❤️' },
                  { label: 'Total Comments', value: analytics.totalComments, color: '#4facfe', icon: '💬' },
                  { label: 'Total Shares', value: analytics.totalShares, color: '#43e97b', icon: '🔄' },
                  { label: 'Total Impressions', value: analytics.totalImpressions, color: '#fa709a', icon: '👁️' },
                  { label: 'Avg Engagement', value: analytics.avgEngagementPerPost, color: '#30cfd0', icon: '💯' }
                ].map((metric, idx) => (
                  <div 
                    key={idx}
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '20px',
                      borderRadius: '10px',
                      border: `2px solid ${metric.color}`,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{metric.icon}</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: metric.color }}>
                      {metric.value?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reaction Breakdown */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>💕 Reaction Breakdown</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                {[
                  { emoji: '❤️', name: 'Like', count: analytics.reactionBreakdown.like, color: '#4267B2' },
                  { emoji: '😍', name: 'Love', count: analytics.reactionBreakdown.love, color: '#f5576c' },
                  { emoji: '😂', name: 'Haha', count: analytics.reactionBreakdown.haha, color: '#ffc107' },
                  { emoji: '😮', name: 'Wow', count: analytics.reactionBreakdown.wow, color: '#17a2b8' },
                  { emoji: '😢', name: 'Sad', count: analytics.reactionBreakdown.sad, color: '#6c757d' },
                  { emoji: '😠', name: 'Angry', count: analytics.reactionBreakdown.angry, color: '#dc3545' }
                ].map((reaction) => {
                  const total = Object.values(analytics.reactionBreakdown).reduce((a: any, b: any) => a + b, 0);
                  const percentage = total > 0 ? ((reaction.count / total) * 100).toFixed(1) : 0;
                  
                  return (
                    <div 
                      key={reaction.name}
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '10px',
                        textAlign: 'center',
                        border: `2px solid ${reaction.color}`,
                        transition: 'transform 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ fontSize: '36px', marginBottom: '10px' }}>{reaction.emoji}</div>
                      <div style={{ fontSize: '26px', fontWeight: 'bold', color: reaction.color }}>
                        {reaction.count}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '5px', fontWeight: '600' }}>{reaction.name}</div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>{percentage}%</div>
                      <div style={{
                        marginTop: '10px',
                        height: '6px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: reaction.color,
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Post Performance Tab */}
        {activeSubTab === 'posts' && (
          <div>
            <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>
              📝 All Posts ({posts.length} total)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {posts.slice(0, 20).map((post: any, index: number) => {
                const totalReactions = (post.reactions_like || 0) + (post.reactions_love || 0) + 
                                     (post.reactions_haha || 0) + (post.reactions_wow || 0) + 
                                     (post.reactions_sad || 0) + (post.reactions_angry || 0);
                
                return (
                  <div 
                    key={post.post_id}
                    style={{
                      backgroundColor: '#f8f9fa',
                      padding: '25px',
                      borderRadius: '12px',
                      border: '1px solid #e9ecef',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          marginBottom: '10px'
                        }}>
                          <span style={{
                            backgroundColor: '#4267B2',
                            color: 'white',
                            padding: '5px 15px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '700'
                          }}>
                            #{index + 1}
                          </span>
                          <span style={{ fontSize: '13px', color: '#666' }}>
                            📅 {new Date(post.created_time).toLocaleDateString()} • 
                            {new Date(post.created_time).toLocaleTimeString()}
                          </span>
                          {post.post_type && (
                            <span style={{
                              backgroundColor: '#28a745',
                              color: 'white',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase'
                            }}>
                              {post.post_type}
                            </span>
                          )}
                        </div>
                        <p style={{ 
                          margin: '0 0 15px 0', 
                          fontSize: '15px', 
                          color: '#333',
                          lineHeight: '1.6'
                        }}>
                          {post.message ? post.message.substring(0, 200) + (post.message.length > 200 ? '...' : '') : 'No text'}
                        </p>
                        {post.permalink_url && (
                          <a 
                            href={post.permalink_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              color: '#4267B2',
                              fontSize: '13px',
                              textDecoration: 'none',
                              fontWeight: '600'
                            }}
                          >
                            🔗 View on Facebook →
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                      gap: '15px',
                      marginTop: '20px',
                      paddingTop: '20px',
                      borderTop: '2px solid #dee2e6'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4267B2' }}>
                          {post.post_impressions || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Impressions</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#f5576c' }}>
                          {totalReactions}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Reactions</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffc107' }}>
                          {post.comments_count || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Comments</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#17a2b8' }}>
                          {post.shares_count || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Shares</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#6c757d' }}>
                          {post.post_engaged_users || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Engaged</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#9c27b0' }}>
                          {post.post_clicks || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Clicks</div>
                      </div>
                    </div>

                    {/* Reaction Details */}
                    {totalReactions > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '1px solid #dee2e6',
                        fontSize: '14px',
                        flexWrap: 'wrap'
                      }}>
                        {post.reactions_like > 0 && <span>❤️ {post.reactions_like}</span>}
                        {post.reactions_love > 0 && <span>😍 {post.reactions_love}</span>}
                        {post.reactions_haha > 0 && <span>😂 {post.reactions_haha}</span>}
                        {post.reactions_wow > 0 && <span>😮 {post.reactions_wow}</span>}
                        {post.reactions_sad > 0 && <span>😢 {post.reactions_sad}</span>}
                        {post.reactions_angry > 0 && <span>😠 {post.reactions_angry}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {posts.length > 20 && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#666'
              }}>
                Showing 20 of {posts.length} posts. Scroll to see more.
              </div>
            )}
          </div>
        )}

        {/* Advanced Analytics Tab */}
        {activeSubTab === 'analytics' && (
          <div>
            {/* Content Type Performance */}
            {analyticsByType.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>
                  📊 Content Performance by Type
                </h4>
                <div style={{ display: 'grid', gap: '15px' }}>
                  {analyticsByType.map((type: any) => (
                    <div 
                      key={type.post_type}
                      style={{
                        backgroundColor: '#f8f9fa',
                        padding: '20px',
                        borderRadius: '10px',
                        border: '2px solid #4267B2'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h5 style={{ margin: 0, color: '#4267B2', textTransform: 'capitalize', fontSize: '18px' }}>
                          {type.post_type || 'Unknown'} Posts
                        </h5>
                        <span style={{ 
                          backgroundColor: '#4267B2',
                          color: 'white',
                          padding: '5px 15px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '700'
                        }}>
                          {type.post_count} posts
                        </span>
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: '15px'
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#666' }}>Total Impressions</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4267B2' }}>
                            {parseInt(type.total_impressions || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#666' }}>Total Reach</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                            {parseInt(type.total_reach || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#666' }}>Total Engagement</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffc107' }}>
                            {parseInt(type.total_engaged_users || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#666' }}>Avg Impressions</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#17a2b8' }}>
                            {parseFloat(type.avg_impressions || 0).toFixed(0)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#666' }}>Avg Engagement</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                            {parseFloat(type.avg_engagement || 0).toFixed(0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best Times to Post */}
            {bestTimes.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>
                  ⏰ Best Times to Post (Top 10)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                  {bestTimes.map((time: any, idx: number) => (
                    <div 
                      key={idx}
                      style={{
                        backgroundColor: idx < 3 ? '#fff3cd' : '#f8f9fa',
                        padding: '20px',
                        borderRadius: '10px',
                        border: `2px solid ${idx < 3 ? '#ffc107' : '#dee2e6'}`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        {idx < 3 && <span style={{ fontSize: '24px' }}>🏆</span>}
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                            {time.dayOfWeek} at {time.hour}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {time.postCount} posts
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        <div>Avg Engagement: <strong>{time.avgEngagement}</strong></div>
                        <div>Avg Impressions: <strong>{time.avgImpressions}</strong></div>
                        <div>Avg Reach: <strong>{time.avgReach}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Trend */}
            {engagementTrend.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>
                  📈 Engagement Trend (Last 30 Days)
                </h4>
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '10px'
                }}>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {engagementTrend.slice(0, 15).map((day: any, idx: number) => (
                      <div 
                        key={idx}
                        style={{
                          backgroundColor: 'white',
                          padding: '15px',
                          borderRadius: '8px',
                          border: '1px solid #dee2e6',
                          display: 'grid',
                          gridTemplateColumns: '120px 1fr',
                          gap: '15px',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#4267B2' }}>
                          {new Date(day.date).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                          <span>📝 {day.post_count} posts</span>
                          <span>👁️ {parseInt(day.total_impressions || 0).toLocaleString()}</span>
                          <span>💬 {parseInt(day.total_engaged_users || 0).toLocaleString()} engaged</span>
                          <span>❤️ {parseInt(day.total_reactions || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Deep Insights Tab */}
        {activeSubTab === 'insights' && (
          <div>
            <h4 style={{ margin: '0 0 20px 0', color: '#333', fontSize: '20px' }}>
              🎯 Deep Insights & Recommendations
            </h4>
            
            {/* Content Health Score */}
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '25px',
              borderRadius: '12px',
              border: '2px solid #4267B2',
              marginBottom: '30px'
            }}>
              <h5 style={{ margin: '0 0 20px 0', color: '#4267B2' }}>🏆 Content Health Score</h5>
              <div style={{ display: 'grid', gap: '15px' }}>
                {[
                  { 
                    label: 'Engagement Health', 
                    score: Math.min(100, (analytics.avgEngagementPerPost / 50) * 100),
                    color: '#4267B2',
                    description: 'Based on avg engagement per post'
                  },
                  { 
                    label: 'Content Frequency', 
                    score: Math.min(100, (analytics.totalPosts / 30) * 100),
                    color: '#28a745',
                    description: 'Based on posting frequency'
                  },
                  { 
                    label: 'Audience Interaction', 
                    score: Math.min(100, ((analytics.totalComments + analytics.totalShares) / analytics.totalPosts) * 10),
                    color: '#ffc107',
                    description: 'Based on comments + shares per post'
                  },
                  { 
                    label: 'Reach Performance', 
                    score: Math.min(100, (analytics.totalImpressions / (analytics.totalPosts * 100)) * 100),
                    color: '#17a2b8',
                    description: 'Based on impressions per post'
                  }
                ].map((metric) => (
                  <div key={metric.label}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '10px',
                      fontSize: '15px',
                      fontWeight: '600'
                    }}>
                      <span>{metric.label}</span>
                      <span style={{ color: metric.color }}>{Math.round(metric.score)}%</span>
                    </div>
                    <div style={{
                      height: '16px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '5px'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${metric.score}%`,
                        backgroundColor: metric.color,
                        transition: 'width 0.5s ease-in-out',
                        borderRadius: '8px'
                      }}></div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{metric.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Insights */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              {/* Engagement Insight */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #4267B2'
              }}>
                <h5 style={{ margin: '0 0 15px 0', color: '#4267B2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>💬</span>
                  Engagement Overview
                </h5>
                <div style={{ fontSize: '14px', color: '#666', lineHeight: '2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Interactions:</span>
                    <strong>{(analytics.totalReactions + analytics.totalComments + analytics.totalShares).toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Reactions:</span>
                    <strong style={{ color: '#f5576c' }}>{analytics.totalReactions.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Comments:</span>
                    <strong style={{ color: '#4facfe' }}>{analytics.totalComments.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Shares:</span>
                    <strong style={{ color: '#43e97b' }}>{analytics.totalShares.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Performance Insight */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #28a745'
              }}>
                <h5 style={{ margin: '0 0 15px 0', color: '#28a745', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>📊</span>
                  Performance Metrics
                </h5>
                <div style={{ fontSize: '14px', color: '#666', lineHeight: '2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Posts:</span>
                    <strong>{analytics.totalPosts}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Avg Engagement/Post:</span>
                    <strong style={{ color: '#28a745' }}>{Math.round(analytics.avgEngagementPerPost)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Impressions:</span>
                    <strong style={{ color: '#ffc107' }}>{analytics.totalImpressions.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Avg Impressions/Post:</span>
                    <strong>{analytics.totalPosts > 0 ? Math.round(analytics.totalImpressions / analytics.totalPosts) : 0}</strong>
                  </div>
                </div>
              </div>

              {/* Content Insight */}
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                border: '2px solid #dc3545'
              }}>
                <h5 style={{ margin: '0 0 15px 0', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  Content Insights
                </h5>
                <div style={{ fontSize: '14px', color: '#666', lineHeight: '2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Most Used Reaction:</span>
                    <strong>
                      {Object.entries(analytics.reactionBreakdown)
                        .reduce((a: any, b: any) => a[1] > b[1] ? a : b)[0]
                        .charAt(0).toUpperCase() + 
                       Object.entries(analytics.reactionBreakdown)
                        .reduce((a: any, b: any) => a[1] > b[1] ? a : b)[0].slice(1)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Engagement Rate:</span>
                    <strong style={{ color: '#dc3545' }}>
                      {analytics.totalPosts > 0 
                        ? ((analytics.totalReactions + analytics.totalComments + analytics.totalShares) / analytics.totalPosts).toFixed(1) 
                        : 0}%
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Comments per Post:</span>
                    <strong>{analytics.totalPosts > 0 ? (analytics.totalComments / analytics.totalPosts).toFixed(1) : 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Shares per Post:</span>
                    <strong>{analytics.totalPosts > 0 ? (analytics.totalShares / analytics.totalPosts).toFixed(1) : 0}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div style={{
              marginTop: '30px',
              backgroundColor: '#d1ecf1',
              padding: '25px',
              borderRadius: '12px',
              border: '2px solid #17a2b8'
            }}>
              <h5 style={{ margin: '0 0 15px 0', color: '#0c5460' }}>💡 Recommendations</h5>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#0c5460', lineHeight: '1.8' }}>
                {analytics.avgEngagementPerPost < 10 && (
                  <li>Consider posting more engaging content with questions or calls-to-action</li>
                )}
                {analytics.totalPosts < 10 && (
                  <li>Increase posting frequency - aim for at least 3-4 posts per week</li>
                )}
                {analytics.totalShares < analytics.totalReactions * 0.1 && (
                  <li>Create more shareable content - infographics, tips, and valuable information</li>
                )}
                {bestTimes.length > 0 && (
                  <li>Best time to post: {bestTimes[0].dayOfWeek} at {bestTimes[0].hour} - schedule posts accordingly</li>
                )}
                {analytics.totalComments < analytics.totalReactions * 0.2 && (
                  <li>Encourage more conversations by asking questions in your posts</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookFullData;
