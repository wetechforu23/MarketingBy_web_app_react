import React, { useState, useEffect } from 'react';
import { http } from '../api/http';
import { useNavigate, useParams } from 'react-router-dom';

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

  const [clients, setClients] = useState<any[]>([]);
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
  const [validationResults, setValidationResults] = useState<{ [key: string]: ValidationResult }>({});
  const [showValidation, setShowValidation] = useState(false);

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: '📘', maxLength: 63206, recommended: 500 },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', maxLength: 3000, recommended: 150 },
    { id: 'instagram', name: 'Instagram', icon: '📷', maxLength: 2200, recommended: 125 },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', maxLength: 280, recommended: 280 },
    { id: 'google_business', name: 'Google Business', icon: '📍', maxLength: 1500, recommended: 500 },
  ];

  useEffect(() => {
    fetchClients();
    if (isEditMode) {
      fetchContent();
    }
  }, []);

  useEffect(() => {
    if (clients.length > 0 && !formData.clientId) {
      setFormData(prev => ({ ...prev, clientId: clients[0].id }));
    }
  }, [clients]);

  const fetchClients = async () => {
    try {
      const response = await http.get('/api/clients');
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchContent = async () => {
    try {
      const response = await http.get(`/api/content/${id}`);
      const content = response.data.content;
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
    } catch (error) {
      console.error('Error fetching content:', error);
      alert('Failed to load content');
    }
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

  const handleRemoveMediaUrl = (url: string) => {
    setFormData(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter(u => u !== url)
    }));
  };

  const handleTogglePlatform = (platformId: string) => {
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
      // Create a temporary content if editing, or validate current form
      let contentId = id;
      
      if (!isEditMode) {
        // Save as draft first for validation
        const saveResponse = await http.post('/api/content', formData);
        contentId = saveResponse.data.content.id;
      }

      const response = await http.post(`/api/content/${contentId}/validate`);
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

    if (formData.targetPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode) {
        await http.put(`/api/content/${id}`, formData);
        alert('Content updated successfully!');
      } else {
        const response = await http.post('/api/content', formData);
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

    if (formData.targetPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    if (!confirm('Submit this content for approval?')) return;

    setLoading(true);

    try {
      let contentId = id;

      // Save first if new
      if (!isEditMode) {
        const saveResponse = await http.post('/api/content', formData);
        contentId = saveResponse.data.content.id;
      } else {
        await http.put(`/api/content/${id}`, formData);
      }

      // Submit for approval
      await http.post(`/api/content/${contentId}/submit-approval`);
      alert('Content submitted for approval!');
      navigate('/app/content-library');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit for approval');
    } finally {
      setLoading(false);
    }
  };

  const getCharacterCount = (platformId: string) => {
    const platform = platforms.find(p => p.id === platformId);
    if (!platform) return { current: 0, max: 0, recommended: 0 };

    const current = formData.contentText.length;
    return {
      current,
      max: platform.maxLength,
      recommended: platform.recommended,
      percentage: (current / platform.maxLength) * 100
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Content' : 'Create New Content'}
          </h1>
          <p className="text-gray-600 mt-1">Create engaging social media content for multiple platforms</p>
        </div>
        <button
          onClick={() => navigate('/app/content-library')}
          className="text-gray-600 hover:text-gray-800 font-medium"
        >
          ← Back to Library
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

            {/* Client Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client *
              </label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData(prev => ({ ...prev, clientId: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isEditMode}
              >
                <option value={0}>Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.business_name || client.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a title for this content..."
              />
            </div>

            {/* Content Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData(prev => ({ ...prev, contentType: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text Only</option>
                <option value="image">Image Post</option>
                <option value="video">Video Post</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>
          </div>

          {/* Content Text */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Content</h2>

            <textarea
              value={formData.contentText}
              onChange={(e) => setFormData(prev => ({ ...prev, contentText: e.target.value }))}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Write your post content here..."
            />

            <div className="mt-2 text-sm text-gray-600">
              {formData.contentText.length} characters
            </div>
          </div>

          {/* Media URLs */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Media</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Media URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={mediaUrlInput}
                  onChange={(e) => setMediaUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddMediaUrl()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                <button
                  onClick={handleAddMediaUrl}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            {formData.mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {formData.mediaUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EInvalid URL%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <button
                      onClick={() => handleRemoveMediaUrl(url)}
                      className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hashtags */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Hashtags</h2>

            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddHashtag()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter hashtag (without #)"
                />
                <button
                  onClick={handleAddHashtag}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>

            {formData.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveHashtag(tag)}
                      className="text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Platform Selector */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Target Platforms *</h2>

            <div className="space-y-3">
              {platforms.map((platform) => (
                <div key={platform.id}>
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={formData.targetPlatforms.includes(platform.id)}
                      onChange={() => handleTogglePlatform(platform.id)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="flex-1 font-medium">{platform.name}</span>
                  </label>

                  {formData.targetPlatforms.includes(platform.id) && (
                    <div className="ml-11 mt-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Characters: {getCharacterCount(platform.id).current} / {platform.maxLength}</span>
                        <span className={getCharacterCount(platform.id).current > platform.maxLength ? 'text-red-600 font-semibold' : ''}>
                          {getCharacterCount(platform.id).current > platform.maxLength ? '⚠️ Too long!' : '✓'}
                        </span>
                      </div>
                      {getCharacterCount(platform.id).current > platform.recommended && (
                        <p className="text-yellow-600 text-xs mt-1">
                          ⚠️ Exceeds recommended length ({platform.recommended} chars)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Validation Results */}
          {showValidation && Object.keys(validationResults).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Validation Results</h2>

              <div className="space-y-3">
                {Object.entries(validationResults).map(([platform, result]) => (
                  <div key={platform} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{platform}</span>
                      {result.isValid ? (
                        <span className="text-green-600 font-semibold">✓ Valid</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Invalid</span>
                      )}
                    </div>

                    {result.errors.length > 0 && (
                      <div className="space-y-1">
                        {result.errors.map((error, idx) => (
                          <p key={idx} className="text-red-600 text-sm">
                            ⚠️ {error.message}
                          </p>
                        ))}
                      </div>
                    )}

                    {result.warnings.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {result.warnings.map((warning, idx) => (
                          <p key={idx} className="text-yellow-600 text-sm">
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
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>

            <div className="space-y-3">
              <button
                onClick={handleValidate}
                disabled={loading}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Validating...' : '🔍 Validate Content'}
              </button>

              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving...' : '💾 Save as Draft'}
              </button>

              <button
                onClick={handleSubmitForApproval}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {loading ? 'Submitting...' : '✓ Submit for Approval'}
              </button>

              <button
                onClick={() => navigate('/app/content-library')}
                className="w-full bg-white text-gray-700 px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;

