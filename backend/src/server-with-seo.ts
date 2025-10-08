import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { SEOAnalysisService } from './services/seoAnalysisService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory data store to simulate DB while running this simplified server
type LeadRecord = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  industry_category?: string;
  source?: string;
  status?: string | null;
  notes?: string;
  created_at: string;
  // Extended fields
  clinic_name?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  lead_source?: string;
  compliance_status?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  seo_analysis?: any;
  seo_report?: string;
};

const leadsStore: LeadRecord[] = [
  {
    id: 1,
    name: 'Elite 360 Health',
    email: 'info@elite360health.com',
    phone: '(972) 230-5601',
    company: 'Elite 360 Health',
    industry_category: 'Healthcare',
    source: 'Website Scraping',
    status: 'new',
    notes: 'Primary care and wellness services',
    created_at: new Date().toISOString()
  }
];

// Simple in-memory settings store
let platformSettings: any = {
  flags: {
    enableComplianceChecks: true,
    enableFreeSEOAnalysis: true,
    enableEmailSender: false
  },
  userAccess: {
    admins: ['admin@healthcaremarketing.com'],
    roles: {
      admin: ['all'],
      analyst: ['analytics', 'seo', 'leads'],
      sales: ['leads', 'clients']
    }
  },
  compliance: {
    defaultState: 'TX',
    restrictedActions: []
  }
};

// Basic compliance heuristic used by both the endpoint and scraping guard
function evaluateCompliance(url?: string, state: string = 'TX', action: string = 'scrape_website') {
  const blockedHosts = ['facebook.com', 'linkedin.com', 'twitter.com'];
  let isCompliant = true;
  let warnings: string[] = [];

  try {
    if (!url) {
      isCompliant = false;
      warnings.push('Missing URL');
    } else {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        warnings.push('Website is not using HTTPS');
        isCompliant = false;
      }
      if (blockedHosts.some(h => parsed.hostname.includes(h))) {
        isCompliant = false;
        warnings.push('Blocked host for scraping');
      }
      if (parsed.hostname.endsWith('example.com')) {
        isCompliant = false;
        warnings.push('Example domains are not allowed');
      }
    }
  } catch {
    isCompliant = false;
    warnings.push('Invalid URL');
  }

  return { isCompliant, warnings, state, action, url };
}

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend server with SEO is running' });
});

// Basic auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple demo login
  if (email === 'admin@healthcaremarketing.com' && password === 'admin123') {
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: {
        id: 1,
        email: email,
        role: 'admin',
        permissions: {
          pages: ['admin', 'leads', 'seo', 'campaigns', 'calendar', 'clients', 'analytics', 'content', 'communications', 'performance', 'system'],
          apis: ['all'],
          actions: ['create', 'read', 'update', 'delete']
        }
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  res.json({
    id: 1,
    email: 'admin@healthcaremarketing.com',
    role: 'admin',
    permissions: {
      pages: ['admin', 'leads', 'seo', 'campaigns', 'calendar', 'clients', 'analytics', 'content', 'communications', 'performance', 'system'],
      apis: ['all'],
      actions: ['create', 'read', 'update', 'delete']
    }
  });
});

// Leads endpoints (using in-memory store)
app.get('/api/leads', (req, res) => {
  res.json(leadsStore);
});

app.delete('/api/leads', (req, res) => {
  leadsStore.length = 0;
  res.json({ success: true, message: 'All leads deleted' });
});

app.put('/api/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = leadsStore.findIndex(l => l.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Lead not found' });
  // Merge allowed fields
  const updated: LeadRecord = { ...leadsStore[idx], ...req.body, id: leadsStore[idx].id };
  leadsStore[idx] = updated;
  res.json({ success: true, lead: updated });
});

app.delete('/api/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = leadsStore.findIndex(l => l.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Lead not found' });
  
  const deletedLead = leadsStore.splice(idx, 1)[0];
  res.json({ success: true, message: 'Lead deleted successfully', lead: deletedLead });
});

app.get('/api/leads/:id/seo-analysis', (req, res) => {
  const id = Number(req.params.id);
  const lead = leadsStore.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  if (!lead.seo_analysis) return res.status(404).json({ error: 'No SEO analysis for this lead' });
  res.json({ success: true, seoAnalysis: lead.seo_analysis, seoReport: lead.seo_report || null });
});

// Mock clients endpoint
app.get('/api/clients', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Elite 360 Health',
      email: 'info@elite360health.com',
      phone: '(972) 230-5601',
      company: 'Elite 360 Health',
      industry: 'Healthcare',
      status: 'active',
      created_at: new Date().toISOString()
    }
  ]);
});

// Mock campaigns endpoint
app.get('/api/campaigns', (req, res) => {
  res.json([]);
});

// API credits endpoint
app.get('/api/api-credits', (req, res) => {
  res.json({
    free: true,
    paid: false,
    credits: 0
  });
});

// SEO Analysis endpoint
app.post('/api/analyze-seo', async (req, res) => {
  try {
    const { url, keywords = [] } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const seoService = SEOAnalysisService.getInstance();
    const analysis = await seoService.analyzeWebsite(url, keywords);
    
    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('SEO analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze website',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Website scraping with SEO endpoint
app.post('/api/scrape-website-leads', async (req, res) => {
  try {
    const { url, maxLeads = 10, includeSEO = true, keywords = [], seoMode = 'comprehensive', state = 'TX' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Enforce compliance if enabled in settings
    if (platformSettings.flags.enableComplianceChecks) {
      const compliance = evaluateCompliance(url, state, 'scrape_website');
      if (!compliance.isCompliant) {
        return res.status(400).json({ error: 'Compliance check failed', compliance });
      }
    }

    // Mock lead data (persisting in memory)
    const mockLead: LeadRecord = {
      id: Date.now(),
      clinic_name: 'Sample Healthcare Clinic',
      contact_email: 'info@sampleclinic.com',
      contact_phone: '(555) 123-4567',
      website_url: url,
      industry_category: 'Healthcare',
      lead_source: 'Website Scraping',
      compliance_status: 'pending',
      notes: 'Scraped from website',
      contact_first_name: 'Contact',
      contact_last_name: 'Person',
      address: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zip_code: '75013',
      created_at: new Date().toISOString()
    };

    let seoAnalysis: any = null;
    let seoReport: any = null;
    let seoBasic: any = null;

    // Perform SEO analysis if requested
    if (includeSEO) {
      try {
        console.log(`Performing SEO analysis for: ${url}`);
        const seoService = SEOAnalysisService.getInstance();
        const full = await seoService.analyzeWebsite(url, keywords);
        if (seoMode === 'basic') {
          // Provide a minimal public summary
          seoBasic = {
            url: full.url,
            title: full.title,
            metaDescription: full.metaDescription,
            score: full.score,
            performance: full.performance
          };
        } else if (seoMode === 'both') {
          seoBasic = {
            url: full.url,
            title: full.title,
            metaDescription: full.metaDescription,
            score: full.score,
            performance: full.performance
          };
          seoAnalysis = full;
          seoReport = await seoService.generateSEOReport(full, mockLead);
        } else {
          seoAnalysis = full;
          seoReport = await seoService.generateSEOReport(full, mockLead);
        }
        
        console.log(`SEO analysis completed for ${url} - Score: ${seoAnalysis.score}/100`);
      } catch (seoError) {
        console.error(`SEO analysis failed for ${url}:`, seoError);
        // Continue without SEO data if analysis fails
      }
    }

    const scrapedLead: LeadRecord = {
      ...mockLead,
      name: mockLead.clinic_name,
      email: mockLead.contact_email,
      phone: mockLead.contact_phone,
      company: mockLead.clinic_name,
      source: mockLead.lead_source,
      status: mockLead.compliance_status,
      seo_analysis: seoAnalysis || seoBasic || undefined,
      seo_report: seoReport || undefined
    };

    // Persist to in-memory store
    leadsStore.push(scrapedLead);

    const leads = [scrapedLead];

    res.json({ 
      success: true, 
      message: `Successfully scraped ${leads.length} leads from ${url}`,
      leads: leads,
      seoIncluded: includeSEO,
      seoMode
    });
  } catch (error) {
    console.error('Website scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape leads from website' });
  }
});

// Zip code scraping endpoint
app.post('/api/scrape-zipcode-leads', async (req, res) => {
  try {
    const { zipCode, radius = 5, maxLeads = 10, usePaidAPIs = false } = req.body;
    
    if (!zipCode) {
      return res.status(400).json({ error: 'Zip code is required' });
    }

    // Mock leads for zip code
    const mockLeads = [
      {
        id: Date.now(),
        clinic_name: 'Dallas Wellness Center',
        contact_email: 'contact@dallaswellness.com',
        contact_phone: '(972) 555-0101',
        website_url: 'https://www.dallaswellness.com',
        industry_category: 'Healthcare',
        lead_source: 'Zip Code Search',
        compliance_status: 'pending',
        notes: 'Found in zip code search',
        contact_first_name: 'Dr. Michael',
        contact_last_name: 'Smith',
        address: '123 Main Street',
        city: 'Dallas',
        state: 'TX',
        zip_code: zipCode,
        created_at: new Date().toISOString()
      }
    ];

    // Persist to in-memory store
    mockLeads.forEach(ml => {
      leadsStore.push({
        ...ml,
        name: ml.clinic_name,
        email: ml.contact_email,
        phone: ml.contact_phone,
        company: ml.clinic_name,
        source: ml.lead_source,
        status: ml.compliance_status
      });
    });

    res.json({
      success: true,
      message: `Successfully scraped ${mockLeads.length} leads for zip code ${zipCode}`,
      leads: mockLeads
    });
  } catch (error) {
    console.error('Zip code scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape leads for zip code' });
  }
});

// Compliance check endpoint
app.post('/api/compliance-check', async (req, res) => {
  try {
    const { action = 'scrape_website', state = 'TX', url } = req.body;
    const result = evaluateCompliance(url, state, action);
    res.json(result);
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

// Minimal clients create endpoint (used by Convert to Client in UI)
app.post('/api/clients', (req, res) => {
  const { client_name, email, phone, website, specialties, is_active } = req.body || {};
  const client = {
    id: Date.now(),
    name: client_name,
    email,
    phone,
    company: client_name,
    industry: specialties || 'Healthcare',
    status: is_active ? 'active' : 'inactive',
    created_at: new Date().toISOString()
  };
  res.json(client);
});

// Platform settings endpoints
app.get('/api/settings', (req, res) => {
  res.json(platformSettings);
});

app.put('/api/settings', (req, res) => {
  platformSettings = { ...platformSettings, ...req.body };
  res.json({ success: true, settings: platformSettings });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server with SEO running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 SEO Analysis: http://localhost:${PORT}/api/analyze-seo`);
});
