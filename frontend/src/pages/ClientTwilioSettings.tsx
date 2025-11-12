import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/http';

export default function ClientTwilioSettings() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(clientId ? parseInt(clientId) : null);
  const [settings, setSettings] = useState<any>(null);
  const [credentials, setCredentials] = useState({
    account_sid: '',
    auth_token: '',
    phone_number: ''
  });
  const [callSettings, setCallSettings] = useState({
    enable_voice_calling: false,
    default_agent_phone: '',
    twilio_phone_number: '',
    enable_call_recording: false,
    enable_call_transcription: false,
    enable_call_queuing: false,
    business_hours: {
      monday: { enabled: true, start: '09:00', end: '17:00' },
      tuesday: { enabled: true, start: '09:00', end: '17:00' },
      wednesday: { enabled: true, start: '09:00', end: '17:00' },
      thursday: { enabled: true, start: '09:00', end: '17:00' },
      friday: { enabled: true, start: '09:00', end: '17:00' },
      saturday: { enabled: false, start: '09:00', end: '17:00' },
      sunday: { enabled: false, start: '09:00', end: '17:00' }
    },
    timezone: 'America/New_York',
    max_calls_per_day: 100,
    max_call_duration_minutes: 60
  });

  useEffect(() => {
    fetchClients();
    if (selectedClientId) {
      fetchSettings();
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/admin/clients');
      setClients(response.data.clients || []);
    } catch (error: any) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchSettings = async () => {
    if (!selectedClientId) return;
    
    try {
      setLoading(true);
      
      // Fetch Twilio credentials
      try {
        const credsResponse = await api.get(`/credentials?client_id=${selectedClientId}&service_name=twilio_voice`);
        const creds = credsResponse.data.credentials || [];
        const credsMap: any = {};
        creds.forEach((c: any) => {
          credsMap[c.credential_key] = c.credential_value;
        });
        setCredentials({
          account_sid: credsMap.account_sid || '',
          auth_token: credsMap.auth_token || '',
          phone_number: credsMap.phone_number || ''
        });
      } catch (error) {
        console.log('No credentials found, will create new');
      }
      
      // Fetch call settings
      try {
        const settingsResponse = await api.get(`/twilio/voice/widgets/${selectedClientId}/settings`);
        setCallSettings(settingsResponse.data);
      } catch (error) {
        console.log('No call settings found, will create new');
      }
    } catch (error: any) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClientId) {
      alert('Please select a client first');
      return;
    }

    try {
      setSaving(true);

      // Save credentials
      if (credentials.account_sid && credentials.auth_token) {
        await api.post('/credentials', {
          client_id: selectedClientId,
          service_name: 'twilio_voice',
          credentials: [
            { key: 'account_sid', value: credentials.account_sid },
            { key: 'auth_token', value: credentials.auth_token },
            { key: 'phone_number', value: credentials.phone_number }
          ]
        });
      }

      // Save call settings
      await api.put(`/twilio/voice/widgets/${selectedClientId}/settings`, callSettings);

      alert('✅ Settings saved successfully!');
      fetchSettings();
    } catch (error: any) {
      console.error('Failed to save:', error);
      alert(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>📞 Client Twilio Settings</h1>
        <p style={{ color: '#666', margin: 0 }}>Configure Twilio voice calling for each client</p>
      </div>

      {/* Client Selector */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
          Select Client:
        </label>
        <select
          value={selectedClientId || ''}
          onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
          style={{
            width: '100%',
            padding: '12px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        >
          <option value="">-- Select Client --</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name || client.client_name}
            </option>
          ))}
        </select>
      </div>

      {selectedClientId && (
        <>
          {/* Twilio Credentials */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>🔑 Twilio Credentials</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '1rem' }}>
              Enter Twilio Account SID, Auth Token, and Phone Number for this client
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Account SID *
              </label>
              <input
                type="text"
                value={credentials.account_sid}
                onChange={(e) => setCredentials({ ...credentials, account_sid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Auth Token *
              </label>
              <input
                type="password"
                value={credentials.auth_token}
                onChange={(e) => setCredentials({ ...credentials, auth_token: e.target.value })}
                placeholder="Your Twilio Auth Token"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Twilio Phone Number *
              </label>
              <input
                type="text"
                value={credentials.phone_number}
                onChange={(e) => setCredentials({ ...credentials, phone_number: e.target.value })}
                placeholder="+15558986359"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Format: +1234567890 (E.164 format)
              </small>
            </div>
          </div>

          {/* Call Settings */}
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>⚙️ Call Settings</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={callSettings.enable_voice_calling}
                  onChange={(e) => setCallSettings({ ...callSettings, enable_voice_calling: e.target.checked })}
                />
                <span style={{ fontWeight: '600' }}>Enable Voice Calling</span>
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Default Agent Phone
              </label>
              <input
                type="text"
                value={callSettings.default_agent_phone}
                onChange={(e) => setCallSettings({ ...callSettings, default_agent_phone: e.target.value })}
                placeholder="+1234567890"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Phone number to route calls to (agent's phone)
              </small>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={callSettings.enable_call_recording}
                  onChange={(e) => setCallSettings({ ...callSettings, enable_call_recording: e.target.checked })}
                />
                <span style={{ fontWeight: '600' }}>Enable Call Recording</span>
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={callSettings.enable_call_transcription}
                  onChange={(e) => setCallSettings({ ...callSettings, enable_call_transcription: e.target.checked })}
                />
                <span style={{ fontWeight: '600' }}>Enable Call Transcription</span>
              </label>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Max Calls Per Day
              </label>
              <input
                type="number"
                value={callSettings.max_calls_per_day}
                onChange={(e) => setCallSettings({ ...callSettings, max_calls_per_day: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => navigate('/app/admin')}
              style={{
                padding: '12px 24px',
                background: '#e0e0e0',
                color: '#333',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #4682B4, #2E86AB)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

