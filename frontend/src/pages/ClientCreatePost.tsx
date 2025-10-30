import React, { useState, useEffect } from 'react';
import { api } from '../api/http';

const ClientCreatePost: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [platformsAvailable, setPlatformsAvailable] = useState<{ [key: string]: boolean }>({ facebook: false });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook']);

  useEffect(() => {
    (async () => {
      const me = await api.get('/auth/me');
      setUser(me.data);
      if (me.data?.client_id) {
        try {
          const settingsRes = await api.get(`/clients/${me.data.client_id}/settings`);
          const available: any = {
            facebook: !!settingsRes.data?.facebook?.connected,
            linkedin: !!settingsRes.data?.linkedin?.connected,
            instagram: !!settingsRes.data?.instagram?.connected,
            twitter: !!settingsRes.data?.twitter?.connected,
            google_business: !!settingsRes.data?.googleBusiness?.connected,
          };
          setPlatformsAvailable(available);
          setSelectedPlatforms(available.facebook ? ['facebook'] : []);
        } catch (e) {
          // keep defaults if settings unavailable
        }
      }
    })();
  }, []);

  const submit = async () => {
    if (!user?.client_id) {
      alert('No client bound to user.');
      return;
    }
    if (!message.trim()) {
      alert('Write something to post.');
      return;
    }
    try {
      setLoading(true);
      setResultUrl(null);
      const messageWithTags = hashtags.length ? `${message}\n\n${hashtags.join(' ')}` : message;
      const body: any = { message: messageWithTags };
      if (mediaUrls.length) body.mediaUrls = mediaUrls;

      if (!selectedPlatforms.includes('facebook') || !platformsAvailable.facebook) {
        alert('Please select Facebook (connected) to post.');
        return;
      }

      const res = await api.post(`/facebook/posts/${user.client_id}`, body);
      if (res.data?.success) {
        setResultUrl(res.data?.data?.postUrl || null);
        setMessage('');
        setMediaUrlInput('');
        setMediaUrls([]);
        setHashtags([]);
        alert('Posted to Facebook successfully.');
      } else {
        alert(res.data?.error || 'Failed to post');
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Post error', {
        status: e?.response?.status,
        url: e?.response?.config?.url,
        data: e?.response?.data,
      });
      alert(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    const value = mediaUrlInput.trim();
    if (!mediaUrls.includes(value)) setMediaUrls([...mediaUrls, value]);
    setMediaUrlInput('');
  };

  const handleRemoveMediaUrl = (url: string) => {
    setMediaUrls(mediaUrls.filter(u => u !== url));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      setLoading(true);
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (response.data?.success && response.data?.url) {
          const absoluteUrl = `${window.location.origin}${response.data.url}`;
          uploaded.push(absoluteUrl);
        }
      }
      if (uploaded.length) setMediaUrls(prev => [...prev, ...uploaded]);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Upload error', {
        status: error?.response?.status,
        url: error?.response?.config?.url,
        data: error?.response?.data,
      });
      alert(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleAddHashtag = () => {
    if (!hashtagInput.trim()) return;
    const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
    if (!hashtags.includes(tag)) setHashtags([...hashtags, tag]);
    setHashtagInput('');
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  const togglePlatform = (id: string) => {
    if (!platformsAvailable[id]) return;
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Content</div>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>Write your engaging post here…</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              {message.length} characters
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Media</div>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>Add an image or video URL (optional)</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
              />
              <button onClick={handleAddMediaUrl} style={{ padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f3f4f6', fontWeight: 600 }}>Add</button>
            </div>
            <div style={{ marginTop: 10 }}>
              <input type="file" multiple accept="image/*" onChange={handleFileUpload} />
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {mediaUrls.map(url => (
                <div key={url} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px dashed #e5e7eb', padding: 8, borderRadius: 8 }}>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
                  <button onClick={() => handleRemoveMediaUrl(url)} style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: 8, padding: '0.4rem 0.6rem' }}>Remove</button>
                </div>
              ))}
              {!mediaUrls.length && (
                <div style={{ color: '#6b7280', fontSize: 12 }}>No media added yet</div>
              )}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>Tip: Facebook supports one video per post; multiple images become a carousel.</div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Hashtags</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                placeholder="Enter hashtag (without #)"
                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' }}
              />
              <button onClick={handleAddHashtag} style={{ padding: '0.6rem 0.9rem', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f3f4f6', fontWeight: 600 }}>Add</button>
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {hashtags.map(tag => (
                <span key={tag} style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 9999, padding: '6px 10px', fontWeight: 600 }}>
                  {tag}
                  <button onClick={() => handleRemoveHashtag(tag)} style={{ marginLeft: 8, border: 'none', background: 'transparent', color: '#1e40af', cursor: 'pointer' }}>×</button>
                </span>
              ))}
              {!hashtags.length && <span style={{ color: '#6b7280', fontSize: 12 }}>No hashtags added yet</span>}
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={submit}
                disabled={loading}
                style={{
                  background: '#1877f2', color: 'white', padding: '0.75rem 1.25rem', border: 'none', borderRadius: 10,
                  cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700
                }}
              >
                {loading ? 'Posting…' : 'Post to Facebook'}
              </button>
              <button
                onClick={() => window.history.back()}
                style={{ background: '#e5e7eb', color: '#111827', padding: '0.75rem 1rem', border: 'none', borderRadius: 10, fontWeight: 600 }}
              >
                Cancel
              </button>
            </div>

            {resultUrl && (
              <div style={{ marginTop: '1rem' }}>
                <a href={resultUrl} target="_blank" rel="noreferrer">View Post on Facebook</a>
              </div>
            )}
          </div>
        </div>

        <div style={{ width: 300 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Target Platforms</div>
            {[{id:'facebook',name:'Facebook',icon:'📘'},
              {id:'linkedin',name:'LinkedIn',icon:'💼'},
              {id:'instagram',name:'Instagram',icon:'📷'},
              {id:'twitter',name:'Twitter/X',icon:'🐦'},
              {id:'google_business',name:'Google Business',icon:'📍'}].map(p => {
                const connected = !!platformsAvailable[p.id];
                const selected = selectedPlatforms.includes(p.id);
                return (
                  <div key={p.id} onClick={() => togglePlatform(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 8, opacity: connected ? 1 : 0.6, cursor: connected ? 'pointer' : 'not-allowed', background: selected ? '#eff6ff' : 'white' }}>
                    <input type="checkbox" readOnly checked={selected} disabled={!connected} />
                    <span>{p.icon}</span>
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: connected ? '#10b981' : '#ef4444' }}>
                      {connected ? 'Connected' : 'Not configured'}
                    </span>
                  </div>
                );
              })}
            <div style={{ marginTop: 12, fontSize: 12, color: '#6b7280' }}>
              Direct posting currently supports Facebook. Other platforms will be enabled once connected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCreatePost;


