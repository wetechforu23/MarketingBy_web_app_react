import { useState, useEffect } from 'react';
import { api } from '../api/http';

export default function SystemArchitecture() {
  const [activeTab, setActiveTab] = useState<'erd' | 'dictionary' | 'apis' | 'flow' | 'swagger'>('erd');
  const [schemaData, setSchemaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch schema information if available
    // For now, we'll use static data from master document
    setLoading(false);
  }, []);

  // Core Database Tables with relationships
  const tables = [
    {
      name: 'users',
      description: 'System users with role-based access control',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'email', type: 'VARCHAR(255)', uk: true, description: 'Unique email address' },
        { name: 'password_hash', type: 'VARCHAR(255)', description: 'Encrypted password' },
        { name: 'role', type: 'VARCHAR(50)', description: 'User role (super_admin, client_admin, etc.)' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Associated client' },
        { name: 'permissions', type: 'JSONB', description: 'Role-based permissions' },
        { name: 'is_active', type: 'BOOLEAN', description: 'Account status' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Account creation date' },
        { name: 'updated_at', type: 'TIMESTAMP', description: 'Last update timestamp' }
      ]
    },
    {
      name: 'clients',
      description: 'Client organizations and their information',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_name', type: 'VARCHAR(255)', description: 'Client company name' },
        { name: 'email', type: 'VARCHAR(255)', uk: true, description: 'Primary contact email' },
        { name: 'phone', type: 'VARCHAR(20)', description: 'Contact phone number' },
        { name: 'status', type: 'VARCHAR(50)', description: 'Client status (active, inactive)' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Client registration date' }
      ]
    },
    {
      name: 'leads',
      description: 'Sales leads and prospects',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Associated client' },
        { name: 'name', type: 'VARCHAR(255)', description: 'Lead name' },
        { name: 'email', type: 'VARCHAR(255)', description: 'Lead email' },
        { name: 'phone', type: 'VARCHAR(20)', description: 'Lead phone' },
        { name: 'company', type: 'VARCHAR(255)', description: 'Company name' },
        { name: 'status', type: 'VARCHAR(50)', description: 'Lead status (new, contacted, etc.)' },
        { name: 'source', type: 'VARCHAR(100)', description: 'Lead source' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Lead creation date' }
      ]
    },
    {
      name: 'widget_configs',
      description: 'Chat widget configurations',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Owning client' },
        { name: 'widget_key', type: 'VARCHAR(255)', uk: true, description: 'Unique widget identifier' },
        { name: 'widget_name', type: 'VARCHAR(255)', description: 'Widget display name' },
        { name: 'welcome_message', type: 'TEXT', description: 'Welcome message text' },
        { name: 'bot_name', type: 'VARCHAR(100)', description: 'Bot name' },
        { name: 'intro_flow_enabled', type: 'BOOLEAN', description: 'Enable intro questions' },
        { name: 'intro_questions', type: 'JSONB', description: 'Intro question configuration' },
        { name: 'llm_enabled', type: 'BOOLEAN', description: 'AI responses enabled' },
        { name: 'enable_whatsapp', type: 'BOOLEAN', description: 'WhatsApp handoff enabled' },
        { name: 'is_active', type: 'BOOLEAN', description: 'Widget active status' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation timestamp' }
      ]
    },
    {
      name: 'widget_conversations',
      description: 'Chat widget conversation sessions',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Associated widget' },
        { name: 'visitor_session_id', type: 'VARCHAR(255)', description: 'Persistent visitor ID (localStorage)' },
        { name: 'session_id', type: 'VARCHAR(100)', description: 'Tab-specific session ID' },
        { name: 'visitor_name', type: 'VARCHAR(255)', description: 'Visitor name' },
        { name: 'visitor_email', type: 'VARCHAR(255)', description: 'Visitor email' },
        { name: 'visitor_phone', type: 'VARCHAR(50)', description: 'Visitor phone' },
        { name: 'status', type: 'VARCHAR(50)', description: 'Conversation status (active, ended, expired)' },
        { name: 'agent_handoff', type: 'BOOLEAN', description: 'Agent takeover flag' },
        { name: 'intro_completed', type: 'BOOLEAN', description: 'Intro form completed' },
        { name: 'intro_data', type: 'JSONB', description: 'Collected intro form data' },
        { name: 'message_count', type: 'INTEGER', description: 'Total messages' },
        { name: 'last_activity_at', type: 'TIMESTAMP', description: 'Last activity timestamp' },
        { name: 'last_agent_activity_at', type: 'TIMESTAMP', description: 'Last agent message time' },
        { name: 'last_visitor_activity_at', type: 'TIMESTAMP', description: 'Last visitor message time' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Conversation start time' },
        { name: 'ended_at', type: 'TIMESTAMP', description: 'Conversation end time' }
      ]
    },
    {
      name: 'widget_messages',
      description: 'Individual messages in conversations',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Parent conversation' },
        { name: 'message_type', type: 'VARCHAR(50)', description: 'Message type (user, bot, human, system)' },
        { name: 'message_text', type: 'TEXT', description: 'Message content' },
        { name: 'agent_name', type: 'VARCHAR(255)', description: 'Agent name (if human)' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Message timestamp' }
      ]
    },
    {
      name: 'encrypted_credentials',
      description: 'Securely stored API keys and credentials (AES-256 encrypted)',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'service_name', type: 'VARCHAR(255)', description: 'Service identifier (google_ai, twilio, etc.)' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client-specific credential' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget-specific credential' },
        { name: 'environment', type: 'VARCHAR(50)', description: 'Environment (dev, staging, prod)' },
        { name: 'encrypted_value', type: 'TEXT', description: 'AES-256 encrypted credential value' },
        { name: 'is_active', type: 'BOOLEAN', description: 'Active status' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation timestamp' }
      ]
    },
    {
      name: 'whatsapp_messages',
      description: 'WhatsApp message tracking and billing',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Associated conversation' },
        { name: 'twilio_message_sid', type: 'VARCHAR(255)', description: 'Twilio message SID' },
        { name: 'message_type', type: 'VARCHAR(50)', description: 'Message type (template, session)' },
        { name: 'message_text', type: 'TEXT', description: 'Message content' },
        { name: 'twilio_price', type: 'DECIMAL(10,4)', description: 'Actual Twilio charge' },
        { name: 'twilio_price_unit', type: 'VARCHAR(10)', description: 'Currency unit (USD)' },
        { name: 'sent_at', type: 'TIMESTAMP', description: 'Message sent timestamp' }
      ]
    },
    {
      name: 'whatsapp_usage',
      description: 'WhatsApp usage statistics and billing',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'messages_sent_today', type: 'INTEGER', description: 'Messages sent today' },
        { name: 'messages_sent_this_month', type: 'INTEGER', description: 'Messages sent this month' },
        { name: 'total_messages_sent', type: 'INTEGER', description: 'Total all-time messages' },
        { name: 'conversations_today', type: 'INTEGER', description: 'Conversations initiated today' },
        { name: 'conversations_this_month', type: 'INTEGER', description: 'Conversations this month' },
        { name: 'actual_cost_today', type: 'DECIMAL(10,4)', description: 'Actual cost today (from Twilio API)' },
        { name: 'actual_cost_this_month', type: 'DECIMAL(10,4)', description: 'Actual cost this month' },
        { name: 'total_actual_cost', type: 'DECIMAL(10,2)', description: 'Total actual cost' },
        { name: 'last_monthly_reset', type: 'DATE', description: 'Last monthly reset date' },
        { name: 'updated_at', type: 'TIMESTAMP', description: 'Last update timestamp' }
      ]
    },
    {
      name: 'client_llm_usage',
      description: 'LLM (Google Gemini) usage tracking',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'tokens_used_today', type: 'BIGINT', description: 'Tokens used today' },
        { name: 'tokens_used_this_month', type: 'BIGINT', description: 'Tokens used this month' },
        { name: 'total_tokens_used', type: 'BIGINT', description: 'Total tokens all-time' },
        { name: 'requests_today', type: 'INTEGER', description: 'API requests today' },
        { name: 'requests_this_month', type: 'INTEGER', description: 'Requests this month' },
        { name: 'updated_at', type: 'TIMESTAMP', description: 'Last update timestamp' }
      ]
    },
    {
      name: 'handover_requests',
      description: 'Agent handover requests from chat widget',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Source conversation' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'requested_method', type: 'VARCHAR(50)', description: 'Handover method (whatsapp, email, portal, etc.)' },
        { name: 'visitor_name', type: 'VARCHAR(255)', description: 'Visitor name' },
        { name: 'visitor_email', type: 'VARCHAR(255)', description: 'Visitor email' },
        { name: 'visitor_phone', type: 'VARCHAR(50)', description: 'Visitor phone' },
        { name: 'status', type: 'VARCHAR(50)', description: 'Request status (notified, completed, failed)' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Request timestamp' }
      ]
    },
    {
      name: 'widget_visitor_sessions',
      description: 'Visitor session tracking and analytics',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'session_id', type: 'VARCHAR(100)', uk: true, description: 'Unique session identifier' },
        { name: 'visitor_fingerprint', type: 'VARCHAR(255)', description: 'Browser fingerprint' },
        { name: 'visitor_name', type: 'VARCHAR(255)', description: 'Visitor name' },
        { name: 'visitor_email', type: 'VARCHAR(255)', description: 'Visitor email' },
        { name: 'ip_address', type: 'VARCHAR(45)', description: 'IP address' },
        { name: 'country', type: 'VARCHAR(100)', description: 'Country' },
        { name: 'is_active', type: 'BOOLEAN', description: 'Active session flag' },
        { name: 'page_views', type: 'INTEGER', description: 'Total page views' },
        { name: 'conversation_id', type: 'INTEGER', fk: 'widget_conversations.id', description: 'Associated conversation' },
        { name: 'last_active_at', type: 'TIMESTAMP', description: 'Last activity timestamp' }
      ]
    },
    {
      name: 'widget_knowledge_base',
      description: 'Chat widget knowledge base entries',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget owner' },
        { name: 'category', type: 'VARCHAR(100)', description: 'Question category' },
        { name: 'question', type: 'TEXT', description: 'Question text' },
        { name: 'answer', type: 'TEXT', description: 'Answer text' },
        { name: 'keywords', type: 'TEXT[]', description: 'Search keywords' },
        { name: 'times_used', type: 'INTEGER', description: 'Usage count' },
        { name: 'is_active', type: 'BOOLEAN', description: 'Active status' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation timestamp' }
      ]
    },
    {
      name: 'widget_page_views',
      description: 'Detailed page view tracking for visitors',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'session_id', type: 'VARCHAR(100)', fk: 'widget_visitor_sessions.session_id', description: 'Session identifier' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'page_url', type: 'TEXT', description: 'Page URL' },
        { name: 'page_title', type: 'VARCHAR(500)', description: 'Page title' },
        { name: 'time_on_page_seconds', type: 'INTEGER', description: 'Time spent on page' },
        { name: 'viewed_at', type: 'TIMESTAMP', description: 'View timestamp' }
      ]
    },
    {
      name: 'widget_visitor_events',
      description: 'Visitor event tracking (clicks, form submissions, etc.)',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'session_id', type: 'VARCHAR(100)', fk: 'widget_visitor_sessions.session_id', description: 'Session identifier' },
        { name: 'widget_id', type: 'INTEGER', fk: 'widget_configs.id', description: 'Widget source' },
        { name: 'event_type', type: 'VARCHAR(100)', description: 'Event type (page_view, button_click, etc.)' },
        { name: 'event_data', type: 'JSONB', description: 'Event data payload' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Event timestamp' }
      ]
    },
    {
      name: 'seo_configurations',
      description: 'Client-specific SEO configuration settings',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'configuration_name', type: 'VARCHAR(255)', description: 'Configuration name' },
        { name: 'title_min_length', type: 'INTEGER', description: 'Minimum title length' },
        { name: 'title_max_length', type: 'INTEGER', description: 'Maximum title length' },
        { name: 'meta_desc_min_length', type: 'INTEGER', description: 'Minimum meta description length' },
        { name: 'meta_desc_max_length', type: 'INTEGER', description: 'Maximum meta description length' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation timestamp' }
      ]
    },
    {
      name: 'seo_page_audits',
      description: 'SEO page-level audit results',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'client_id', type: 'INTEGER', fk: 'clients.id', description: 'Client owner' },
        { name: 'page_url', type: 'TEXT', description: 'Page URL audited' },
        { name: 'audit_score', type: 'INTEGER', description: 'SEO score (0-100)' },
        { name: 'issues_found', type: 'JSONB', description: 'List of issues found' },
        { name: 'recommendations', type: 'JSONB', description: 'SEO recommendations' },
        { name: 'audited_at', type: 'TIMESTAMP', description: 'Audit timestamp' }
      ]
    },
    {
      name: 'seo_audit_tasks',
      description: 'SEO audit task management',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'lead_id', type: 'INTEGER', fk: 'leads.id', description: 'Associated lead' },
        { name: 'task_category', type: 'VARCHAR(100)', description: 'Task category' },
        { name: 'task_priority', type: 'VARCHAR(50)', description: 'Priority level' },
        { name: 'task_title', type: 'VARCHAR(255)', description: 'Task title' },
        { name: 'task_status', type: 'VARCHAR(50)', description: 'Task status' },
        { name: 'assigned_to', type: 'VARCHAR(255)', description: 'Assigned user' },
        { name: 'due_date', type: 'DATE', description: 'Due date' },
        { name: 'completed_at', type: 'TIMESTAMP', description: 'Completion timestamp' }
      ]
    },
    {
      name: 'ai_seo_content',
      description: 'AI-generated SEO content',
      columns: [
        { name: 'id', type: 'SERIAL', pk: true, description: 'Primary key' },
        { name: 'lead_id', type: 'INTEGER', fk: 'leads.id', description: 'Associated lead' },
        { name: 'title', type: 'VARCHAR(500)', description: 'Content title' },
        { name: 'description', type: 'TEXT', description: 'Meta description' },
        { name: 'content', type: 'TEXT', description: 'Full content body' },
        { name: 'conversational_answers', type: 'JSONB', description: 'Q&A pairs' },
        { name: 'semantic_keywords', type: 'JSONB', description: 'Semantic keywords' },
        { name: 'created_at', type: 'TIMESTAMP', description: 'Creation timestamp' }
      ]
    }
  ];

  // API Endpoints
  const apiEndpoints = [
    {
      category: 'Authentication',
      endpoints: [
        { method: 'POST', path: '/api/auth/login', description: 'User login', auth: false },
        { method: 'POST', path: '/api/auth/logout', description: 'User logout', auth: true },
        { method: 'GET', path: '/api/auth/me', description: 'Get current user', auth: true }
      ]
    },
    {
      category: 'Chat Widget (Public)',
      endpoints: [
        { method: 'GET', path: '/api/chat-widget/public/widget/:widgetKey/config', description: 'Get widget configuration', auth: false },
        { method: 'POST', path: '/api/chat-widget/public/widget/:widgetKey/message', description: 'Send message', auth: false },
        { method: 'GET', path: '/api/chat-widget/public/widget/:widgetKey/conversation/by-visitor/:visitorSessionId', description: 'Find conversation by visitor ID', auth: false },
        { method: 'GET', path: '/api/chat-widget/public/widget/:widgetKey/conversations/:conversationId/messages', description: 'Get conversation messages', auth: false },
        { method: 'GET', path: '/api/chat-widget/public/widget/:widgetKey/conversations/:conversationId/status', description: 'Get conversation status', auth: false }
      ]
    },
    {
      category: 'Chat Widget (Admin)',
      endpoints: [
        { method: 'GET', path: '/api/chat-widget/widgets', description: 'List widgets', auth: true },
        { method: 'GET', path: '/api/chat-widget/widgets/:id', description: 'Get widget details', auth: true },
        { method: 'PUT', path: '/api/chat-widget/widgets/:id', description: 'Update widget', auth: true },
        { method: 'GET', path: '/api/chat-widget/widgets/:id/conversations', description: 'List conversations', auth: true },
        { method: 'GET', path: '/api/chat-widget/conversations/:id/messages', description: 'Get messages', auth: true },
        { method: 'POST', path: '/api/chat-widget/conversations/:id/reply', description: 'Reply to conversation', auth: true }
      ]
    },
    {
      category: 'WhatsApp',
      endpoints: [
        { method: 'POST', path: '/api/whatsapp/incoming', description: 'Twilio webhook for incoming messages', auth: false },
        { method: 'POST', path: '/api/whatsapp/status-callback', description: 'Twilio status callback', auth: false },
        { method: 'GET', path: '/api/whatsapp/settings/:clientId', description: 'Get WhatsApp settings', auth: true },
        { method: 'POST', path: '/api/whatsapp/settings', description: 'Save WhatsApp settings', auth: true },
        { method: 'POST', path: '/api/whatsapp/send', description: 'Send WhatsApp message', auth: true }
      ]
    },
    {
      category: 'Agent Handover',
      endpoints: [
        { method: 'POST', path: '/api/handover/request', description: 'Request agent handover', auth: false },
        { method: 'GET', path: '/api/handover/config/:widgetKey', description: 'Get handover configuration', auth: false }
      ]
    },
    {
      category: 'Credentials',
      endpoints: [
        { method: 'GET', path: '/api/credentials', description: 'List credentials', auth: true },
        { method: 'POST', path: '/api/credentials', description: 'Create credential', auth: true },
        { method: 'PUT', path: '/api/credentials/:id', description: 'Update credential', auth: true },
        { method: 'DELETE', path: '/api/credentials/:id', description: 'Delete credential', auth: true }
      ]
    },
    {
      category: 'Leads',
      endpoints: [
        { method: 'GET', path: '/api/leads', description: 'List leads', auth: true },
        { method: 'POST', path: '/api/leads', description: 'Create lead', auth: true },
        { method: 'GET', path: '/api/leads/:id', description: 'Get lead details', auth: true },
        { method: 'PUT', path: '/api/leads/:id', description: 'Update lead', auth: true }
      ]
    },
    {
      category: 'Admin',
      endpoints: [
        { method: 'GET', path: '/api/admin/users', description: 'List users', auth: true },
        { method: 'GET', path: '/api/admin/clients', description: 'List clients', auth: true },
        { method: 'POST', path: '/api/admin/clients', description: 'Create client', auth: true }
      ]
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0', color: '#333', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-sitemap" style={{ fontSize: '2rem', color: '#2E86AB' }}></i>
          System Architecture & Database
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>
          Complete database schema, ERD diagram, data dictionary, and API documentation
        </p>
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
        {[
          { id: 'erd', label: 'ERD Diagram', icon: '🔗' },
          { id: 'dictionary', label: 'Data Dictionary', icon: '📚' },
          { id: 'apis', label: 'API Endpoints', icon: '🔌' },
          { id: 'flow', label: 'Architecture Flow', icon: '🔄' },
          { id: 'swagger', label: 'API Tester (Swagger)', icon: '🧪' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab.id ? '#2E86AB' : '#f5f5f5',
              color: activeTab === tab.id ? 'white' : '#333',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {/* ERD Diagram Tab */}
        {activeTab === 'erd' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🔗 Entity Relationship Diagram (ERD)
            </h2>
            <div style={{
              background: '#f9f9f9',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              overflow: 'auto',
              minHeight: '600px'
            }}>
              <svg width="100%" height="600" viewBox="0 0 1200 600" style={{ background: 'white', borderRadius: '4px' }}>
                {/* Define styles */}
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <polygon points="0 0, 10 3, 0 6" fill="#2E86AB" />
                  </marker>
                </defs>

                {/* Tables as rectangles */}
                {/* Users */}
                <rect x="50" y="50" width="180" height="140" fill="#e3f2fd" stroke="#2E86AB" strokeWidth="2" rx="4" />
                <text x="140" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1976d2">USERS</text>
                <line x1="60" y1="85" x2="220" y2="85" stroke="#1976d2" strokeWidth="1" />
                <text x="65" y="105" fontSize="11" fill="#333">• id (PK)</text>
                <text x="65" y="125" fontSize="11" fill="#333">• email (UK)</text>
                <text x="65" y="145" fontSize="11" fill="#333">• role</text>
                <text x="65" y="165" fontSize="11" fill="#333">• client_id (FK)</text>

                {/* Clients */}
                <rect x="300" y="50" width="180" height="140" fill="#e3f2fd" stroke="#2E86AB" strokeWidth="2" rx="4" />
                <text x="390" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1976d2">CLIENTS</text>
                <line x1="310" y1="85" x2="470" y2="85" stroke="#1976d2" strokeWidth="1" />
                <text x="315" y="105" fontSize="11" fill="#333">• id (PK)</text>
                <text x="315" y="125" fontSize="11" fill="#333">• client_name</text>
                <text x="315" y="145" fontSize="11" fill="#333">• email (UK)</text>
                <text x="315" y="165" fontSize="11" fill="#333">• status</text>

                {/* Widget Configs */}
                <rect x="550" y="50" width="200" height="160" fill="#fff3e0" stroke="#ff9800" strokeWidth="2" rx="4" />
                <text x="650" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f57c00">WIDGET_CONFIGS</text>
                <line x1="560" y1="85" x2="740" y2="85" stroke="#f57c00" strokeWidth="1" />
                <text x="565" y="105" fontSize="11" fill="#333">• id (PK)</text>
                <text x="565" y="125" fontSize="11" fill="#333">• client_id (FK)</text>
                <text x="565" y="145" fontSize="11" fill="#333">• widget_key (UK)</text>
                <text x="565" y="165" fontSize="11" fill="#333">• widget_name</text>
                <text x="565" y="185" fontSize="11" fill="#333">• llm_enabled</text>

                {/* Widget Conversations */}
                <rect x="800" y="50" width="220" height="200" fill="#f3e5f5" stroke="#9c27b0" strokeWidth="2" rx="4" />
                <text x="910" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#7b1fa2">WIDGET_CONVERSATIONS</text>
                <line x1="810" y1="85" x2="1010" y2="85" stroke="#7b1fa2" strokeWidth="1" />
                <text x="815" y="105" fontSize="11" fill="#333">• id (PK)</text>
                <text x="815" y="125" fontSize="11" fill="#333">• widget_id (FK)</text>
                <text x="815" y="145" fontSize="11" fill="#333">• visitor_session_id</text>
                <text x="815" y="165" fontSize="11" fill="#333">• status</text>
                <text x="815" y="185" fontSize="11" fill="#333">• agent_handoff</text>
                <text x="815" y="205" fontSize="11" fill="#333">• intro_completed</text>
                <text x="815" y="225" fontSize="11" fill="#333">• message_count</text>

                {/* Widget Messages */}
                <rect x="800" y="300" width="220" height="140" fill="#e8f5e9" stroke="#4caf50" strokeWidth="2" rx="4" />
                <text x="910" y="325" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#388e3c">WIDGET_MESSAGES</text>
                <line x1="810" y1="335" x2="1010" y2="335" stroke="#388e3c" strokeWidth="1" />
                <text x="815" y="355" fontSize="11" fill="#333">• id (PK)</text>
                <text x="815" y="375" fontSize="11" fill="#333">• conversation_id (FK)</text>
                <text x="815" y="395" fontSize="11" fill="#333">• message_type</text>
                <text x="815" y="415" fontSize="11" fill="#333">• message_text</text>

                {/* Leads */}
                <rect x="300" y="250" width="180" height="140" fill="#fff9c4" stroke="#fbc02d" strokeWidth="2" rx="4" />
                <text x="390" y="275" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f57f17">LEADS</text>
                <line x1="310" y1="285" x2="470" y2="285" stroke="#f57f17" strokeWidth="1" />
                <text x="315" y="305" fontSize="11" fill="#333">• id (PK)</text>
                <text x="315" y="325" fontSize="11" fill="#333">• client_id (FK)</text>
                <text x="315" y="345" fontSize="11" fill="#333">• name, email</text>
                <text x="315" y="365" fontSize="11" fill="#333">• status</text>

                {/* Encrypted Credentials */}
                <rect x="550" y="250" width="200" height="160" fill="#ffebee" stroke="#f44336" strokeWidth="2" rx="4" />
                <text x="650" y="275" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#c62828">ENCRYPTED_CREDENTIALS</text>
                <line x1="560" y1="285" x2="740" y2="285" stroke="#c62828" strokeWidth="1" />
                <text x="565" y="305" fontSize="11" fill="#333">• id (PK)</text>
                <text x="565" y="325" fontSize="11" fill="#333">• service_name</text>
                <text x="565" y="345" fontSize="11" fill="#333">• client_id (FK)</text>
                <text x="565" y="365" fontSize="11" fill="#333">• widget_id (FK)</text>
                <text x="565" y="385" fontSize="11" fill="#333">• encrypted_value</text>

                {/* WhatsApp Messages */}
                <rect x="50" y="250" width="200" height="180" fill="#e0f2f1" stroke="#009688" strokeWidth="2" rx="4" />
                <text x="150" y="275" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#00695c">WHATSAPP_MESSAGES</text>
                <line x1="60" y1="285" x2="240" y2="285" stroke="#00695c" strokeWidth="1" />
                <text x="65" y="305" fontSize="11" fill="#333">• id (PK)</text>
                <text x="65" y="325" fontSize="11" fill="#333">• client_id (FK)</text>
                <text x="65" y="345" fontSize="11" fill="#333">• widget_id (FK)</text>
                <text x="65" y="365" fontSize="11" fill="#333">• conversation_id (FK)</text>
                <text x="65" y="385" fontSize="11" fill="#333">• twilio_price</text>
                <text x="65" y="405" fontSize="11" fill="#333">• twilio_message_sid</text>

                {/* WhatsApp Usage */}
                <rect x="50" y="480" width="200" height="140" fill="#c8e6c9" stroke="#4caf50" strokeWidth="2" rx="4" />
                <text x="150" y="505" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#2e7d32">WHATSAPP_USAGE</text>
                <line x1="60" y1="515" x2="240" y2="515" stroke="#2e7d32" strokeWidth="1" />
                <text x="65" y="535" fontSize="11" fill="#333">• id (PK)</text>
                <text x="65" y="555" fontSize="11" fill="#333">• client_id (FK)</text>
                <text x="65" y="575" fontSize="11" fill="#333">• messages_sent_this_month</text>
                <text x="65" y="595" fontSize="11" fill="#333">• actual_cost_this_month</text>

                {/* Client LLM Usage */}
                <rect x="300" y="480" width="200" height="140" fill="#e1bee7" stroke="#9c27b0" strokeWidth="2" rx="4" />
                <text x="400" y="505" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#7b1fa2">CLIENT_LLM_USAGE</text>
                <line x1="310" y1="515" x2="490" y2="515" stroke="#7b1fa2" strokeWidth="1" />
                <text x="315" y="535" fontSize="11" fill="#333">• id (PK)</text>
                <text x="315" y="555" fontSize="11" fill="#333">• client_id (FK)</text>
                <text x="315" y="575" fontSize="11" fill="#333">• widget_id (FK)</text>
                <text x="315" y="595" fontSize="11" fill="#333">• tokens_used_this_month</text>

                {/* Relationships - Lines with arrows */}
                {/* Users -> Clients */}
                <line x1="230" y1="120" x2="300" y2="120" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="265" y="115" fontSize="10" fill="#2E86AB">client_id</text>

                {/* Clients -> Widget Configs */}
                <line x1="480" y1="120" x2="550" y2="120" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="515" y="115" fontSize="10" fill="#2E86AB">client_id</text>

                {/* Widget Configs -> Widget Conversations */}
                <line x1="750" y1="130" x2="800" y2="150" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="775" y="140" fontSize="10" fill="#2E86AB">widget_id</text>

                {/* Widget Conversations -> Widget Messages */}
                <line x1="910" y1="250" x2="910" y2="300" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="920" y="275" fontSize="10" fill="#2E86AB">conversation_id</text>

                {/* Clients -> Leads */}
                <line x1="390" y1="190" x2="390" y2="250" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="400" y="220" fontSize="10" fill="#2E86AB">client_id</text>

                {/* Widget Configs -> Encrypted Credentials */}
                <line x1="650" y1="210" x2="650" y2="250" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="660" y="230" fontSize="10" fill="#2E86AB">widget_id</text>

                {/* Widget Conversations -> WhatsApp Messages */}
                <line x1="800" y1="230" x2="150" y2="330" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="475" y="275" fontSize="10" fill="#2E86AB">conversation_id</text>

                {/* Clients -> WhatsApp Usage */}
                <line x1="390" y1="190" x2="150" y2="480" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="270" y="335" fontSize="10" fill="#2E86AB">client_id</text>

                {/* Clients -> Client LLM Usage */}
                <line x1="480" y1="190" x2="400" y2="480" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="440" y="335" fontSize="10" fill="#2E86AB">client_id</text>

                {/* Widget Configs -> Client LLM Usage */}
                <line x1="650" y1="210" x2="400" y2="480" stroke="#2E86AB" strokeWidth="2" markerEnd="url(#arrowhead)" />
                <text x="525" y="345" fontSize="10" fill="#2E86AB">widget_id</text>

                {/* Legend */}
                <rect x="550" y="480" width="470" height="140" fill="white" stroke="#ccc" strokeWidth="1" rx="4" />
                <text x="785" y="500" textAnchor="middle" fontSize="12" fontWeight="bold">Legend</text>
                <text x="560" y="525" fontSize="11" fill="#333">PK = Primary Key | FK = Foreign Key | UK = Unique Key</text>
                <text x="560" y="545" fontSize="11" fill="#333">Color Coding:</text>
                <text x="560" y="565" fontSize="11" fill="#333">🔵 Blue = Core (Users, Clients) | 🟠 Orange = Widgets</text>
                <text x="560" y="585" fontSize="11" fill="#333">🟣 Purple = Conversations | 🟢 Green = Messages/Usage | 🔴 Red = Credentials</text>
                <text x="560" y="605" fontSize="11" fill="#333">💡 All tables shown are active in production (Heroku PostgreSQL)</text>
              </svg>
            </div>
          </div>
        )}

        {/* Data Dictionary Tab */}
        {activeTab === 'dictionary' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              📚 Data Dictionary
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Complete table definitions with columns, data types, and relationships
            </p>
            
            {tables.map((table, idx) => (
              <div key={idx} style={{
                marginBottom: '2rem',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #2E86AB 0%, #1e5a7a 100%)',
                  padding: '1rem',
                  color: 'white'
                }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-table"></i>
                    {table.name.toUpperCase()}
                  </h3>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                    {table.description}
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Column Name</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Data Type</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Constraints</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((col, colIdx) => (
                        <tr key={colIdx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0' }}>
                            <strong>{col.name}</strong>
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', fontFamily: 'monospace', fontSize: '13px' }}>
                            {col.type}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0' }}>
                            {col.pk && <span style={{ background: '#4caf50', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>PK</span>}
                            {col.uk && <span style={{ background: '#2196f3', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>UK</span>}
                            {col.fk && <span style={{ background: '#ff9800', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>FK: {col.fk}</span>}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', color: '#666', fontSize: '13px' }}>
                            {col.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Endpoints Tab */}
        {activeTab === 'apis' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🔌 API Endpoints
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Complete REST API documentation with methods, paths, and descriptions
            </p>
            
            {apiEndpoints.map((category, idx) => (
              <div key={idx} style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '12px 16px',
                  borderRadius: '8px 8px 0 0',
                  margin: 0
                }}>
                  {category.category}
                </h3>
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600', width: '100px' }}>Method</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Path</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600' }}>Description</th>
                        <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e0e0e0', fontWeight: '600', width: '100px' }}>Auth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.endpoints.map((endpoint, epIdx) => (
                        <tr key={epIdx} style={{ borderBottom: '1px solid #e0e0e0' }}>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0' }}>
                            <span style={{
                              background: endpoint.method === 'GET' ? '#4caf50' : 
                                        endpoint.method === 'POST' ? '#2196f3' :
                                        endpoint.method === 'PUT' ? '#ff9800' :
                                        endpoint.method === 'DELETE' ? '#f44336' : '#9e9e9e',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              {endpoint.method}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', fontFamily: 'monospace', fontSize: '13px' }}>
                            {endpoint.path}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', color: '#666' }}>
                            {endpoint.description}
                          </td>
                          <td style={{ padding: '10px 12px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
                            {endpoint.auth ? (
                              <span style={{ color: '#f44336', fontSize: '12px' }}>🔒 Required</span>
                            ) : (
                              <span style={{ color: '#4caf50', fontSize: '12px' }}>🌐 Public</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Architecture Flow Tab */}
        {activeTab === 'flow' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🔄 System Architecture Flow
            </h2>
            <div style={{
              background: '#f9f9f9',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#2E86AB', marginBottom: '1rem' }}>Frontend Layer</h3>
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #2E86AB',
                  marginBottom: '1rem'
                }}>
                  <strong>React Application (Netlify)</strong>
                  <ul style={{ marginTop: '0.5rem', color: '#666' }}>
                    <li>User Interface Components</li>
                    <li>Chat Widget (Embedded on client websites)</li>
                    <li>Admin Dashboard</li>
                    <li>Client Portal</li>
                  </ul>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#ff9800', marginBottom: '1rem' }}>API Layer (Express.js - Heroku)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  {['Authentication', 'Chat Widget', 'WhatsApp', 'Agent Handover', 'Credentials', 'Leads', 'Admin'].map(api => (
                    <div key={api} style={{
                      background: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '2px solid #ff9800'
                    }}>
                      <strong>{api} API</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#4caf50', marginBottom: '1rem' }}>Service Layer</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {['ConversationFlowService', 'HandoverService', 'WhatsAppService', 'LLMService', 'EmailService', 'ConversationInactivityService'].map(svc => (
                    <div key={svc} style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #4caf50',
                      fontSize: '13px'
                    }}>
                      {svc}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#9c27b0', marginBottom: '1rem' }}>Database Layer (PostgreSQL - Heroku)</h3>
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '2px solid #9c27b0'
                }}>
                  <strong>Heroku PostgreSQL Database</strong>
                  <ul style={{ marginTop: '0.5rem', color: '#666' }}>
                    <li>All tables defined in Data Dictionary</li>
                    <li>AES-256 encrypted credentials storage</li>
                    <li>Session and conversation tracking</li>
                    <li>Usage and billing analytics</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 style={{ color: '#f44336', marginBottom: '1rem' }}>External Services</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {['Twilio (WhatsApp)', 'Google AI (Gemini)', 'Email Service', 'Stripe'].map(ext => (
                    <div key={ext} style={{
                      background: 'white',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid #f44336',
                      fontSize: '13px'
                    }}>
                      {ext}
                    </div>
                  ))}
                </div>
              </div>

              {/* Flow Diagram */}
              <div style={{ marginTop: '3rem', padding: '2rem', background: 'white', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Chat Widget Flow</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Visitor Opens Widget</strong>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#2E86AB', fontSize: '1.5rem' }}></i>
                  <div style={{ padding: '1rem', background: '#fff3e0', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Welcome Message</strong>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#2E86AB', fontSize: '1.5rem' }}></i>
                  <div style={{ padding: '1rem', background: '#f3e5f5', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Intro Form</strong>
                  </div>
                  <i className="fas fa-arrow-right" style={{ color: '#2E86AB', fontSize: '1.5rem' }}></i>
                  <div style={{ padding: '1rem', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center', minWidth: '150px' }}>
                    <strong>Knowledge Base</strong>
                    <br />
                    <small>↓</small>
                    <br />
                    <small>AI Response</small>
                    <br />
                    <small>↓</small>
                    <br />
                    <small>Agent Handover</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Swagger API Tester Tab */}
        {activeTab === 'swagger' && (
          <div>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>
              🧪 API Tester (Swagger UI)
            </h2>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Interactive API documentation and testing interface. Test endpoints directly from the browser.
            </p>
            <div style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              height: '800px',
              position: 'relative'
            }}>
              <iframe
                src={`${window.location.protocol === 'https:' 
                  ? 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com' 
                  : 'http://localhost:3001'}/api-docs`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Swagger API Documentation"
                allow="fullscreen"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              />
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 10
              }}>
                <a
                  href={`${window.location.protocol === 'https:' 
                    ? 'https://marketingby-wetechforu-b67c6bd0bf6b.herokuapp.com' 
                    : 'http://localhost:3001'}/api-docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    background: '#2E86AB',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-external-link-alt"></i>
                  Open in New Window
                </a>
              </div>
            </div>
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f9f9f9',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#666'
            }}>
              <strong>💡 Tips:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Click "Try it out" on any endpoint to test it</li>
                <li>Enter required parameters and click "Execute"</li>
                <li>View response body, headers, and status codes</li>
                <li>All endpoints require authentication except public ones</li>
                <li>Use the "Authorize" button (🔒) to authenticate with your session</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

