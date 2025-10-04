import { useState, useEffect } from 'react';
import { api } from '../api/http';

interface Lead {
  id: number;
  clinic_name: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  industry_category: string;
  lead_source: string;
  compliance_status: string;
  notes: string;
  contact_first_name: string;
  contact_last_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [scrapingError, setScrapingError] = useState('');
  const [scrapingSuccess, setScrapingSuccess] = useState('');
  const [showScrapingForm, setShowScrapingForm] = useState(false);
  const [scrapingForm, setScrapingForm] = useState({
    url: 'https://www.elite360health.com',
    zipCode: '75013',
    radius: 5,
    maxLeads: 10,
    usePaidAPIs: false
  });
  const [apiCredits, setApiCredits] = useState({ free: true, paid: false, credits: 0 });

  useEffect(() => {
    fetchLeads();
    checkAPICredits();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/leads');
      setLeads(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const checkAPICredits = async () => {
    try {
      const response = await api.get('/api-credits');
      setApiCredits(response.data);
    } catch (err: any) {
      console.error('Failed to check API credits:', err);
    }
  };

  const handleScrapeWebsite = async () => {
    setScrapingLoading(true);
    setScrapingError('');
    setScrapingSuccess('');

    try {
      const response = await api.post('/scrape-website-leads', {
        url: scrapingForm.url,
        maxLeads: scrapingForm.maxLeads
      });

      if (response.data.success) {
        setScrapingSuccess(response.data.message);
        await fetchLeads();
        setShowScrapingForm(false);
      }
    } catch (err: any) {
      setScrapingError(err.response?.data?.error || 'Failed to scrape website');
    } finally {
      setScrapingLoading(false);
    }
  };

  const handleScrapeZipCode = async () => {
    setScrapingLoading(true);
    setScrapingError('');
    setScrapingSuccess('');

    try {
      const response = await api.post('/scrape-zipcode-leads', {
        zipCode: scrapingForm.zipCode,
        radius: scrapingForm.radius,
        maxLeads: scrapingForm.maxLeads,
        usePaidAPIs: scrapingForm.usePaidAPIs
      });

      if (response.data.success) {
        setScrapingSuccess(response.data.message);
        await fetchLeads();
        setShowScrapingForm(false);
      }
    } catch (err: any) {
      setScrapingError(err.response?.data?.error || 'Failed to scrape by zip code');
    } finally {
      setScrapingLoading(false);
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  if (loading) return <div>Loading leads...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Leads Management</h1>
        <button
          onClick={() => setShowScrapingForm(!showScrapingForm)}
          style={{
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {showScrapingForm ? 'Hide Scraping' : 'Scrape New Leads'}
        </button>
      </div>

      {/* API Credits Status */}
      <div style={{ 
        background: apiCredits.paid ? '#e8f5e8' : '#fff3cd', 
        padding: '10px', 
        borderRadius: '4px', 
        marginBottom: '20px',
        border: `1px solid ${apiCredits.paid ? '#28a745' : '#ffc107'}`
      }}>
        <strong>API Status:</strong> {apiCredits.paid ? 'Paid APIs Available' : 'Free APIs Only'} 
        {apiCredits.credits > 0 && ` (${apiCredits.credits} credits remaining)`}
      </div>

      {/* Scraping Form */}
      {showScrapingForm && (
        <div style={{ 
          background: 'white', 
          border: '1px solid #ddd', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h3>Scrape New Leads</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <h4>Website Scraping</h4>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Website URL:</label>
                <input
                  type="url"
                  value={scrapingForm.url}
                  onChange={(e) => setScrapingForm({...scrapingForm, url: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Max Leads:</label>
                <input
                  type="number"
                  value={scrapingForm.maxLeads}
                  onChange={(e) => setScrapingForm({...scrapingForm, maxLeads: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <button
                onClick={handleScrapeWebsite}
                disabled={scrapingLoading}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {scrapingLoading ? 'Scraping...' : 'Scrape Website'}
              </button>
            </div>

            <div>
              <h4>Zip Code Scraping</h4>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Zip Code:</label>
                <input
                  type="text"
                  value={scrapingForm.zipCode}
                  onChange={(e) => setScrapingForm({...scrapingForm, zipCode: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Radius (miles):</label>
                <input
                  type="number"
                  value={scrapingForm.radius}
                  onChange={(e) => setScrapingForm({...scrapingForm, radius: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Max Leads:</label>
                <input
                  type="number"
                  value={scrapingForm.maxLeads}
                  onChange={(e) => setScrapingForm({...scrapingForm, maxLeads: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={scrapingForm.usePaidAPIs}
                    onChange={(e) => setScrapingForm({...scrapingForm, usePaidAPIs: e.target.checked})}
                    style={{ marginRight: '8px' }}
                  />
                  Use Paid APIs (Google Places, Yelp)
                </label>
              </div>
              <button
                onClick={handleScrapeZipCode}
                disabled={scrapingLoading}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                {scrapingLoading ? 'Scraping...' : 'Scrape by Zip Code'}
              </button>
            </div>
          </div>

          {scrapingError && (
            <div style={{ 
              background: '#f8d7da', 
              color: '#721c24', 
              padding: '10px', 
              borderRadius: '4px', 
              marginBottom: '10px' 
            }}>
              ⚠️ {scrapingError}
            </div>
          )}

          {scrapingSuccess && (
            <div style={{ 
              background: '#d4edda', 
              color: '#155724', 
              padding: '10px', 
              borderRadius: '4px', 
              marginBottom: '10px' 
            }}>
              ✅ {scrapingSuccess}
            </div>
          )}
        </div>
      )}

      {/* Leads List */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {leads.map((lead) => (
          <div 
            key={lead.id} 
            onClick={() => handleLeadClick(lead)}
            style={{ 
              border: '1px solid #ddd', 
              padding: '16px', 
              borderRadius: '8px',
              background: selectedLead?.id === lead.id ? '#f8f9fa' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary)' }}>
              {lead.clinic_name}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
              <div>
                <strong>Contact:</strong> {lead.contact_first_name} {lead.contact_last_name}
              </div>
              <div>
                <strong>Email:</strong> {lead.contact_email}
              </div>
              <div>
                <strong>Phone:</strong> {lead.contact_phone}
              </div>
              <div>
                <strong>Website:</strong> {lead.website_url}
              </div>
              <div>
                <strong>Industry:</strong> {lead.industry_category}
              </div>
              <div>
                <strong>Source:</strong> {lead.lead_source}
              </div>
              <div>
                <strong>Status:</strong> {lead.compliance_status}
              </div>
              <div>
                <strong>Created:</strong> {new Date(lead.created_at).toLocaleDateString()}
              </div>
            </div>
            {lead.address && (
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <strong>Address:</strong> {lead.address}, {lead.city}, {lead.state} {lead.zip_code}
              </div>
            )}
            {lead.notes && (
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                <strong>Notes:</strong> {lead.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {leads.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px'
        }}>
          <h3>No leads found</h3>
          <p>Use the "Scrape New Leads" button above to find new healthcare leads.</p>
        </div>
      )}
    </div>
  );
}