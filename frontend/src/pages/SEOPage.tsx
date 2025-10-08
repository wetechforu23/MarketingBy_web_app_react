import { useState } from 'react'
import { api } from '../api/http'

interface SEOAnalysis {
  url: string
  title: string
  description: string
  score: number
  recommendations: string[]
  performance: {
    loadTime: number
    pageSize: number
  }
  technical: {
    hasSitemap: boolean
    hasRobots: boolean
    hasCanonical: boolean
    hasOpenGraph: boolean
    hasTwitterCards: boolean
  }
}

interface ComplianceCheck {
  hipaa: boolean
  texasState: boolean
  healthcareMarketing: boolean
  dataPrivacy: boolean
  accessibility: boolean
  score: number
  issues: string[]
  recommendations: string[]
}

interface LeadData {
  name: string
  email: string
  phone: string
  company: string
  website: string
  industry: string
  source: string
  notes: string
}

export default function SEOPage() {
  const [url, setUrl] = useState('https://www.promedhca.com')
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scrapingData, setScrapingData] = useState<any>(null)
  const [scrapingLoading, setScrapingLoading] = useState(false)
  const [complianceCheck, setComplianceCheck] = useState<ComplianceCheck | null>(null)
  const [complianceLoading, setComplianceLoading] = useState(false)
  const [leadData, setLeadData] = useState<LeadData>({
    name: '',
    email: 'viral.tarpara@hotmail.com',
    phone: '',
    company: '',
    website: '',
    industry: '',
    source: 'Website Analysis',
    notes: ''
  })
  const [leadLoading, setLeadLoading] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [seoReport, setSeoReport] = useState<any>(null)

  const handleBasicAnalysis = async () => {
    if (!url) {
      setError('Please enter a URL')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.post('/seo/analyze', { url })
      setAnalysis(response.data.analysis)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to analyze website')
    } finally {
      setLoading(false)
    }
  }

  const handleComprehensiveScraping = async () => {
    if (!url) {
      setError('Please enter a URL')
      return
    }

    setScrapingLoading(true)
    setError('')

    try {
      const response = await api.post('/seo/scrape', { url })
      setScrapingData(response.data.data)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to scrape website')
    } finally {
      setScrapingLoading(false)
    }
  }

  const handleComplianceCheck = async () => {
    if (!scrapingData) {
      setError('Please scrape the website first to perform compliance check')
      return
    }

    setComplianceLoading(true)
    setError('')

    try {
      const response = await api.post('/compliance/check', { 
        url, 
        websiteData: scrapingData 
      })
      setComplianceCheck(response.data.compliance)
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to perform compliance check')
    } finally {
      setComplianceLoading(false)
    }
  }

  const handleCaptureLead = async () => {
    if (!leadData.name || !leadData.email) {
      setError('Name and email are required')
      return
    }

    setLeadLoading(true)
    setError('')

    try {
      const response = await api.post('/compliance/capture-lead', leadData)
      if (response.data.success) {
        setError('')
        alert('Lead captured successfully!')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to capture lead')
    } finally {
      setLeadLoading(false)
    }
  }

  const handleScheduleConsultation = async () => {
    if (!leadData.email || !leadData.name) {
      setError('Name and email are required to schedule consultation')
      return
    }

    setCalendarLoading(true)
    setError('')

    try {
      const response = await api.post('/compliance/schedule-consultation', {
        clientEmail: leadData.email,
        clientName: leadData.name,
        websiteUrl: url,
        complianceScore: complianceCheck?.score || 0
      })
      
      if (response.data.success) {
        setError('')
        alert('Consultation scheduled successfully! Calendar invite sent to your email.')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to schedule consultation')
    } finally {
      setCalendarLoading(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!url) {
      setError('Please enter a URL')
      return
    }

    setReportLoading(true)
    setError('')

    try {
      const response = await api.post('/seo/generate-report', {
        url,
        clientName: leadData.name || 'Dr. Sarah Johnson',
        clientEmail: leadData.email
      })
      
      if (response.data.success) {
        setSeoReport(response.data.report)
        setError('')
        alert('SEO report generated and sent to your email!')
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to generate SEO report')
    } finally {
      setReportLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--success)'
    if (score >= 60) return 'var(--warning)'
    return 'var(--danger)'
  }

  return (
    <div>
      <div className="card-header">
        <div>
          <h1 className="card-title">SEO Analysis & Texas Compliance Check</h1>
          <p className="card-subtitle">Analyze websites for SEO performance and Texas healthcare compliance</p>
        </div>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Website URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="form-control"
            placeholder="https://example.com"
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={handleBasicAnalysis}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Analyzing...
              </>
            ) : (
              'Basic SEO Analysis'
            )}
          </button>

          <button
            onClick={handleComprehensiveScraping}
            disabled={scrapingLoading}
            className="btn btn-secondary"
          >
            {scrapingLoading ? (
              <>
                <div className="spinner"></div>
                Scraping...
              </>
            ) : (
              'Comprehensive Scraping'
            )}
          </button>

          <button
            onClick={handleComplianceCheck}
            disabled={complianceLoading || !scrapingData}
            className="btn btn-success"
          >
            {complianceLoading ? (
              <>
                <div className="spinner"></div>
                Checking...
              </>
            ) : (
              'Texas Compliance Check'
            )}
          </button>

          <button
            onClick={handleGenerateReport}
            disabled={reportLoading}
            className="btn btn-primary"
            style={{ background: 'var(--secondary)' }}
          >
            {reportLoading ? (
              <>
                <div className="spinner"></div>
                Generating...
              </>
            ) : (
              '📧 Generate & Send SEO Report'
            )}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <span style={{ marginLeft: '8px' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Lead Capture Form */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Lead Capture Form</h3>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              value={leadData.name}
              onChange={(e) => setLeadData({...leadData, name: e.target.value})}
              className="form-control"
              placeholder="Enter your full name"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              value={leadData.email}
              onChange={(e) => setLeadData({...leadData, email: e.target.value})}
              className="form-control"
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              value={leadData.phone}
              onChange={(e) => setLeadData({...leadData, phone: e.target.value})}
              className="form-control"
              placeholder="Enter your phone number"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Company</label>
            <input
              type="text"
              value={leadData.company}
              onChange={(e) => setLeadData({...leadData, company: e.target.value})}
              className="form-control"
              placeholder="Enter your company name"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Website</label>
            <input
              type="url"
              value={leadData.website}
              onChange={(e) => setLeadData({...leadData, website: e.target.value})}
              className="form-control"
              placeholder="Enter your website URL"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Industry</label>
            <select
              value={leadData.industry}
              onChange={(e) => setLeadData({...leadData, industry: e.target.value})}
              className="form-control"
            >
              <option value="">Select Industry</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Dental">Dental</option>
              <option value="Medical">Medical</option>
              <option value="Mental Health">Mental Health</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            value={leadData.notes}
            onChange={(e) => setLeadData({...leadData, notes: e.target.value})}
            className="form-control"
            rows={3}
            placeholder="Additional notes or requirements"
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCaptureLead}
            disabled={leadLoading}
            className="btn btn-primary"
          >
            {leadLoading ? (
              <>
                <div className="spinner"></div>
                Capturing...
              </>
            ) : (
              'Capture Lead'
            )}
          </button>
          
          <button
            onClick={handleScheduleConsultation}
            disabled={calendarLoading}
            className="btn btn-success"
          >
            {calendarLoading ? (
              <>
                <div className="spinner"></div>
                Scheduling...
              </>
            ) : (
              'Schedule Consultation'
            )}
          </button>
        </div>
      </div>

      {/* SEO Analysis Results */}
      {analysis && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">SEO Analysis Results</h3>
            <div style={{ 
              fontSize: '2em', 
              fontWeight: 'bold', 
              color: getScoreColor(analysis.score) 
            }}>
              {analysis.score}/100
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h4>Basic Information</h4>
              <p><strong>Title:</strong> {analysis.title}</p>
              <p><strong>Description:</strong> {analysis.description}</p>
              <p><strong>Load Time:</strong> {analysis.performance.loadTime}ms</p>
              <p><strong>Page Size:</strong> {(analysis.performance.pageSize / 1024).toFixed(2)} KB</p>
            </div>

            <div>
              <h4>Technical SEO</h4>
              <p><strong>Sitemap:</strong> {analysis.technical.hasSitemap ? '✅' : '❌'}</p>
              <p><strong>Robots.txt:</strong> {analysis.technical.hasRobots ? '✅' : '❌'}</p>
              <p><strong>Canonical URL:</strong> {analysis.technical.hasCanonical ? '✅' : '❌'}</p>
              <p><strong>Open Graph:</strong> {analysis.technical.hasOpenGraph ? '✅' : '❌'}</p>
              <p><strong>Twitter Cards:</strong> {analysis.technical.hasTwitterCards ? '✅' : '❌'}</p>
            </div>
          </div>

          <div>
            <h4>Recommendations</h4>
            {analysis.recommendations.length > 0 ? (
              <ul>
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{rec}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No recommendations available</p>
            )}
          </div>
        </div>
      )}

      {/* Compliance Check Results */}
      {complianceCheck && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Texas Compliance Check Results</h3>
            <div style={{ 
              fontSize: '2em', 
              fontWeight: 'bold', 
              color: getScoreColor(complianceCheck.score) 
            }}>
              {complianceCheck.score}/100
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h4>Compliance Status</h4>
              <p><strong>HIPAA:</strong> {complianceCheck.hipaa ? '✅ Compliant' : '❌ Non-Compliant'}</p>
              <p><strong>Texas State:</strong> {complianceCheck.texasState ? '✅ Compliant' : '❌ Non-Compliant'}</p>
              <p><strong>Healthcare Marketing:</strong> {complianceCheck.healthcareMarketing ? '✅ Compliant' : '❌ Non-Compliant'}</p>
              <p><strong>Data Privacy:</strong> {complianceCheck.dataPrivacy ? '✅ Compliant' : '❌ Non-Compliant'}</p>
              <p><strong>Accessibility:</strong> {complianceCheck.accessibility ? '✅ Compliant' : '❌ Non-Compliant'}</p>
            </div>

            <div>
              <h4>Issues Found</h4>
              {complianceCheck.issues.length > 0 ? (
                <ul>
                  {complianceCheck.issues.map((issue, index) => (
                    <li key={index} style={{ marginBottom: '8px', color: 'var(--danger)' }}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No issues found</p>
              )}
            </div>
          </div>

          <div>
            <h4>Recommendations</h4>
            {complianceCheck.recommendations.length > 0 ? (
              <ul>
                {complianceCheck.recommendations.map((rec, index) => (
                  <li key={index} style={{ marginBottom: '8px' }}>{rec}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No recommendations available</p>
            )}
          </div>
        </div>
      )}

      {/* Comprehensive Website Data */}
      {scrapingData && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Comprehensive Website Data</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <h4>Basic Info</h4>
              <p><strong>Title:</strong> {scrapingData.title}</p>
              <p><strong>Description:</strong> {scrapingData.description}</p>
              <p><strong>Language:</strong> {scrapingData.language}</p>
              <p><strong>Author:</strong> {scrapingData.author}</p>
            </div>

            <div>
              <h4>Content Statistics</h4>
              <p><strong>Word Count:</strong> {scrapingData.content.wordCount}</p>
              <p><strong>Paragraphs:</strong> {scrapingData.content.paragraphCount}</p>
              <p><strong>Images:</strong> {scrapingData.performance.totalImages}</p>
              <p><strong>Links:</strong> {scrapingData.performance.totalLinks}</p>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4>Navigation Structure</h4>
            {scrapingData.navigation.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {scrapingData.navigation.slice(0, 10).map((nav: any, index: number) => (
                  <div key={index} style={{ 
                    padding: '12px', 
                    background: 'var(--bg-dark)', 
                    borderRadius: '8px' 
                  }}>
                    <strong>{nav.text}</strong>
                    <br />
                    <small className="text-muted">{nav.href}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No navigation found</p>
            )}
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4>Headings Structure</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <h5>H1 Tags ({scrapingData.headings.h1.length})</h5>
                {scrapingData.headings.h1.map((h1: string, index: number) => (
                  <p key={index} style={{ fontSize: '0.9em', margin: '4px 0' }}>{h1}</p>
                ))}
              </div>
              <div>
                <h5>H2 Tags ({scrapingData.headings.h2.length})</h5>
                {scrapingData.headings.h2.slice(0, 5).map((h2: string, index: number) => (
                  <p key={index} style={{ fontSize: '0.9em', margin: '4px 0' }}>{h2}</p>
                ))}
              </div>
              <div>
                <h5>H3 Tags ({scrapingData.headings.h3.length})</h5>
                {scrapingData.headings.h3.slice(0, 5).map((h3: string, index: number) => (
                  <p key={index} style={{ fontSize: '0.9em', margin: '4px 0' }}>{h3}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO Report Results */}
      {seoReport && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📧 SEO Report Generated & Sent</h3>
            <div style={{ 
              fontSize: '2em', 
              fontWeight: 'bold', 
              color: getScoreColor(seoReport.overallScore) 
            }}>
              {seoReport.overallScore}/100
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <h4>📊 SEO Metrics</h4>
              <p><strong>Overall Score:</strong> {seoReport.overallScore}/100</p>
              <p><strong>Page Speed:</strong> {seoReport.pageSpeed}/100</p>
              <p><strong>Mobile Score:</strong> {seoReport.mobileScore}/100</p>
              <p><strong>Accessibility:</strong> {seoReport.accessibilityScore}/100</p>
            </div>

            <div>
              <h4>📅 Report Details</h4>
              <p><strong>Industry:</strong> {seoReport.industry}</p>
              <p><strong>Analysis Date:</strong> {seoReport.analysisDate}</p>
              <p><strong>URL:</strong> {seoReport.url}</p>
              <p><strong>Email Sent:</strong> ✅ {leadData.email}</p>
            </div>
          </div>

          <div>
            <h4>🎯 Key Recommendations</h4>
            <ul>
              {seoReport.recommendations.map((rec: string, index: number) => (
                <li key={index} style={{ marginBottom: '8px' }}>{rec}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h4>🔑 Keyword Opportunities</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h5>Primary Keywords</h5>
                {seoReport.keywords.filter((k: any) => k.category === 'primary').map((keyword: any, index: number) => (
                  <div key={index} style={{ 
                    background: 'var(--bg-dark)', 
                    padding: '8px', 
                    margin: '4px 0', 
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}>
                    {keyword.keyword} (Vol: {keyword.volume}, Diff: {keyword.difficulty})
                  </div>
                ))}
              </div>
              <div>
                <h5>Local Keywords</h5>
                {seoReport.keywords.filter((k: any) => k.category === 'local').map((keyword: any, index: number) => (
                  <div key={index} style={{ 
                    background: 'var(--bg-dark)', 
                    padding: '8px', 
                    margin: '4px 0', 
                    borderRadius: '4px',
                    fontSize: '0.9em'
                  }}>
                    {keyword.keyword} (Vol: {keyword.volume}, Diff: {keyword.difficulty})
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(46, 134, 171, 0.1)', 
            padding: '20px', 
            borderRadius: '8px', 
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <h4>📧 Email Report Sent Successfully!</h4>
            <p>The comprehensive SEO report has been sent to <strong>{leadData.email}</strong></p>
            <p>Check your email for the detailed analysis with actionable recommendations.</p>
          </div>
        </div>
      )}
    </div>
  )
}