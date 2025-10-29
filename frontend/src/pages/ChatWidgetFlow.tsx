import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api/http';
import ConversationFlowEditor from '../components/ConversationFlowEditor';

export default function ChatWidgetFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [widget, setWidget] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWidget();
  }, [id]);

  const fetchWidget = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/chat-widget/widgets/${id}`);
      setWidget(response.data);
    } catch (error) {
      console.error('Error fetching widget:', error);
    } finally {
      setLoading(false);
    }
  };

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
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={() => navigate('/app/chat-widgets')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-arrow-left"></i> Back to Widgets
        </button>

        <h1 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
          Conversation Flow Configuration
        </h1>
        <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>
          <i className="fas fa-robot" style={{ marginRight: '8px', color: '#2E86AB' }}></i>
          <strong>{widget.bot_name}</strong> - {widget.widget_name}
        </p>
      </div>

      {/* Flow Editor Component */}
      <ConversationFlowEditor 
        widgetId={parseInt(id || '0')}
        onSave={() => {
          // Optional: show success message or refresh
          console.log('Flow saved successfully');
        }}
      />
    </div>
  );
}

