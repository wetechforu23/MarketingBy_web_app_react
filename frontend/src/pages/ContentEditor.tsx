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
  const [user, setUser] = useState<any>(null);
  const [isClientUser, setIsClientUser] = useState<boolean>(false);
  const [contentCreatedBy, setContentCreatedBy] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    clientId: 0,
    title: '',
    contentType: 'text',
    contentText: '',
    destinationUrl: '',
    mediaUrls: [] as string[],
    hashtags: [] as string[],
    mentions: [] as string[],
    targetPlatforms: [] as string[],
  });

  const [hashtagInput, setHashtagInput] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<{ [key: string]: ValidationResult }>({});
  const [showValidation, setShowValidation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [contentStatus, setContentStatus] = useState<string>('draft');
  const [approvalLink, setApprovalLink] = useState<string>('');
  const [approvalTokenExpiresAt, setApprovalTokenExpiresAt] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [schedulePlatforms, setSchedulePlatforms] = useState<string[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: '📘', color: '#1877f2', maxLength: 63206, recommended: 500 },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0077b5', maxLength: 3000, recommended: 150 },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: '#e4405f', maxLength: 2200, recommended: 125 },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', color: '#1da1f2', maxLength: 280, recommended: 280 },
    { id: 'google_business', name: 'Google Business', icon: '📍', color: '#4285f4', maxLength: 1500, recommended: 500 },
  ];

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
        
        // Check if user is super_admin or wtfu_* roles (all should have access to approval links)
        const isAdminRole = userData.role === 'super_admin' || 
                           (userData.role && userData.role.startsWith('wtfu_'));
        setIsSuperAdmin(isAdminRole);
        console.log('👤 User role check:', {
          role: userData.role,
          isAdminRole,
          isSuperAdmin: isAdminRole,
          roleStartsWithWtfu: userData.role?.startsWith('wtfu_')
        });
        
        // If client user, automatically set their client_id
        if (isClient && userData.client_id) {
          console.log('👤 Client user detected, auto-setting client_id:', userData.client_id);
          setFormData(prev => ({ ...prev, clientId: userData.client_id }));
        }
      } catch (error) {
        console.error('❌ Error fetching user:', error);
      }
    };
    
    fetchUser();
  }, []);

  // Fetch clients only once when user data is available
  useEffect(() => {
    if (!user) return; // Wait for user to be loaded
    
    // Only fetch clients if user is NOT a client user (admins need to select clients)
    if (!isClientUser) {
      fetchClientsWithIntegrations();
    } else if (user?.client_id) {
      // For client users, fetch their own client's integrations
      fetchClientUserIntegration(user.client_id);
    }
  }, [isClientUser, user?.id]); // Only depend on user.id, not entire user object

  // Separate effect to set selectedClient when both clients and clientId are available
  useEffect(() => {
    if (clients.length > 0 && formData.clientId > 0) {
      const client = clients.find(c => c.id === formData.clientId);
      if (client && (!selectedClient || selectedClient.id !== client.id)) {
        setSelectedClient(client);
        console.log('✅ Selected client set/updated:', client);
      }
    }
  }, [clients, formData.clientId, selectedClient?.id]); // Add selectedClient?.id to prevent unnecessary updates

  // Fetch content and initialize clientId separately to avoid loops
  useEffect(() => {
    if (isEditMode && id) {
      // Fetch content when in edit mode (only when id changes)
      fetchContent();
    }
  }, [isEditMode, id]); // Only depend on isEditMode and id

  // Fetch approval link after content is loaded and user role is confirmed
  useEffect(() => {
    console.log('🔍 Approval link useEffect check:', {
      isEditMode,
      id,
      isSuperAdmin,
      contentStatus,
      contentLoading,
      userRole: user?.role
    });
    
    if (isEditMode && id && !contentLoading && (contentStatus === 'draft' || contentStatus === 'pending_client_approval')) {
      // For Super Admin: fetch approval link
      if (isSuperAdmin) {
        console.log('🔗 Fetching approval link for Super Admin...', { id, contentStatus, isSuperAdmin });
        fetchApprovalLink(parseInt(id));
      }
      // For Client Admin: also show approval link section if they need to approve
      else if (isClientUser && contentStatus === 'pending_client_approval') {
        console.log('🔗 Client user - approval link available for secure link approval');
        // Client users can approve via secure link, but we don't fetch it here
        // It will be shown in the approval UI if they have a token
      }
    }
  }, [isEditMode, id, isSuperAdmin, isClientUser, contentStatus, contentLoading, user?.role]);

  // Track formData changes to detect when content/URL is lost (only log significant changes)
  useEffect(() => {
    if (isEditMode && formData.contentText && formData.contentText.length > 0) {
      // Only log when content is actually loaded, not on every keystroke
      console.log('✅ FormData loaded successfully:', {
        contentTextLength: formData.contentText?.length || 0,
        hasDestinationUrl: !!formData.destinationUrl,
        title: formData.title
      });
    }
  }, [isEditMode]); // Only run when edit mode changes, not on every formData change

  // Initialize clientId for new content (separate effect to avoid triggering fetchContent)
  // IMPORTANT: Only update clientId, don't touch other formData fields to prevent data loss
  useEffect(() => {
    if (!isEditMode && !contentLoading) {
      if (isClientUser && user?.client_id && !formData.clientId) {
        // Client user: use their client_id - only update clientId, preserve all other fields
        setFormData(prev => {
          console.log('🔧 Setting clientId for client user, preserving other fields:', prev);
          return { ...prev, clientId: user.client_id };
        });
      } else if (!isClientUser && clients.length > 0 && !formData.clientId) {
        // Admin user: set first client as default - only update clientId, preserve all other fields
        setFormData(prev => {
          console.log('🔧 Setting clientId for admin user, preserving other fields:', prev);
          return { ...prev, clientId: clients[0].id };
        });
      }
    }
  }, [isEditMode, isClientUser, user?.client_id, clients.length, formData.clientId, contentLoading]);

  // Fetch single client's integrations (for client users)
  const fetchClientUserIntegration = async (clientId: number) => {
    try {
      console.log('📊 Fetching client integrations for client user:', clientId);
      const response = await http.get(`/clients`);
      const clientsData = response.data.clients || [];
      const client = clientsData.find((c: any) => c.id === clientId);
      
      if (!client) {
        console.error('❌ Client not found:', clientId);
        return;
      }

      const integrations = {
        facebook: false,
        linkedin: false,
        instagram: false,
        twitter: false,
        google_business: false,
      };

      // Check Facebook integration
      try {
        const fbResponse = await http.get(`/facebook/test-credentials/${clientId}`);
        integrations.facebook = fbResponse.data.hasCredentials || false;
      } catch (error) {
        integrations.facebook = false;
      }

      const clientWithIntegration = {
        ...client,
        integrations,
      };

      setClients([clientWithIntegration]);
      setSelectedClient(clientWithIntegration);
      console.log('✅ Client integration loaded:', clientWithIntegration);
    } catch (error) {
      console.error('❌ Error fetching client integration:', error);
    }
  };

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
    setContentLoading(true);
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
      console.log('📝 Content text:', content.content_text);
      console.log('🔗 Destination URL:', content.destination_url);
      
      // Ensure all fields are properly set, including empty strings
      const newFormData = {
        clientId: content.client_id || 0,
        title: content.title || '',
        contentType: content.content_type || 'text',
        contentText: content.content_text || '',
        destinationUrl: content.destination_url || '',
        mediaUrls: Array.isArray(content.media_urls) ? content.media_urls : [],
        hashtags: Array.isArray(content.hashtags) ? content.hashtags : [],
        mentions: Array.isArray(content.mentions) ? content.mentions : [],
        targetPlatforms: Array.isArray(content.target_platforms) ? content.target_platforms : [],
      };
      
      console.log('📋 Setting form data:', newFormData);
      console.log('📋 Current formData before update:', formData);
      
      // Use functional update to ensure we're setting the complete state
      setFormData(prev => {
        console.log('📋 Previous formData:', prev);
        console.log('📋 New formData:', newFormData);
        return newFormData;
      });
      
      // Reset image error/loading states when loading new content
      if (content.media_urls && content.media_urls.length > 0) {
        setImageErrors(new Set());
        setImageLoading(new Set(content.media_urls));
      }
      
      // Note: utm_tracked_url is stored separately and auto-generated on post
      
      setContentStatus(content.status || 'draft');
      setContentCreatedBy(content.created_by || null);
      
      // Fetch feedback history if content is loaded
      if (id) {
        fetchFeedbackHistory(parseInt(id));
      }
      
      // Note: selectedClient will be set automatically by the useEffect when clients load
      console.log('✅ Content loaded successfully, client_id:', content.client_id);
      console.log('✅ Content status:', content.status);
      console.log('✅ FormData after state update should have:', {
        contentText: newFormData.contentText,
        destinationUrl: newFormData.destinationUrl
      });
      
      // Note: Approval link will be fetched in a separate useEffect after isSuperAdmin is confirmed
    } catch (error: any) {
      console.error('❌ Error fetching content:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      alert(`Failed to load content: ${error.response?.data?.error || error.message}`);
    } finally {
      setContentLoading(false);
    }
  };

  const fetchApprovalLink = async (contentId: number) => {
    try {
      console.log('🔗 Fetching approval link for content ID:', contentId);
      const response = await http.get(`/content/${contentId}/approval-link`);
      console.log('📦 Approval link response:', response.data);
      
      if (response.data.success && response.data.approval_url) {
        console.log('✅ Approval link received:', response.data.approval_url);
        setApprovalLink(response.data.approval_url);
        setApprovalTokenExpiresAt(response.data.expires_at || null);
      } else {
        console.log('⚠️ No approval link in response, clearing state');
        setApprovalLink('');
        setApprovalTokenExpiresAt(null);
      }
    } catch (error: any) {
      console.error('❌ Error fetching approval link:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // On error, only clear if we don't have a link yet (might be a temporary network issue)
      // Note: We don't access approvalLink here to avoid stale closure issues
    }
  };

  const generateApprovalLink = async (contentId: number, sendEmail: boolean = true) => {
    try {
      const response = await http.post(`/content/${contentId}/send-approval-link`, { sendEmail });
      if (response.data.success && response.data.approval_url) {
        setApprovalLink(response.data.approval_url);
        setApprovalTokenExpiresAt(response.data.expires_at || null);
        return response.data.approval_url;
      }
    } catch (error: any) {
      console.error('❌ Error generating approval link:', error);
    }
    return null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Approval link copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy link. Please select and copy manually.');
    });
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

  const isValidImageUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Check if it's a valid HTTP/HTTPS URL
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      // Check if it's likely an image file (common extensions)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
      const pathname = urlObj.pathname.toLowerCase();
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
      
      // Also allow data URLs and blob URLs
      if (url.startsWith('data:image/') || url.startsWith('blob:')) {
        return true;
      }
      
      // If no extension, assume it might still be an image (some CDNs don't use extensions)
      // But require HTTPS for security
      if (!hasImageExtension) {
        return urlObj.protocol === 'https:';
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleAddMediaUrl = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    
    // Validate URL format
    if (!isValidImageUrl(url)) {
      alert('⚠️ Invalid image URL. Please enter a valid HTTPS image URL (e.g., https://example.com/image.jpg)\n\nSupported formats: JPG, PNG, GIF, WebP, SVG, BMP');
      return;
    }
    
    // Check for duplicates
    if (formData.mediaUrls.includes(url)) {
      alert('This image URL is already added');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      mediaUrls: [...prev.mediaUrls, url]
    }));
    setMediaUrlInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      // Get backend base URL (without /api)
      const backendBaseUrl = http.defaults.baseURL 
        ? http.defaults.baseURL.replace('/api', '') 
        : 'http://localhost:3001';

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await http.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          // Convert relative URL to full backend URL
          // response.data.url is like "/uploads/filename.jpg"
          // backendBaseUrl is like "http://localhost:3001"
          const imageUrl = `${backendBaseUrl}${response.data.url}`;
          uploadedUrls.push(imageUrl);
        }
      }

      // Add all uploaded URLs to media
      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          mediaUrls: [...prev.mediaUrls, ...uploadedUrls]
        }));
        // Mark uploaded images as loading
        setImageLoading(prev => {
          const newSet = new Set(prev);
          uploadedUrls.forEach(url => newSet.add(url));
          return newSet;
        });
        // Clear any errors for these URLs
        setImageErrors(prev => {
          const newSet = new Set(prev);
          uploadedUrls.forEach(url => newSet.delete(url));
          return newSet;
        });
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
      let contentId: number | undefined = id ? parseInt(id) : undefined;

      if (!isEditMode) {
        // New content: save everything including destination_url
        const saveResponse = await http.post('/content', formData);
        contentId = saveResponse.data.content.id;
      } else {
        // Edit mode: Try to save all fields first
        try {
          await http.put(`/content/${id}`, formData);
        } catch (updateError: any) {
          // If update fails because content is pending approval, 
          // still try to save destination_url separately (it's allowed even when pending)
          if (updateError.response?.data?.error?.includes('pending approval')) {
            if (formData.destinationUrl) {
              try {
                await http.put(`/content/${id}`, { destinationUrl: formData.destinationUrl });
                console.log('✅ Saved destination_url separately');
              } catch (urlError: any) {
                console.error('⚠️ Could not save destination_url:', urlError.response?.data?.error);
                // Continue anyway - destination_url might already be saved
              }
            }
          } else {
            // Re-throw if it's a different error
            throw updateError;
          }
        }
      }

      if (!contentId) {
        alert('Error: Content ID is missing');
        return;
      }

      await http.post(`/content/${contentId}/submit-approval`);
      
      // Generate approval link and send email to client for Super Admin
      if (isSuperAdmin) {
        const link = await generateApprovalLink(contentId, true); // sendEmail = true
        if (link) {
          alert(`Content submitted for approval!\n\n✅ Approval link generated and email sent to client.\nYou can also find the link in the Actions section to share via WhatsApp.`);
        } else {
          alert('Content submitted for approval!\n\n⚠️ Approval link generated but email may not have been sent. Please check the Actions section.');
        }
      } else {
        alert('Content submitted for approval!');
      }
      
      // Refresh the content to get updated status and approval link
      if (isEditMode) {
        await fetchContent();
      } else {
        navigate('/app/content-library');
      }
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

    // Check if client user created this content
    const isClientCreator = isClientUser && contentCreatedBy === user?.id;

    // Determine next action based on current status
    switch (contentStatus) {
      case 'draft':
        if (isClientCreator) {
          // Client created content: can post directly without approval
          nextAction = 'post-now';
          confirmMessage = 'Post this content to social media now?';
          successMessage = 'Content posted successfully!';
        } else {
          // Admin created content: needs approval
          nextAction = 'submit-approval';
          confirmMessage = 'Submit this content for client approval?';
          successMessage = 'Content submitted for approval!';
          
          // Generate approval link after submission (for Super Admin)
          if (isSuperAdmin) {
            // The approval link will be generated in handleSubmitForApproval
            // But we can also generate it here if needed
          }
        }
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
      case 'rejected':
        // Super Admin can resubmit rejected content for approval
        if (isSuperAdmin || (!isClientUser && !isClientCreator)) {
          nextAction = 'submit-approval';
          confirmMessage = 'Resubmit this content for client approval?';
          successMessage = 'Content resubmitted for approval!';
        } else {
          alert('No next action available for this status');
          return;
        }
        break;
      default:
        alert('No next action available for this status');
        return;
    }

    if (!confirm(confirmMessage)) return;

    setLoading(true);
    try {
      // If submitting for approval (including resubmitting rejected content), save content first
      if (nextAction === 'submit-approval' && isEditMode) {
        try {
          // Save all content updates before submitting for approval
          await http.put(`/content/${id}`, formData);
          console.log('✅ Content saved before resubmission');
          // Small delay to ensure database transaction is committed
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (updateError: any) {
          // If update fails because content is pending approval, 
          // still try to save destination_url separately (it's allowed even when pending)
          if (updateError.response?.data?.error?.includes('pending approval')) {
            if (formData.destinationUrl) {
              try {
                await http.put(`/content/${id}`, { destinationUrl: formData.destinationUrl });
                console.log('✅ Saved destination_url separately');
              } catch (urlError: any) {
                console.error('⚠️ Could not save destination_url:', urlError.response?.data?.error);
                // Continue anyway - destination_url might already be saved
              }
            }
          } else {
            // Re-throw if it's a different error
            throw updateError;
          }
        }
      }
      
      const response = await http.post(`/content/${id}/${nextAction}`);
      
      // Generate approval link and send email for Super Admin if submitting for approval
      if (isSuperAdmin && nextAction === 'submit-approval') {
        // Small delay to ensure status update is committed before generating link
        await new Promise(resolve => setTimeout(resolve, 100));
        const link = await generateApprovalLink(parseInt(id), true); // sendEmail = true
        if (link) {
          alert(`${successMessage}\n\n✅ Approval link generated and email sent to client.\nYou can also find the link in the Actions section to share via WhatsApp.`);
        } else {
          alert(`${successMessage}\n\n⚠️ Approval link generated but email may not have been sent. Please check the Actions section.`);
        }
        // Refresh content to get updated status
        await fetchContent();
      } else if (nextAction === 'post-now') {
        // Handle posting response with detailed results
        const results = response.data?.results || [];
        const message = response.data?.message || successMessage;
        
        if (results.length > 0) {
          const successCount = results.filter((r: any) => r.success).length;
          const failCount = results.filter((r: any) => !r.success).length;
          
          let detailsMessage = message;
          if (failCount > 0) {
            const failedPlatforms = results
              .filter((r: any) => !r.success)
              .map((r: any) => `${r.platform}: ${r.error || 'Unknown error'}`)
              .join('\n');
            detailsMessage += `\n\n⚠️ Failed platforms:\n${failedPlatforms}`;
          }
          
          alert(detailsMessage);
        } else {
          alert(message);
        }
        
        // Refresh content to get updated status
        await fetchContent();
      } else {
        alert(successMessage);
      }
      
      // Reset loading state before navigation to prevent black screen
      setLoading(false);
      
      // Only navigate if not in edit mode or if we're not staying on the page
      if (nextAction !== 'submit-approval' || !isSuperAdmin) {
        navigate('/app/content-library', { replace: true });
      }
    } catch (error: any) {
      setLoading(false);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || `Failed to ${nextAction}`;
      const errorDetails = error.response?.data?.results 
        ? `\n\nDetails:\n${error.response.data.results.map((r: any) => `${r.platform}: ${r.error || 'Unknown error'}`).join('\n')}`
        : '';
      alert(`❌ Error: ${errorMessage}${errorDetails}`);
      console.error('Posting error:', error);
    }
  };

  const getStatusActionLabel = () => {
    // Check if client user created this content
    const isClientCreator = isClientUser && contentCreatedBy === user?.id;

    switch (contentStatus) {
      case 'draft':
        if (isClientCreator) {
          return '🚀 Post to Social Media';
        }
        return '📤 Submit for Approval';
      case 'pending_client_approval':
        return '✅ Approve Content';
      case 'approved':
        return '🚀 Post to Social Media';
      case 'rejected':
        // Super Admin can resubmit rejected content
        if (isSuperAdmin || (!isClientUser && !isClientCreator)) {
          return '📤 Submit for Approval';
        }
        return 'No Action Available';
      case 'posted':
        return '✓ Already Posted';
      default:
        return 'Next Step';
    }
  };

  // Generate time options in 10-minute intervals (00:00, 00:10, 00:20, ..., 23:50)
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

  const handleSchedulePost = async () => {
    if (!id) {
      alert('Content ID is missing');
      return;
    }

    if (!scheduleDate || !scheduleTime) {
      alert('Please select both date and time');
      return;
    }

    if (schedulePlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    // Combine date and time
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
    const now = new Date();
    
    if (scheduledDateTime <= now) {
      alert('Scheduled time must be in the future');
      return;
    }

    setLoading(true);

    try {
      const response = await http.post(`/content/${id}/schedule`, {
        platforms: schedulePlatforms,
        scheduledTime: scheduledDateTime.toISOString()
      });

      if (response.data.success) {
        alert(`✅ Post scheduled successfully for ${schedulePlatforms.length} platform(s)!\n\nYou can view it in the "Scheduled Posts" tab.`);
        setShowScheduleModal(false);
        setScheduleDate('');
        setScheduleTime('');
        setSchedulePlatforms([]);
        // Update status to scheduled immediately (before fetchContent)
        setContentStatus('scheduled');
        // Refresh content to show updated status from backend
        if (isEditMode) {
          await fetchContent();
          // Ensure status stays as 'scheduled' after fetch (backend should return it)
          setContentStatus('scheduled');
        }
        // Optionally navigate to scheduled posts
        // navigate('/app/content-library', { state: { activeTab: 'scheduled' } });
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to schedule post');
    } finally {
      setLoading(false);
    }
  };

  const openScheduleModal = () => {
    // Initialize with current target platforms
    setSchedulePlatforms(formData.targetPlatforms);
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
    // Set default time to next 10-minute interval
    const now = new Date();
    const nextMinute = Math.ceil(now.getMinutes() / 10) * 10;
    const defaultHour = nextMinute >= 60 ? (now.getHours() + 1) % 24 : now.getHours();
    const defaultMinute = nextMinute >= 60 ? 0 : nextMinute;
    setScheduleTime(`${defaultHour.toString().padStart(2, '0')}:${defaultMinute.toString().padStart(2, '0')}`);
    setShowScheduleModal(true);
  };

  const canProgressStatus = () => {
    return ['draft', 'pending_client_approval', 'approved', 'rejected'].includes(contentStatus);
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

  // Function to mask email (joXXXXX@gXXXX format)
  const maskEmail = (email: string): string => {
    if (!email) return '';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return email;
    
    const maskedLocal = localPart.length > 2 
      ? localPart.substring(0, 2) + 'X'.repeat(Math.min(localPart.length - 2, 5))
      : localPart;
    const maskedDomain = domain.length > 1
      ? 'g' + 'X'.repeat(Math.min(domain.length - 1, 4))
      : domain;
    
    return `${maskedLocal}@${maskedDomain}`;
  };

  // Function to parse feedback from notes field
  const parseFeedback = (notes: string) => {
    if (!notes) return { name: 'Unknown', email: '', feedback: '' };
    
    // New format: "feedback text\n\nRejected by name (email) (access_method)"
    // Or old format: "Approved by name (email) (access_method)"
    // Or just feedback text
    
    // Check if it has the new format with feedback first
    const newFormatMatch = notes.match(/^(.+?)\n\n(?:Approved|Rejected)\s+by\s+([^(]+?)\s*\(([^)]+@[^)]+)\)/);
    if (newFormatMatch) {
      return {
        name: newFormatMatch[2].trim(),
        email: newFormatMatch[3].trim(),
        feedback: newFormatMatch[1].trim()
      };
    }
    
    // Try to extract name and email from old format
    // Format examples:
    // "Approved by John (john@email.com)"
    // "Rejected by Jane (jane@email.com)"
    // "Approved by John (john@email.com) (portal_login)"
    const nameMatch = notes.match(/(?:Approved|Rejected)\s+by\s+([^(]+?)\s*\(/);
    const emailMatch = notes.match(/\(([^)]+@[^)]+)\)/);
    
    const name = nameMatch ? nameMatch[1].trim() : '';
    const email = emailMatch ? emailMatch[1].trim() : '';
    
    // Extract feedback text (everything before "Approved by" or "Rejected by", or after the email/access method)
    let feedbackText = notes;
    
    // If it starts with "Approved by" or "Rejected by", there's no feedback text
    if (notes.match(/^(Approved|Rejected)\s+by/)) {
      feedbackText = '';
    } else if (emailMatch) {
      // Extract text before the "by" part
      const byIndex = notes.indexOf(' by ');
      if (byIndex > 0) {
        feedbackText = notes.substring(0, byIndex).trim();
      } else {
        // Fallback: remove the "by name (email)" part
        const emailEndIndex = notes.indexOf(')', emailMatch.index || 0);
        feedbackText = notes.substring(emailEndIndex + 1).trim();
        // Remove access method if present
        feedbackText = feedbackText.replace(/\([^)]+\)$/, '').trim();
      }
    }
    
    return {
      name: name || 'Unknown',
      email: email,
      feedback: feedbackText
    };
  };

  // Fetch feedback history
  const fetchFeedbackHistory = async (contentId: number) => {
    setLoadingFeedback(true);
    try {
      const response = await http.get(`/content/${contentId}/approval-history`);
      if (response.data.success) {
        setFeedbackHistory(response.data.history || []);
      }
    } catch (error: any) {
      console.error('Error fetching feedback history:', error);
      setFeedbackHistory([]);
    } finally {
      setLoadingFeedback(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #2E86AB 0%, #1a5f7a 100%)', 
      padding: '40px 20px',
      fontFamily: 'Inter, sans-serif'
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
          {/* Loading State */}
          {contentLoading && (
            <div style={{
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              padding: '60px 30px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid #e2e8f0',
                borderTop: '4px solid #2E86AB',
                borderRadius: '50%',
                margin: '0 auto 20px',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ color: '#718096', fontSize: '16px', fontWeight: '500' }}>Loading content...</p>
              <style>
                {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
              </style>
            </div>
          )}

          {/* Client Warning if no clients */}
          {!contentLoading && clients.length === 0 && (
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

          {/* Basic Info - Only show when not loading */}
          {!contentLoading && (
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

            {/* Client Selector - Only show for admins, not for client users */}
            {!isClientUser && (
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
            )}

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
          )}

          {/* Content Text */}
          {!contentLoading && (
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
              value={formData.contentText || ''}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, contentText: e.target.value }));
              }}
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
            {/* Debug: Show current formData value */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                Debug: contentText length = {formData.contentText?.length || 0}
              </div>
            )}

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
          )}

          {/* Destination URL */}
          {!contentLoading && (
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
              🔗 Destination URL
            </h2>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                marginBottom: '8px'
              }}>
                Website URL to Track
                <span style={{ color: '#718096', fontSize: '12px', fontWeight: '400', marginLeft: '8px' }}>
                  (Optional - for UTM tracking)
                </span>
              </label>
              <input
                type="url"
                value={formData.destinationUrl || ''}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, destinationUrl: e.target.value }));
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '15px'
                }}
                placeholder="https://www.example.com"
              />
              {/* Debug: Show current formData value */}
              {process.env.NODE_ENV === 'development' && (
                <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                  Debug: destinationUrl = {formData.destinationUrl || '(empty)'}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '8px' }}>
                This URL will be tracked with UTM parameters when posting to Facebook for Google Analytics.
              </div>
            </div>
          </div>
          )}

          {/* Media URLs */}
          {!contentLoading && (
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
                background: 'linear-gradient(135deg, #2E86AB 0%, #1a5f7a 100%)',
                color: '#ffffff',
                padding: '14px 28px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
                boxShadow: '0 4px 15px rgba(46, 134, 171, 0.4)',
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
                    background: '#2E86AB',
                    color: '#ffffff',
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
                {formData.mediaUrls.map((url, index) => {
                  const isError = imageErrors.has(url);
                  const isLoading = imageLoading.has(url);
                  
                  return (
                    <div key={index} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #e2e8f0', background: '#fff' }}>
                      {isLoading && !isError && (
                        <div style={{
                          width: '100%',
                          height: '150px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f7fafc'
                        }}>
                          <div style={{ textAlign: 'center', color: '#718096' }}>
                            <div style={{ fontSize: '20px', marginBottom: '4px' }}>⏳</div>
                            <div style={{ fontSize: '11px' }}>Loading...</div>
                          </div>
                        </div>
                      )}
                      {isError ? (
                        <div style={{
                          width: '100%',
                          height: '150px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#fee',
                          color: '#c53030',
                          padding: '10px'
                        }}>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>❌</div>
                          <div style={{ fontSize: '11px', fontWeight: '600', textAlign: 'center', marginBottom: '4px' }}>Image Failed to Load</div>
                          <div style={{ fontSize: '9px', textAlign: 'center', wordBreak: 'break-all', color: '#9b2c2c' }}>
                            {url.length > 40 ? `${url.substring(0, 40)}...` : url}
                          </div>
                          <div style={{ fontSize: '9px', color: '#9b2c2c', marginTop: '4px', textAlign: 'center' }}>
                            Check URL or CORS settings
                          </div>
                        </div>
                      ) : (
                        <img
                          src={url}
                          alt={`Media ${index + 1}`}
                          style={{ 
                            width: '100%', 
                            height: '150px', 
                            objectFit: 'cover', 
                            display: isLoading ? 'none' : 'block'
                          }}
                          onLoad={() => {
                            setImageLoading(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(url);
                              return newSet;
                            });
                            setImageErrors(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(url);
                              return newSet;
                            });
                          }}
                          onError={(e) => {
                            setImageLoading(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(url);
                              return newSet;
                            });
                            setImageErrors(prev => new Set(prev).add(url));
                          }}
                          onLoadStart={() => {
                            setImageLoading(prev => new Set(prev).add(url));
                          }}
                        />
                      )}
                      <button
                        onClick={() => {
                          handleRemoveMediaUrl(url);
                          setImageErrors(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(url);
                            return newSet;
                          });
                          setImageLoading(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(url);
                            return newSet;
                          });
                        }}
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
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          zIndex: 10
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
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
          )}

          {/* Hashtags */}
          {!contentLoading && (
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
                      background: 'linear-gradient(135deg, #A23B72 0%, #8A2F5F 100%)',
                      color: '#ffffff',
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
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {!contentLoading && (
          <>
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
                  background: 'linear-gradient(135deg, #2E86AB 0%, #1a5f7a 100%)',
                  color: '#ffffff',
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
                  background: '#2E86AB',
                  color: '#ffffff',
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
                <>
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
                      {contentStatus === 'pending_client_approval' && '⏳ Pending Client Approval'}
                      {contentStatus === 'approved' && '✅ Approved'}
                      {contentStatus === 'scheduled' && '📅 Post Scheduled'}
                      {contentStatus === 'posted' && '🚀 Posted'}
                      {contentStatus === 'rejected' && '❌ Rejected'}
                    </div>
                  </div>

                  {/* Feedback History */}
                  {feedbackHistory.length > 0 && (
                    <div style={{
                      background: '#fff',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', marginBottom: '12px' }}>
                        📝 Feedback History
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {feedbackHistory.map((item, index) => {
                          const parsed = parseFeedback(item.notes || '');
                          const maskedEmail = parsed.email ? maskEmail(parsed.email) : '';
                          const displayName = item.approved_by_name || parsed.name || 'Unknown';
                          const displayEmail = item.approved_by_email || parsed.email || '';
                          const maskedDisplayEmail = displayEmail ? maskEmail(displayEmail) : '';
                          
                          return (
                            <div key={index} style={{
                              padding: '12px',
                              background: '#f7fafc',
                              borderRadius: '6px',
                              borderLeft: '3px solid',
                              borderLeftColor: item.approval_status === 'approved' ? '#48bb78' : 
                                            item.approval_status === 'rejected' ? '#e53e3e' : '#4299e1'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#2d3748' }}>
                                    {displayName}
                                  </div>
                                  {maskedDisplayEmail && (
                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                                      💡 {maskedDisplayEmail}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: '11px', color: '#999' }}>
                                  {new Date(item.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              {parsed.feedback && parsed.feedback.trim() && (
                                <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                                  {parsed.feedback.trim()}
                                </div>
                              )}
                              {(!parsed.feedback || !parsed.feedback.trim()) && item.notes && (
                                <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Approval Link (Super Admin/WeTechForU team only) */}
              {(() => {
                // Show for admin users when content is draft or pending approval
                const isAdminUser = isSuperAdmin || (user?.role && (user.role === 'super_admin' || user.role.startsWith('wtfu_')));
                const shouldShow = isAdminUser && isEditMode && (contentStatus === 'draft' || contentStatus === 'pending_client_approval');
                
                // Log only once when component mounts or when conditions change significantly
                if (shouldShow && !approvalLink) {
                  console.log('🔍 Approval link section visible. Fetching link...', {
                    isSuperAdmin,
                    isAdminUser,
                    contentStatus,
                    userRole: user?.role
                  });
                }
                
                // Return true if user is admin and in edit mode
                return isAdminUser && isEditMode;
              })() && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  border: '2px solid #0ea5e9',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '10px',
                  boxShadow: '0 4px 12px rgba(14, 165, 233, 0.15)'
                }}>
                  {/* Header with Secure Link Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🔐 Secure Approval Link
                      <span style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginLeft: '8px'
                      }}>
                        NEW
                      </span>
                    </div>
                  </div>

                  {approvalLink ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Link Input with Copy Button */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={approvalLink}
                          readOnly
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '2px solid #bae6fd',
                            fontSize: '13px',
                            background: 'white',
                            color: '#1e293b',
                            fontFamily: 'monospace'
                          }}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => copyToClipboard(approvalLink)}
                          style={{
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #2E86AB 0%, #1a5f7a 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(46, 134, 171, 0.3)'
                          }}
                        >
                          📋 Copy Link
                        </button>
                      </div>

                      {/* Email Button */}
                      <button
                        onClick={async () => {
                          if (id) {
                            const contentId = parseInt(id);
                            if (!isNaN(contentId)) {
                              const link = await generateApprovalLink(contentId, true);
                              if (link) {
                                alert('✅ Approval link sent via email to client!');
                              } else {
                                alert('❌ Failed to send approval email. Please try again.');
                              }
                            }
                          }
                        }}
                        disabled={loading || !id}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #F18F01 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: loading || !id ? 'not-allowed' : 'pointer',
                          opacity: loading || !id ? 0.5 : 1,
                          boxShadow: '0 2px 8px rgba(241, 143, 1, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        📧 Email with Secure Link
                      </button>

                      {/* Security Features Info */}
                      <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '14px',
                        border: '1px solid #e0f2fe'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '10px' }}>
                          🔒 Security Features
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Token expires in 48 hours:</strong> {approvalTokenExpiresAt ? new Date(approvalTokenExpiresAt).toLocaleString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : 'N/A'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Token is single-use:</strong> Link becomes invalid after approval/rejection</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Public approval page (no login):</strong> Client can approve without account</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Full audit trail:</strong> All actions are logged with timestamps</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                        No approval link yet. Generate a secure link to share with client via email or copy manually.
                      </div>
                      <button
                        onClick={async () => {
                          if (id) {
                            const contentId = parseInt(id);
                            if (!isNaN(contentId)) {
                              const link = await generateApprovalLink(contentId, true);
                              if (link) {
                                alert('✅ Approval link generated and email sent to client!');
                              } else {
                                alert('❌ Failed to generate approval link. Please try again.');
                              }
                            }
                          }
                        }}
                        disabled={loading || !id}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #F18F01 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: loading || !id ? 'not-allowed' : 'pointer',
                          opacity: loading || !id ? 0.5 : 1,
                          boxShadow: '0 2px 8px rgba(241, 143, 1, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}
                      >
                        🔗 Generate Secure Link & Send Email
                      </button>
                      
                      {/* Security Features Preview (when no link) */}
                      <div style={{
                        background: 'white',
                        borderRadius: '8px',
                        padding: '14px',
                        border: '1px solid #e0f2fe'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0369a1', marginBottom: '10px' }}>
                          🔒 Security Features
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#475569' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Token expires in 48 hours</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Token is single-use</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Public approval page (no login)</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                            <span><strong>Full audit trail</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Next Status Button (only in edit mode) */}
              {/* Workflow: 
                  - Super Admin creates → Client approves → Super Admin can post
                  - Client creates → Client can post directly (no approval needed)
              */}
              {/* Show button if:
                  - Admin user and content can progress status
                  - OR Client user created the content and it's approved/draft
                  - Hide if: Client user viewing content they didn't create
              */}
              {isEditMode && (
                (canProgressStatus() && !(isClientUser && contentStatus === 'approved' && contentCreatedBy !== user?.id)) ||
                (isClientUser && contentCreatedBy === user?.id && (contentStatus === 'approved' || contentStatus === 'draft'))
              ) && (
                <button
                  onClick={handleNextStatus}
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #A23B72 0%, #8A2F5F 100%)',
                    color: '#ffffff',
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
                    background: '#F18F01',
                    color: '#ffffff',
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

              {/* Schedule Post (only for approved content) */}
              {isEditMode && (contentStatus === 'approved' || (isClientUser && contentCreatedBy === user?.id && contentStatus === 'draft')) && (
                <button
                  onClick={openScheduleModal}
                  disabled={loading || !formData.clientId || formData.targetPlatforms.length === 0}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #2E86AB 0%, #1E6A8A 100%)',
                    color: '#ffffff',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading || !formData.clientId || formData.targetPlatforms.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: loading || !formData.clientId || formData.targetPlatforms.length === 0 ? 0.5 : 1,
                    marginBottom: '10px'
                  }}
                >
                  📅 Schedule Post
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
          </>
          )}
        </div>
      </div>

      {/* Schedule Post Modal */}
      {showScheduleModal && (
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
          onClick={() => setShowScheduleModal(false)}
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
                📅 Schedule Post
              </h2>
              <button
                onClick={() => setShowScheduleModal(false)}
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
              {/* Date Picker */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2d3748',
                  fontSize: '15px'
                }}>
                  Select Date *
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
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
                  Select Time (10-minute intervals) *
                </label>
                <select
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
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
                <div style={{
                  fontSize: '12px',
                  color: '#718096',
                  marginTop: '4px'
                }}>
                  Posts will be published at the selected time (e.g., 10:00, 10:10, 10:20...)
                </div>
              </div>

              {/* Platform Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#2d3748',
                  fontSize: '15px'
                }}>
                  Select Platforms *
                </label>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {formData.targetPlatforms.map((platformId) => {
                    const platform = platforms.find(p => p.id === platformId);
                    if (!platform) return null;
                    return (
                      <label
                        key={platformId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '2px solid #e2e8f0',
                          cursor: 'pointer',
                          background: schedulePlatforms.includes(platformId) ? '#f0f9ff' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={schedulePlatforms.includes(platformId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSchedulePlatforms([...schedulePlatforms, platformId]);
                            } else {
                              setSchedulePlatforms(schedulePlatforms.filter(p => p !== platformId));
                            }
                          }}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer'
                          }}
                        />
                        <span style={{ fontSize: '20px' }}>{platform.icon}</span>
                        <span style={{ fontWeight: '500', color: '#2d3748' }}>{platform.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '25px'
              }}>
                <button
                  onClick={handleSchedulePost}
                  disabled={loading || !scheduleDate || !scheduleTime || schedulePlatforms.length === 0}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #2E86AB 0%, #1E6A8A 100%)',
                    color: '#ffffff',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading || !scheduleDate || !scheduleTime || schedulePlatforms.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: loading || !scheduleDate || !scheduleTime || schedulePlatforms.length === 0 ? 0.5 : 1
                  }}
                >
                  {loading ? 'Scheduling...' : '✅ Schedule Post'}
                </button>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: 'white',
                    color: '#4a5568',
                    padding: '14px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  {formData.mediaUrls.map((url, index) => {
                    const isError = imageErrors.has(url);
                    const isLoading = imageLoading.has(url);
                    
                    return (
                      <div key={index} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                        {isLoading && !isError && (
                          <div style={{
                            width: '100%',
                            height: '250px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f7fafc'
                          }}>
                            <div style={{ textAlign: 'center', color: '#718096' }}>
                              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                              <div style={{ fontSize: '14px' }}>Loading image...</div>
                            </div>
                          </div>
                        )}
                        {isError ? (
                          <div style={{
                            width: '100%',
                            height: '250px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fee',
                            color: '#c53030',
                            padding: '20px',
                            borderRadius: '10px'
                          }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
                            <div style={{ fontSize: '16px', fontWeight: '600', textAlign: 'center', marginBottom: '8px' }}>Image Failed to Load</div>
                            <div style={{ fontSize: '12px', textAlign: 'center', wordBreak: 'break-all', color: '#9b2c2c', marginBottom: '8px' }}>
                              {url.length > 50 ? `${url.substring(0, 50)}...` : url}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9b2c2c', textAlign: 'center' }}>
                              Check URL validity or CORS settings
                            </div>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '250px',
                              objectFit: 'cover',
                              borderRadius: '10px',
                              display: isLoading ? 'none' : 'block'
                            }}
                            onLoad={() => {
                              setImageLoading(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(url);
                                return newSet;
                              });
                              setImageErrors(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(url);
                                return newSet;
                              });
                            }}
                            onError={() => {
                              setImageLoading(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(url);
                                return newSet;
                              });
                              setImageErrors(prev => new Set(prev).add(url));
                            }}
                            onLoadStart={() => {
                              setImageLoading(prev => new Set(prev).add(url));
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
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
                        background: 'linear-gradient(135deg, #A23B72 0%, #8A2F5F 100%)',
                        color: '#ffffff',
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
