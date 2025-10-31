import React, { useState, useEffect } from 'react';
import { http } from '../api/http';
import { useNavigate, useParams } from 'react-router-dom';

interface ClientWithIntegrations {
  id: number;
  client_name?: string;
  business_name?: string;
  name?: string;
  integrations: {
    facebook: boolean;
    linkedin: boolean;
    instagram: boolean;
    twitter: boolean;
    google_business: boolean;
  };
}

interface ValidationResult {
  platform: string;
  isValid: boolean;
  errors: Array<{ field: string; message: string; severity: string }>;
  warnings: Array<{ field: string; message: string; severity: string }>;
}

const ContentEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [clients, setClients] = useState<ClientWithIntegrations[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithIntegrations | null>(null);
  const [formData, setFormData] = useState({
    clientId: 0,
    title: '',
    contentType: 'text',
    contentText: '',
    mediaUrls: [] as string[],
    hashtags: [] as string[],
    mentions: [] as string[],
    targetPlatforms: [] as string[],
  });

  const [hashtagInput, setHashtagInput] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validationResults, setValidationResults] = useState<{ [key: string]: ValidationResult }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [contentStatus, setContentStatus] = useState<string>('draft');

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2', maxLength: 63206, recommended: 500 },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0077b5', maxLength: 3000, recommended: 150 },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: '#e4405f', maxLength: 2200, recommended: 125 },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: '#1da1f2', maxLength: 280, recommended: 280 },
    { id: 'google_business', name: 'Google Business', icon: '📍', color: '#4285f4', maxLength: 1500, recommended: 500 },
  ];

  useEffect(() => {
    fetchClientsWithIntegrations();
  }, []);

  useEffect(() => {
    if (isEditMode && id) {
      // Fetch content immediately when in edit mode, don't wait for clients
      fetchContent();
    } else if (clients.length > 0 && !formData.clientId) {
      // For new content, set first client as default
      setFormData(prev => ({ ...prev, clientId: clients[0].id }));
      setSelectedClient(clients[0]);
    }
    
    // Update selected client when clients load and we have content
    if (clients.length > 0 && formData.clientId && !selectedClient) {
      const client = clients.find(c => c.id === formData.clientId);
      if (client) {
        setSelectedClient(client);
        console.log('✅ Client updated after clients loaded:', client);
      }
    }
  }, [clients, isEditMode, id]);

  const fetchClientsWithIntegrations = async () => {
    try {
      console.log('📊 Fetching clients with integrations...');
      const response = await http.get('/clients');
      const clientsData = response.data.clients || [];
      console.log(`📋 Found ${clientsData.length} clients:`, clientsData);
      
      // Fetch Facebook integrations for each client
      const clientsWithIntegrations = await Promise.all(
        clientsData.map(async (client: any) => {
          const clientName = client.client_name || client.business_name || client.name || `Client ${client.id}`;
          console.log(`🔍 Checking integrations for client ${client.id} (${clientName})...`);
          
          const integrations = {
            facebook: false,
            linkedin: false,
            instagram: false,
            twitter: false,
            google_business: false,
          };

          // Check Facebook integration
          try {
            const fbResponse = await http.get(`/facebook/test-credentials/${client.id}`);
            integrations.facebook = fbResponse.data.hasCredentials || false;
            console.log(`✅ Facebook check for client ${client.id} (${clientName}):`, {
              hasCredentials: fbResponse.data.hasCredentials,
              success: fbResponse.data.success,
              tokenValid: fbResponse.data.tokenValid,
              pageName: fbResponse.data.pageName
            });
          } catch (error: any) {
            console.log(`❌ Facebook check failed for client ${client.id} (${clientName}):`, {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status
            });
            integrations.facebook = false;
          }

          console.log(`📊 Final integrations for client ${client.id}:`, integrations);

          return {
            ...client,
            integrations,
          };
        })
      );

      console.log('📦 All clients with integration checks:', clientsWithIntegrations);

      // Only show clients with at least one integration
      const clientsWithIntegrationsAvailable = clientsWithIntegrations.filter(
        (client) => Object.values(client.integrations).some((v) => v)
      );

      console.log('✅ Clients with at least one integration:', clientsWithIntegrationsAvailable);
      
      if (clientsWithIntegrationsAvailable.length === 0) {
        console.warn('⚠️ WARNING: No clients have any social media integrations configured!');
        console.log('💡 TIP: Make sure Facebook credentials are saved in client_credentials table');
      }
      
      setClients(clientsWithIntegrationsAvailable);
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      setClients([]);
    }
  };

  const fetchContent = async () => {
    try {
      console.log('📥 Fetching content with ID:', id);
      const response = await http.get(`/content/${id}`);
      console.log('📦 Content response:', response.data);
      
      const content = response.data.content;
      
      if (!content) {
        console.error('❌ No content in response');
        alert('Content not found');
        return;
      }
      
      console.log('✅ Content data:', content);
      
      setFormData({
        clientId: content.client_id,
        title: content.title,
        contentType: content.content_type,
        contentText: content.content_text || '',
        mediaUrls: content.media_urls || [],
        hashtags: content.hashtags || [],
        mentions: content.mentions || [],
        targetPlatforms: content.target_platforms || [],
      });
      
      setContentStatus(content.status || 'draft');
      
      // Set selected client (will update when clients are loaded if not found now)
      if (clients.length > 0) {
        const client = clients.find(c => c.id === content.client_id);
        setSelectedClient(client || null);
        console.log('✅ Client set:', client);
      } else {
        console.log('⏳ Clients not loaded yet, will set later');
      }
      
      console.log('✅ Content loaded successfully');
    } catch (error: any) {
      console.error('❌ Error fetching content:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Failed to load content: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleClientChange = (clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    setFormData(prev => ({
      ...prev,
      clientId,
      // Clear platforms that aren't available for this client
      targetPlatforms: prev.targetPlatforms.filter(
        p => client?.integrations[p as keyof typeof client.integrations]
      ),
    }));
  };

  const handleAddHashtag = () => {
    if (!hashtagInput.trim()) return;
    const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
    if (!formData.hashtags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, tag]
      }));
    }
    setHashtagInput('');
  };

  const handleRemoveHashtag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(t => t !== tag)
    }));
  };

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    if (!formData.mediaUrls.includes(mediaUrlInput.trim())) {
      setFormData(prev => ({
        ...prev,
        mediaUrls: [...prev.mediaUrls, mediaUrlInput.trim()]
      }));
    }
    setMediaUrlInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await http.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          // Convert relative URL to full URL
          const imageUrl = `${window.location.origin}${response.data.url}`;
          uploadedUrls.push(imageUrl);
        }
      }

      // Add all uploaded URLs to media
      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          mediaUrls: [...prev.mediaUrls, ...uploadedUrls]
        }));
        alert(`✅ Successfully uploaded ${uploadedUrls.length} image(s)!`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`❌ Failed to upload image: ${error.response?.data?.error || error.message}`);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleRemoveMediaUrl = (url: string) => {
    setFormData(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter(u => u !== url)
    }));
  };

  const handleTogglePlatform = (platformId: string) => {
    const isAvailable = selectedClient?.integrations[platformId as keyof typeof selectedClient.integrations];
    if (!isAvailable) {
      alert(`${platformId} is not configured for this client. Please set up the integration first.`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platformId)
        ? prev.targetPlatforms.filter(p => p !== platformId)
        : [...prev.targetPlatforms, platformId]
    }));
  };

  const handleValidate = async () => {
    if (formData.targetPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setLoading(true);
    setShowValidation(true);

    try {
      let contentId = id;
      
      if (!isEditMode) {
        const saveResponse = await http.post('/content', formData);
        contentId = saveResponse.data.content.id;
      }

      const response = await http.post(`/content/${contentId}/validate`);
      setValidationResults(response.data.results || {});
    } catch (error: any) {
      console.error('Error validating:', error);
      alert('Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!formData.clientId) {
      alert('Please select a client');
      return;
    }

    if (formData.targetPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode) {
        await http.put(`/content/${id}`, formData);
        alert('Content updated successfully!');
      } else {
        const response = await http.post('/content', formData);
        alert('Content saved as draft!');
        navigate(`/app/content-library/${response.data.content.id}/edit`);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!formData.clientId) {
      alert('Please select a client');
      return;
    }

    if (formData.targetPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    if (!confirm('Submit this content for approval?')) return;

    setLoading(true);

    try {
      let contentId = id;

      if (!isEditMode) {
        const saveResponse = await http.post('/content', formData);
        contentId = saveResponse.data.content.id;
      } else {
        await http.put(`/content/${id}`, formData);
      }

      await http.post(`/content/${contentId}/submit-approval`);
      alert('Content submitted for approval!');
      navigate('/app/content-library');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit for approval');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStatus = async () => {
    if (!id) return;

    let nextAction = '';
    let confirmMessage = '';
    let successMessage = '';

    // Determine next action based on current status
    switch (contentStatus) {
      case 'draft':
        nextAction = 'submit-approval';
        confirmMessage = 'Submit this content for WeTechForU approval?';
        successMessage = 'Content submitted for approval!';
        break;
      case 'pending_wtfu_approval':
        nextAction = 'approve-wtfu';
        confirmMessage = 'Approve this content?';
        successMessage = 'Content approved!';
        break;
      case 'pending_client_approval':
        nextAction = 'approve-client';
        confirmMessage = 'Approve this content?';
        successMessage = 'Content approved!';
        break;
      case 'approved':
        nextAction = 'post-now';
        confirmMessage = 'Post this content to social media now?';
        successMessage = 'Content posted successfully!';
        break;
      default:
        alert('No next action available for this status');
        return;
    }

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      await http.post(`/content/${id}/${nextAction}`);
      alert(successMessage);
      navigate('/app/content-library');
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to ${nextAction}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusActionLabel = () => {
    switch (contentStatus) {
      case 'draft':
        return '📤 Submit for Approval';
      case 'pending_wtfu_approval':
        return '✅ Approve Content';
      case 'pending_client_approval':
        return '✅ Approve Content';
      case 'approved':
        return '🚀 Post to Social Media';
      case 'posted':
        return '✓ Already Posted';
      default:
        return 'Next Step';
    }
  };

  const canProgressStatus = () => {
    return ['draft', 'pending_wtfu_approval', 'pending_client_approval', 'approved'].includes(contentStatus);
  };

  const getCharacterCount = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return { current: 0, max: 0, recommended: 0, percentage: 0 };

    const current = formData.contentText.length;
    return {
      current,
      max: platform.maxLength,
      recommended: platform.recommended,
      percentage: (current / platform.maxLength) * 100
    };
  };

  const isPlatformAvailable = (platformId: string) => {
    if (!selectedClient) return false;
    return selectedClient.integrations[platformId as keyof typeof selectedClient.integrations];
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      padding: '40px 20px'
    }}>
      {/* Header */}
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h1 style={{ 
            fontSize: '36px', 
            fontWeight: 'bold', 
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            {isEditMode ? '✏️ Edit Content' : '✨ Create New Content'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
            Create engaging social media content for multiple platforms
          </p>
        </div>
        <button
          onClick={() => navigate('/app/content-library')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.3)',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
          }}
        >
          ← Back to Library
        </button>
      </div>

      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 400px',
        gap: '30px'
      }}>
        {/* Main Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Client Warning if no clients */}
          {clients.length === 0 && (
            <div style={{
              background: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#856404', marginBottom: '10px' }}>
                No Clients with Social Media Integrations
              </h3>
              <p style={{ color: '#856404', fontSize: '15px', marginBottom: '15px' }}>
                You need to set up at least one social media integration for a client before creating content.
              </p>
              <button
                onClick={() => navigate('/app/client-management-dashboard')}
                style={{
                  background: '#ffc107',
                  color: '#856404',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Go to Client Management
              </button>
            </div>
          )}

          {/* Basic Info */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '30px'
          }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '600', 
              marginBottom: '25px',
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              📋 Basic Information
            </h2>

            {/* Client Selector */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                marginBottom: '8px'
              }}>
                Client * <span style={{ color: '#e53e3e', fontSize: '12px' }}>(Only clients with integrations shown)</span>
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => handleClientChange(Number(e.target.value))}
                disabled={isEditMode || clients.length === 0}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '15px',
                  backgroundColor: isEditMode ? '#f7fafc' : 'white',
                  cursor: isEditMode ? 'not-allowed' : 'pointer'
                }}
              >
                <option value={0}>Select a client...</option>
                {clients.map((client) => {
                  const availablePlatforms = Object.entries(client.integrations)
                    .filter(([_, isAvailable]) => isAvailable)
                    .map(([platform]) => platform);
                  
                  return (
                    <option key={client.id} value={client.id}>
                      {(client as any).client_name || client.business_name || client.name || `Client ${client.id}`} ({availablePlatforms.length} platform{availablePlatforms.length !== 1 ? 's' : ''})
                    </option>
                  );
                })}
              </select>
              
              {selectedClient && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#718096' }}>
                  <strong>Available platforms:</strong>{' '}
                  {Object.entries(selectedClient.integrations)
                    .filter(([_, isAvailable]) => isAvailable)
                    .map(([platform]) => platforms.find(p => p.id === platform)?.icon)
                    .join(' ')}
                </div>
              )}
            </div>

            {/* Title */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                marginBottom: '8px'
              }}>
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '15px'
                }}
                placeholder="Enter a catchy title for this content..."
              />
            </div>

            {/* Content Type */}
            <div style={{ marginBottom: '0' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                marginBottom: '8px'
              }}>
                Content Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {[
                  { value: 'text', label: 'Text', icon: '📝' },
                  { value: 'image', label: 'Image', icon: '🖼️' },
                  { value: 'video', label: 'Video', icon: '🎥' },
                  { value: 'carousel', label: 'Carousel', icon: '🎠' },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData(prev => ({ ...prev, contentType: type.value }))}
                    style={{
                      padding: '12px',
                      border: `2px solid ${formData.contentType === type.value ? '#667eea' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      background: formData.contentType === type.value ? '#f7faff' : 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: formData.contentType === type.value ? '#667eea' : '#4a5568',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Text */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '30px'
          }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '600', 
              marginBottom: '20px',
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              ✍️ Content
            </h2>

            <textarea
              value={formData.contentText}
              onChange={(e) => setFormData(prev => ({ ...prev, contentText: e.target.value }))}
              rows={10}
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '15px',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              placeholder="Write your engaging post content here...

💡 Tips:
• Keep it concise and engaging
• Use emojis to grab attention
• Include a clear call-to-action
• Add relevant hashtags below"
            />

            <div style={{ 
              marginTop: '12px', 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', color: '#718096' }}>
                <strong>{formData.contentText.length}</strong> characters
              </span>
              <div style={{ fontSize: '12px', color: '#718096' }}>
                {formData.targetPlatforms.length > 0 ? (
                  <>
                    Selected platforms: {formData.targetPlatforms.map(p => platforms.find(pl => pl.id === p)?.icon).join(' ')}
                  </>
                ) : (
                  'Select platforms on the right →'
                )}
              </div>
            </div>
          </div>

          {/* Media URLs */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '30px'
          }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '600', 
              marginBottom: '20px',
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🎨 Media
            </h2>

            {/* Upload from Computer */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s ease'
              }}>
                {uploading ? '⏳ Uploading...' : '📤 Upload from Computer'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '8px' }}>
                Select images from your computer
              </div>
            </div>

            <div style={{ textAlign: 'center', color: '#a0aec0', fontSize: '13px', fontWeight: '600', marginBottom: '15px' }}>
              — OR —
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                marginBottom: '8px'
              }}>
                Add Media URL
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="url"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMediaUrl())}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '15px'
                  }}
                  placeholder="https://example.com/image.jpg"
                />
                <button
                  onClick={handleAddMediaUrl}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {formData.mediaUrls.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                {formData.mediaUrls.map((url, index) => (
                  <div key={index} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden' }}>
                    <img
                      src={url}
                      alt={`Media ${index + 1}`}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14"%3EInvalid URL%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <button
                      onClick={() => handleRemoveMediaUrl(url)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                border: '2px dashed #cbd5e0',
                borderRadius: '10px',
                padding: '40px',
                textAlign: 'center',
                color: '#a0aec0'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🖼️</div>
                <p>No media added yet</p>
                <p style={{ fontSize: '12px', marginTop: '5px' }}>Add image or video URLs above</p>
              </div>
            )}
          </div>

          {/* Hashtags */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '30px'
          }}>
            <h2 style={{ 
              fontSize: '22px', 
              fontWeight: '600', 
              marginBottom: '20px',
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              #️⃣ Hashtags
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '15px'
                  }}
                  placeholder="Enter hashtag (without #)"
                />
                <button
                  onClick={handleAddHashtag}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {formData.hashtags.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {formData.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveHashtag(tag)}
                      style={{
                        background: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div style={{
                border: '2px dashed #cbd5e0',
                borderRadius: '10px',
                padding: '30px',
                textAlign: 'center',
                color: '#a0aec0'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '8px' }}>#️⃣</div>
                <p>No hashtags added yet</p>
                <p style={{ fontSize: '12px', marginTop: '5px' }}>Add relevant hashtags to increase reach</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {/* Platform Selector */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '25px'
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              marginBottom: '20px',
              color: '#2d3748',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🎯 Target Platforms *
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {platforms.map((platform) => {
                const isAvailable = isPlatformAvailable(platform.id);
                const isSelected = formData.targetPlatforms.includes(platform.id);
                const charCount = getCharacterCount(platform.id);

                return (
                  <div key={platform.id}>
                    <label 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${isSelected ? platform.color : '#e2e8f0'}`,
                        background: isAvailable 
                          ? (isSelected ? `${platform.color}10` : 'white')
                          : '#f7fafc',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        opacity: isAvailable ? 1 : 0.5,
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onClick={() => isAvailable && handleTogglePlatform(platform.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        disabled={!isAvailable}
                        style={{
                          width: '20px',
                          height: '20px',
                          accentColor: platform.color,
                          cursor: isAvailable ? 'pointer' : 'not-allowed'
                        }}
                      />
                      <span style={{ fontSize: '28px' }}>{platform.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#2d3748' }}>
                          {platform.name}
                        </div>
                        {!isAvailable && (
                          <div style={{ fontSize: '11px', color: '#e53e3e', fontWeight: '500', marginTop: '2px' }}>
                            ❌ Not configured
                          </div>
                        )}
                      </div>
                    </label>

                    {isSelected && isAvailable && (
                      <div style={{ 
                        marginTop: '8px', 
                        marginLeft: '46px',
                        fontSize: '12px',
                        padding: '8px 12px',
                        background: '#f7fafc',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#718096' }}>Characters:</span>
                          <span style={{ 
                            fontWeight: '600',
                            color: charCount.current > charCount.max ? '#e53e3e' : '#48bb78'
                          }}>
                            {charCount.current} / {charCount.max}
                          </span>
                        </div>
                        {charCount.current > charCount.max && (
                          <p style={{ color: '#e53e3e', fontSize: '11px', margin: '4px 0 0' }}>
                            ⚠️ Exceeds maximum length!
                          </p>
                        )}
                        {charCount.current > charCount.recommended && charCount.current <= charCount.max && (
                          <p style={{ color: '#f6ad55', fontSize: '11px', margin: '4px 0 0' }}>
                            ⚠️ Longer than recommended ({charCount.recommended})
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!selectedClient && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                background: '#fff5f5',
                border: '1px solid #feb2b2',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#c53030'
              }}>
                ⚠️ Please select a client first
              </div>
            )}
          </div>

          {/* Validation Results */}
          {showValidation && Object.keys(validationResults).length > 0 && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              padding: '25px'
            }}>
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                marginBottom: '15px',
                color: '#2d3748'
              }}>
                ✅ Validation Results
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(validationResults).map(([platform, result]) => (
                  <div key={platform} style={{
                    border: `2px solid ${result.isValid ? '#48bb78' : '#f56565'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    background: result.isValid ? '#f0fff4' : '#fff5f5'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontWeight: '600', textTransform: 'capitalize', fontSize: '14px' }}>
                        {platform}
                      </span>
                      <span style={{ 
                        fontWeight: '600',
                        color: result.isValid ? '#48bb78' : '#f56565',
                        fontSize: '13px'
                      }}>
                        {result.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>

                    {result.errors.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {result.errors.map((error, idx) => (
                          <p key={idx} style={{ color: '#e53e3e', fontSize: '12px', marginTop: '4px' }}>
                            ⚠️ {error.message}
                          </p>
                        ))}
                      </div>
                    )}

                    {result.warnings.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {result.warnings.map((warning, idx) => (
                          <p key={idx} style={{ color: '#f6ad55', fontSize: '12px', marginTop: '4px' }}>
                            ⚠️ {warning.message}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            padding: '25px'
          }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              marginBottom: '20px',
              color: '#2d3748'
            }}>
              🎬 Actions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleValidate}
                disabled={loading || !formData.clientId || formData.targetPlatforms.length === 0}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading || !formData.clientId ? 'not-allowed' : 'pointer',
                  opacity: loading || !formData.clientId ? 0.5 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Validating...' : '🔍 Validate Content'}
              </button>

              <button
                onClick={() => setShowPreview(true)}
                disabled={!formData.title || !formData.contentText}
                style={{
                  width: '100%',
                  background: '#3182ce',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: !formData.title || !formData.contentText ? 'not-allowed' : 'pointer',
                  opacity: !formData.title || !formData.contentText ? 0.5 : 1
                }}
              >
                👁️ Preview
              </button>

              {/* Show status info when editing */}
              {isEditMode && (
                <div style={{
                  background: '#f7fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '13px', color: '#718096', marginBottom: '4px' }}>
                    Current Status
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#2d3748' }}>
                    {contentStatus === 'draft' && '📝 Draft'}
                    {contentStatus === 'pending_wtfu_approval' && '⏳ Pending WeTechForU Approval'}
                    {contentStatus === 'pending_client_approval' && '⏳ Pending Client Approval'}
                    {contentStatus === 'approved' && '✅ Approved'}
                    {contentStatus === 'posted' && '🚀 Posted'}
                    {contentStatus === 'rejected' && '❌ Rejected'}
                  </div>
                </div>
              )}

              {/* Next Status Button (only in edit mode) */}
              {isEditMode && canProgressStatus() && (
                <button
                  onClick={handleNextStatus}
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    marginBottom: '10px'
                  }}
                >
                  {loading ? 'Processing...' : getStatusActionLabel()}
                </button>
              )}

              {/* Save as Draft (only for new content or draft status) */}
              {(!isEditMode || contentStatus === 'draft') && (
                <button
                  onClick={handleSaveDraft}
                  disabled={loading || !formData.clientId}
                  style={{
                    width: '100%',
                    background: '#718096',
                    color: 'white',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading || !formData.clientId ? 'not-allowed' : 'pointer',
                    opacity: loading || !formData.clientId ? 0.5 : 1
                  }}
                >
                  {loading ? 'Saving...' : isEditMode ? '💾 Save Changes' : '💾 Save as Draft'}
                </button>
              )}

              {/* Submit for Approval (only for new content) */}
              {!isEditMode && (
                <button
                  onClick={handleSubmitForApproval}
                  disabled={loading || !formData.clientId}
                  style={{
                    width: '100%',
                    background: '#48bb78',
                    color: 'white',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading || !formData.clientId ? 'not-allowed' : 'pointer',
                    opacity: loading || !formData.clientId ? 0.5 : 1
                  }}
                >
                  {loading ? 'Submitting...' : '✓ Submit for Approval'}
                </button>
              )}

              <button
                onClick={() => navigate('/app/content-library')}
                style={{
                  width: '100%',
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
                {isEditMode ? '← Back to Library' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
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
          onClick={() => setShowPreview(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '800px',
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
                👁️ Content Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
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
              {/* Client Info */}
              <div style={{
                background: '#f7fafc',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <p style={{ fontSize: '13px', color: '#718096', marginBottom: '5px' }}>
                  <strong>Client:</strong> {selectedClient?.client_name || 'Not selected'}
                </p>
                <p style={{ fontSize: '13px', color: '#718096' }}>
                  <strong>Platforms:</strong> {formData.targetPlatforms.map(p => platforms.find(pl => pl.id === p)?.icon).join(' ') || 'None selected'}
                </p>
              </div>

              {/* Title */}
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '15px'
              }}>
                {formData.title}
              </h3>

              {/* Media Preview */}
              {formData.mediaUrls && formData.mediaUrls.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: formData.mediaUrls.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  {formData.mediaUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`Media ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '250px',
                        objectFit: 'cover',
                        borderRadius: '10px'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EInvalid URL%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Content Text */}
              <div style={{
                background: '#f7fafc',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '20px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: '1.6',
                fontSize: '15px',
                color: '#2d3748'
              }}>
                {formData.contentText}
              </div>

              {/* Hashtags */}
              {formData.hashtags && formData.hashtags.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '20px'
                }}>
                  {formData.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '15px',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Platform-specific previews */}
              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '20px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#2d3748',
                  marginBottom: '15px'
                }}>
                  Platform Character Counts:
                </h4>
                {formData.targetPlatforms.map((platformId) => {
                  const platform = platforms.find(p => p.id === platformId);
                  const charCount = getCharacterCount(platformId);
                  return (
                    <div
                      key={platformId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 15px',
                        background: '#f7fafc',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{platform?.icon}</span>
                        <span style={{ fontWeight: '500', color: '#2d3748' }}>{platform?.name}</span>
                      </span>
                      <span style={{
                        fontWeight: '600',
                        color: charCount.current > charCount.max ? '#e53e3e' : '#48bb78'
                      }}>
                        {charCount.current} / {charCount.max}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  width: '100%',
                  background: '#667eea',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
