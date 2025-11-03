import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api/http';
import ConversationFlowEditor from '../components/ConversationFlowEditor';

export default function ChatWidgetFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [widget, setWidget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Configuration state (mirror ChatWidgetEditor)
  const [formData, setFormData] = useState({
    widget_name: '',
    primary_color: '#4682B4',
    secondary_color: '#2E86AB',
    position: 'bottom-right',
    welcome_message: 'Hi! How can I help you today?',
    bot_name: 'Assistant',
    bot_avatar_url: '',
    enable_appointment_booking: false,
    enable_email_capture: false,
    enable_phone_capture: false,
    enable_ai_handoff: false,
    ai_handoff_url: '',
    rate_limit_messages: 10,
    rate_limit_window: 60,
    require_captcha: false,
    enable_email_notifications: true,
    notification_email: '',
    visitor_engagement_minutes: 5,
    notify_new_conversation: true,
    notify_agent_handoff: true,
    notify_daily_summary: false
  });

  const [introFlowEnabled, setIntroFlowEnabled] = useState(false);
  const [introQuestions, setIntroQuestions] = useState<any[]>([]);
  const [enableAI, setEnableAI] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiMaxTokens, setAiMaxTokens] = useState(1000);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [enableMultipleWhatsAppChats, setEnableMultipleWhatsAppChats] = useState(false);
  const [enableHandoverChoice, setEnableHandoverChoice] = useState(true);
  const [handoverOptions, setHandoverOptions] = useState({
    portal: true,
    whatsapp: false,
    email: false,
    phone: false,
    webhook: false
  });

  useEffect(() => {
    fetchWidget();
  }, [id]);

  const fetchWidget = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chat-widget/widgets/${id}`);
      const widgetData = response.data;
      setWidget(widgetData);
      
      // Load configuration
      if (widgetData) {
        setFormData({
          widget_name: widgetData.widget_name || '',
          primary_color: widgetData.primary_color || '#4682B4',
          secondary_color: widgetData.secondary_color || '#2E86AB',
          position: widgetData.position || 'bottom-right',
          welcome_message: widgetData.welcome_message || 'Hi! How can I help you today?',
          bot_name: widgetData.bot_name || 'Assistant',
          bot_avatar_url: widgetData.bot_avatar_url || '',
          enable_appointment_booking: widgetData.enable_appointment_booking || false,
          enable_email_capture: widgetData.enable_email_capture || false,
          enable_phone_capture: widgetData.enable_phone_capture || false,
          enable_ai_handoff: widgetData.enable_ai_handoff || false,
          ai_handoff_url: widgetData.ai_handoff_url || '',
          rate_limit_messages: widgetData.rate_limit_messages || 10,
          rate_limit_window: widgetData.rate_limit_window || 60,
          require_captcha: widgetData.require_captcha || false,
          enable_email_notifications: widgetData.enable_email_notifications !== undefined ? widgetData.enable_email_notifications : true,
          notification_email: widgetData.notification_email || '',
          visitor_engagement_minutes: widgetData.visitor_engagement_minutes || 5,
          notify_new_conversation: widgetData.notify_new_conversation !== undefined ? widgetData.notify_new_conversation : true,
          notify_agent_handoff: widgetData.notify_agent_handoff !== undefined ? widgetData.notify_agent_handoff : true,
          notify_daily_summary: widgetData.notify_daily_summary || false
        });

        setIntroFlowEnabled(widgetData.intro_flow_enabled || false);
        if (widgetData.intro_questions) {
          try {
            const questions = typeof widgetData.intro_questions === 'string' 
              ? JSON.parse(widgetData.intro_questions) 
              : widgetData.intro_questions;
            setIntroQuestions(questions);
          } catch (e) {
            console.error('Failed to parse intro_questions:', e);
          }
        }

        setEnableAI(widgetData.llm_enabled || false);
        setAiMaxTokens(widgetData.llm_max_tokens || 1000);
        setWhatsappEnabled(widgetData.enable_whatsapp || false);
        setEnableMultipleWhatsAppChats(widgetData.enable_multiple_whatsapp_chats || false);
        
        if (widgetData.handover_options) {
          try {
            const options = typeof widgetData.handover_options === 'string'
              ? JSON.parse(widgetData.handover_options)
              : widgetData.handover_options;
            setHandoverOptions(options);
          } catch (e) {
            console.error('Failed to parse handover_options:', e);
          }
        }
        setEnableHandoverChoice(widgetData.enable_handover_choice !== undefined ? widgetData.enable_handover_choice : true);
      }
    } catch (error) {
      console.error('Error fetching widget:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const widgetData: any = {
        ...formData,
        intro_flow_enabled: introFlowEnabled,
        intro_questions: introQuestions,
        llm_enabled: enableAI,
        llm_max_tokens: aiMaxTokens,
        enable_whatsapp: whatsappEnabled,
        enable_multiple_whatsapp_chats: enableMultipleWhatsAppChats,
        handover_options: handoverOptions,
        enable_handover_choice: enableHandoverChoice
      };

      if (aiApiKey && aiApiKey.trim().length > 0) {
        widgetData.widget_specific_llm_key = aiApiKey;
      }

      await api.put(`/chat-widget/widgets/${id}`, widgetData);
      setHasUnsavedChanges(false);
      alert('✅ Widget settings saved successfully!');
      fetchWidget(); // Reload to get updated data
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save widget settings');
    } finally {
      setSaving(false);
    }
  };

  const configTabs = [
    { id: 'basic', label: 'Basic Settings', icon: '⚙️' },
    { id: 'intro', label: 'Intro Flow', icon: '🤖' },
    { id: 'ai', label: 'AI Configuration', icon: '🧠' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'handover', label: 'Agent Handover', icon: '👤' },
    { id: 'features', label: 'Features', icon: '✨' },
    { id: 'notifications', label: 'Notifications', icon: '📧' }
  ];

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#2E86AB' }}></i>
        <p>Loading...</p>
      </div>
    );
  }

  if (!widget) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ 
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          padding: '1rem',
          color: '#721c24'
        }}>
          <i className="fas fa-exclamation-circle"></i> Widget not found
        </div>
        <button 
          onClick={() => navigate('/app/chat-widgets')}
          style={{
            marginTop: '1rem',
            padding: '10px 20px',
            background: '#2E86AB',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Widgets
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button 
            onClick={() => navigate('/app/chat-widgets')}
            style={{
              padding: '8px 16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-arrow-left"></i> Back to Widgets
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: '12px 24px',
              background: showConfig ? '#28a745' : '#2E86AB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className={`fas ${showConfig ? 'fa-times' : 'fa-cog'}`}></i>
            {showConfig ? 'Hide Configuration' : '⚙️ Configure Widget Settings'}
          </button>
        </div>

        <h1 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
          Conversation Flow Configuration
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>
          <i className="fas fa-robot" style={{ marginRight: '8px', color: '#2E86AB' }}></i>
          <strong>{widget.bot_name}</strong> - {widget.widget_name}
        </p>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: hasUnsavedChanges ? '2px solid #ffc107' : '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: '#333' }}>
              <i className="fas fa-cog" style={{ marginRight: '8px', color: '#2E86AB' }}></i>
              Widget Configuration
            </h2>
            {hasUnsavedChanges && (
              <div style={{
                padding: '8px 16px',
                background: '#ffc107',
                color: '#000',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                ⚠️ You have unsaved changes
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '2rem',
            borderBottom: '2px solid #e0e0e0',
            paddingBottom: '1rem',
            flexWrap: 'wrap'
          }}>
            {configTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveConfigTab(activeConfigTab === tab.id ? null : tab.id)}
                style={{
                  padding: '10px 20px',
                  background: activeConfigTab === tab.id ? '#2E86AB' : '#f5f5f5',
                  color: activeConfigTab === tab.id ? 'white' : '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (activeConfigTab !== tab.id) {
                    e.currentTarget.style.background = '#e0e0e0';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeConfigTab !== tab.id) {
                    e.currentTarget.style.background = '#f5f5f5';
                  }
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: '400px' }}>
            {/* Basic Settings */}
            {activeConfigTab === 'basic' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>⚙️ Basic Settings</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Widget Name *
                    </label>
                    <input
                      type="text"
                      value={formData.widget_name}
                      onChange={(e) => {
                        setFormData({ ...formData, widget_name: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Bot Name *
                    </label>
                    <input
                      type="text"
                      value={formData.bot_name}
                      onChange={(e) => {
                        setFormData({ ...formData, bot_name: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Welcome Message
                    </label>
                    <textarea
                      value={formData.welcome_message}
                      onChange={(e) => {
                        setFormData({ ...formData, welcome_message: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => {
                        setFormData({ ...formData, primary_color: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        height: '45px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Secondary Color
                    </label>
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => {
                        setFormData({ ...formData, secondary_color: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        height: '45px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Widget Position
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => {
                        setFormData({ ...formData, position: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      Bot Avatar URL
                    </label>
                    <input
                      type="url"
                      value={formData.bot_avatar_url}
                      onChange={(e) => {
                        setFormData({ ...formData, bot_avatar_url: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="https://example.com/avatar.png"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Intro Flow */}
            {activeConfigTab === 'intro' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>🤖 Intro Flow Configuration</h3>
                <div style={{
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={introFlowEnabled}
                      onChange={(e) => {
                        setIntroFlowEnabled(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>
                      ✅ Enable Intro Questions
                    </span>
                  </label>
                  <p style={{ margin: '0.5rem 0 0 30px', fontSize: '13px', color: '#555' }}>
                    Collect customer info before allowing normal chat
                  </p>
                </div>
                {introFlowEnabled && (
                  <div>
                    <p style={{ marginBottom: '1rem', fontSize: '14px', color: '#666' }}>
                      📋 {introQuestions.length} Question{introQuestions.length !== 1 ? 's' : ''} Configured
                    </p>
                    <div style={{
                      background: '#f9f9f9',
                      padding: '1rem',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      <p>💡 To manage intro questions, please use the full Widget Editor page.</p>
                      <button
                        onClick={() => navigate(`/app/chat-widgets/${id}/edit`)}
                        style={{
                          marginTop: '1rem',
                          padding: '10px 20px',
                          background: '#2E86AB',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        <i className="fas fa-external-link-alt" style={{ marginRight: '8px' }}></i>
                        Open Full Editor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Configuration */}
            {activeConfigTab === 'ai' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>🧠 AI Configuration</h3>
                <div style={{
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={enableAI}
                      onChange={(e) => {
                        setEnableAI(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>
                      ✅ Enable AI Smart Responses (Google Gemini)
                    </span>
                  </label>
                  <p style={{ margin: '0.5rem 0 0 30px', fontSize: '13px', color: '#555' }}>
                    AI will answer questions the Knowledge Base can't handle
                  </p>
                </div>
                {enableAI && (
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Google AI API Key
                      </label>
                      <input
                        type="password"
                        value={aiApiKey}
                        onChange={(e) => {
                          setAiApiKey(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Enter API key (leave blank to keep existing)"
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Get your free API key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                        Monthly Token Limit
                      </label>
                      <input
                        type="number"
                        value={aiMaxTokens}
                        onChange={(e) => {
                          setAiMaxTokens(parseInt(e.target.value) || 1000);
                          setHasUnsavedChanges(true);
                        }}
                        min={100}
                        step={100}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WhatsApp */}
            {activeConfigTab === 'whatsapp' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>💬 WhatsApp Integration</h3>
                <div style={{
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={whatsappEnabled}
                      onChange={(e) => {
                        setWhatsappEnabled(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '700', fontSize: '16px' }}>
                      ✅ Enable WhatsApp for Agent Handoff
                    </span>
                  </label>
                  <p style={{ margin: '0.5rem 0 0 30px', fontSize: '13px', color: '#555' }}>
                    Connect your Twilio WhatsApp Business Account
                  </p>
                </div>
                {whatsappEnabled && (
                  <div style={{
                    background: '#f9f9f9',
                    padding: '1rem',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#666'
                  }}>
                    <p>💡 To configure WhatsApp credentials and settings, please use the full Widget Editor page.</p>
                    <button
                      onClick={() => navigate(`/app/chat-widgets/${id}/edit`)}
                      style={{
                        marginTop: '1rem',
                        padding: '10px 20px',
                        background: '#2E86AB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      <i className="fas fa-external-link-alt" style={{ marginRight: '8px' }}></i>
                      Open Full Editor
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Agent Handover */}
            {activeConfigTab === 'handover' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>👤 Agent Handover Settings</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={enableHandoverChoice}
                      onChange={(e) => {
                        setEnableHandoverChoice(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '600' }}>
                      Enable Handover Choice
                    </span>
                  </label>
                </div>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {Object.entries(handoverOptions).map(([key, enabled]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => {
                          const newOptions = { ...handoverOptions, [key]: e.target.checked };
                          // Ensure at least one option is enabled
                          if (!e.target.checked && Object.values(newOptions).filter(v => v).length === 0) {
                            alert('At least one handover option must be enabled');
                            return;
                          }
                          setHandoverOptions(newOptions);
                          setHasUnsavedChanges(true);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>
                        {key === 'portal' ? '🖥️ Portal' : 
                         key === 'whatsapp' ? '💬 WhatsApp' :
                         key === 'email' ? '📧 Email' :
                         key === 'phone' ? '📞 Phone/SMS' :
                         '🔗 Webhook'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {activeConfigTab === 'features' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>✨ Feature Flags</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {[
                    { key: 'enable_appointment_booking', label: '📅 Appointment Booking', icon: '📅' },
                    { key: 'enable_email_capture', label: '📧 Email Capture', icon: '📧' },
                    { key: 'enable_phone_capture', label: '📞 Phone Capture', icon: '📞' },
                    { key: 'enable_ai_handoff', label: '🤖 AI Agent Handoff', icon: '🤖' }
                  ].map(feature => (
                    <label key={feature.key} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px', padding: '12px', background: '#f9f9f9', borderRadius: '8px' }}>
                      <input
                        type="checkbox"
                        checked={formData[feature.key as keyof typeof formData] as boolean}
                        onChange={(e) => {
                          setFormData({ ...formData, [feature.key]: e.target.checked });
                          setHasUnsavedChanges(true);
                        }}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600' }}>{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications */}
            {activeConfigTab === 'notifications' && (
              <div>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>📧 Email Notifications</h3>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={formData.enable_email_notifications}
                        onChange={(e) => {
                          setFormData({ ...formData, enable_email_notifications: e.target.checked });
                          setHasUnsavedChanges(true);
                        }}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '600' }}>Enable Email Notifications</span>
                    </label>
                  </div>
                  {formData.enable_email_notifications && (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                          Notification Email Address
                        </label>
                        <input
                          type="email"
                          value={formData.notification_email}
                          onChange={(e) => {
                            setFormData({ ...formData, notification_email: e.target.value });
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="notifications@example.com"
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '2px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={formData.notify_new_conversation}
                            onChange={(e) => {
                              setFormData({ ...formData, notify_new_conversation: e.target.checked });
                              setHasUnsavedChanges(true);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span>Notify on new conversation</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={formData.notify_agent_handoff}
                            onChange={(e) => {
                              setFormData({ ...formData, notify_agent_handoff: e.target.checked });
                              setHasUnsavedChanges(true);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span>Notify on agent handoff</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={formData.notify_daily_summary}
                            onChange={(e) => {
                              setFormData({ ...formData, notify_daily_summary: e.target.checked });
                              setHasUnsavedChanges(true);
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span>Daily summary email</span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {!activeConfigTab && (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#666',
                fontSize: '16px'
              }}>
                <i className="fas fa-arrow-up" style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2E86AB' }}></i>
                <p>Select a configuration tab above to start editing</p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '2px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem'
          }}>
            <button
              onClick={() => {
                if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                  return;
                }
                setShowConfig(false);
                setHasUnsavedChanges(false);
                fetchWidget();
              }}
              style={{
                padding: '12px 24px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              onClick={saveConfiguration}
              disabled={saving || !hasUnsavedChanges}
              style={{
                padding: '12px 24px',
                background: hasUnsavedChanges ? '#28a745' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: hasUnsavedChanges ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Flow Editor Component */}
      <ConversationFlowEditor 
        widgetId={parseInt(id || '0')}
        onSave={() => {
          console.log('Flow saved successfully');
        }}
      />
    </div>
  );
}