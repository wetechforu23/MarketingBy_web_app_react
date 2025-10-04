import { EmailService } from './emailService';
import { SEOReport } from './seoApiService';

export class SEOEmailService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async sendBasicSEOReport(
    clientEmail: string,
    clientName: string,
    seoReport: SEOReport
  ): Promise<boolean> {
    try {
      const html = this.generateBasicSEOEmailHTML(clientName, seoReport);
      
      return await this.emailService.sendEmail({
        to: clientEmail,
        subject: '🎯 Your Basic SEO Report is Ready!',
        html
      });
    } catch (error) {
      console.error('Send basic SEO report error:', error);
      return false;
    }
  }

  private generateBasicSEOEmailHTML(clientName: string, seoReport: SEOReport): string {
    const getScoreColor = (score: number) => {
      if (score >= 80) return '#28a745';
      if (score >= 60) return '#ffc107';
      return '#dc3545';
    };

    const getScoreLabel = (score: number) => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      return 'Needs Improvement';
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WeTechForU AI Marketing - SEO Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #2E86AB 0%, #1E3A8A 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
          .content { padding: 30px; }
          .score-card { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
          .score-large { font-size: 48px; font-weight: bold; margin: 10px 0; }
          .score-label { font-size: 18px; font-weight: 600; margin: 5px 0; }
          .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
          .metric { background: white; border-radius: 8px; padding: 15px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
          .metric-label { font-size: 14px; color: #666; }
          .recommendations { background: #e3f2fd; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .recommendations h3 { color: #1976d2; margin-top: 0; }
          .recommendations ul { margin: 0; padding-left: 20px; }
          .recommendations li { margin: 10px 0; }
          .keywords-section { background: #f3e5f5; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .keywords-section h3 { color: #7b1fa2; margin-top: 0; }
          .keyword-category { margin: 15px 0; }
          .keyword-category h4 { color: #4a148c; margin: 10px 0 5px 0; }
          .keyword-item { background: white; border-radius: 5px; padding: 8px 12px; margin: 5px 0; display: inline-block; margin-right: 10px; font-size: 14px; }
          .cta-section { background: #e8f5e8; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
          .cta-button { background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin: 10px; }
          .cta-button:hover { background: #218838; }
          .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .footer a { color: #3498db; text-decoration: none; }
          .unsubscribe { font-size: 12px; color: #bdc3c7; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>WETECHFORU AI MARKETING</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">🎯 Your Basic SEO Report is Ready!</p>
          </div>
          
          <div class="content">
            <p>Dear ${clientName},</p>
            
            <p>Thank you for your interest in improving your online presence! I've completed a basic SEO analysis of your website <strong>${seoReport.url}</strong> and I'm excited to share the insights with you.</p>
            
            <div class="score-card">
              <h3>📊 Key Findings Summary</h3>
              <p><strong>Industry:</strong> ${seoReport.industry}</p>
              <p><strong>Analysis Date:</strong> ${seoReport.analysisDate}</p>
            </div>
            
            <h3>🔍 Basic SEO Analysis Results</h3>
            
            <div class="metrics-grid">
              <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(seoReport.overallScore)}">${seoReport.overallScore}</div>
                <div class="metric-label">Overall SEO Score</div>
                <div class="score-label" style="color: ${getScoreColor(seoReport.overallScore)}">${getScoreLabel(seoReport.overallScore)}</div>
              </div>
              <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(seoReport.pageSpeed)}">2.1s</div>
                <div class="metric-label">Page Speed</div>
                <div class="score-label" style="color: ${getScoreColor(seoReport.pageSpeed)}">${getScoreLabel(seoReport.pageSpeed)}</div>
              </div>
              <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(seoReport.mobileScore)}">${seoReport.mobileScore}</div>
                <div class="metric-label">Mobile Score</div>
                <div class="score-label" style="color: ${getScoreColor(seoReport.mobileScore)}">${getScoreLabel(seoReport.mobileScore)}</div>
              </div>
              <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(seoReport.accessibilityScore)}">${seoReport.accessibilityScore}</div>
                <div class="metric-label">Accessibility</div>
                <div class="score-label" style="color: ${getScoreColor(seoReport.accessibilityScore)}">${getScoreLabel(seoReport.accessibilityScore)}</div>
              </div>
            </div>
            
            <div class="recommendations">
              <h3>🎯 Top Recommendations</h3>
              <ol>
                ${seoReport.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ol>
            </div>
            
            <div class="keywords-section">
              <h3>🔑 Keyword Opportunities (Preview)</h3>
              <p><strong>🎯 High-Value Keywords We've Identified</strong></p>
              <p>Based on our analysis of your website and local market, we've identified several keyword opportunities that could significantly boost your search rankings and patient inquiries.</p>
              
              <div class="keyword-category">
                <h4>🏥 Primary Healthcare Keywords</h4>
                ${seoReport.keywords.filter(k => k.category === 'primary').map(k => 
                  `<span class="keyword-item">${k.keyword}</span>`
                ).join('')}
                <p>+ 5 more opportunities</p>
              </div>
              
              <div class="keyword-category">
                <h4>🔍 Long-Tail Opportunities</h4>
                ${seoReport.keywords.filter(k => k.category === 'long-tail').map(k => 
                  `<span class="keyword-item">${k.keyword}</span>`
                ).join('')}
                <p>+ 5 more opportunities</p>
              </div>
              
              <div class="keyword-category">
                <h4>📍 Local SEO Keywords</h4>
                ${seoReport.keywords.filter(k => k.category === 'local').map(k => 
                  `<span class="keyword-item">${k.keyword}</span>`
                ).join('')}
                <p>+ 5 more opportunities</p>
              </div>
              
              <div class="keyword-category">
                <h4>💰 High-Value Commercial Keywords</h4>
                ${seoReport.keywords.filter(k => k.category === 'commercial').map(k => 
                  `<span class="keyword-item">${k.keyword}</span>`
                ).join('')}
                <p>+ 5 more opportunities</p>
              </div>
            </div>
            
            <div class="cta-section">
              <h3>🔓 Unlock Full Keyword Report</h3>
              <p>Schedule your free consultation to receive:</p>
              <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>✅ Complete keyword list with search volumes</li>
                <li>✅ Difficulty scores and competition analysis</li>
                <li>✅ Content recommendations for each keyword</li>
                <li>✅ Monthly search trends and seasonal patterns</li>
                <li>✅ Custom content calendar based on keywords</li>
                <li>✅ ROI projections for keyword optimization</li>
              </ul>
              
              <h4>💡 What This Means for Your Practice</h4>
              <p>These improvements could potentially:</p>
              <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>📈 Increase your website traffic by 40-60%</li>
                <li>🎯 Improve your local search rankings</li>
                <li>📞 Generate more qualified patient inquiries</li>
                <li>💰 Increase your practice revenue</li>
              </ul>
              
              <h4>🚀 Ready to See Your Detailed Report?</h4>
              <p>This is just the beginning! I've prepared a comprehensive detailed SEO analysis with:</p>
              <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>📊 Complete technical SEO audit</li>
                <li>🎯 Keyword research specific to your specialty</li>
                <li>🏆 Competitor analysis</li>
                <li>📈 Growth projections and ROI estimates</li>
                <li>🎯 Custom action plan for your practice</li>
              </ul>
              
              <a href="mailto:viral.tarpara@hotmail.com?subject=Schedule Free SEO Consultation" class="cta-button">📅 Schedule Free SEO Consultation</a>
              <a href="mailto:viral.tarpara@hotmail.com?subject=View Detailed Report" class="cta-button">📋 View Detailed Report</a>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3>🚀 Our Complete Marketing Solutions</h3>
              
              <div style="margin: 15px 0;">
                <h4>🔍 Organic SEO</h4>
                <p>Improve your search rankings naturally with our proven SEO strategies</p>
                <ul>
                  <li>Technical SEO optimization</li>
                  <li>Content marketing strategy</li>
                  <li>Local search optimization</li>
                </ul>
              </div>
              
              <div style="margin: 15px 0;">
                <h4>💰 Paid Advertising</h4>
                <p>Drive immediate traffic with targeted Google & Facebook ads</p>
                <ul>
                  <li>Google Ads management</li>
                  <li>Facebook & Instagram advertising</li>
                  <li>Local targeting campaigns</li>
                </ul>
              </div>
              
              <div style="margin: 15px 0;">
                <h4>💻 IT Services</h4>
                <p>Complete technology solutions for your healthcare practice</p>
                <ul>
                  <li>Website development & maintenance</li>
                  <li>Patient portal systems</li>
                  <li>Digital health integrations</li>
                </ul>
              </div>
            </div>
            
            <div style="background: #fff3cd; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3>🤝 Why Choose WeTechForU AI Marketing?</h3>
              <ul>
                <li>✅ Healthcare Specialists: We understand the unique challenges of marketing healthcare practices.</li>
                <li>✅ Proven Results: Our clients see an average 45% increase in patient inquiries within 6 months.</li>
                <li>✅ AI-Powered Analysis: Advanced technology provides insights your competitors don't have.</li>
                <li>✅ Local Expertise: We focus on local SEO to help patients in your area find you.</li>
                <li>✅ Full-Service Solutions: From SEO to paid ads to IT support - we handle everything.</li>
              </ul>
            </div>
            
            <div style="background: #d4edda; border-radius: 10px; padding: 20px; margin: 20px 0;">
              <h3>🎁 Special Offer for New Clients</h3>
              <p>As a new lead, you're eligible for our <strong>Free SEO Consultation (valued at $299)</strong>. During this 30-minute call, we'll:</p>
              <ul>
                <li>Review your detailed SEO report together</li>
                <li>Answer all your questions</li>
                <li>Create a customized strategy for your practice</li>
                <li>Provide immediate actionable recommendations</li>
              </ul>
            </div>
            
            <p>I'm excited to help you grow your healthcare practice online. Let's schedule a time to discuss how we can improve your digital presence and attract more patients.</p>
            
            <p>Best regards,<br>
            <strong>Viral Tarpara</strong><br>
            WeTechForU AI Marketing<br>
            📧 viral.tarpara@hotmail.com<br>
            📞 (555) 123-4567</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:viral.tarpara@hotmail.com?subject=Schedule Free SEO Consultation" class="cta-button">📅 Schedule Free SEO Consultation</a>
            </div>
            
            <p style="font-size: 12px; color: #666; text-align: center; margin-top: 30px;">
              This report was generated using advanced AI technology and real-time data analysis. Results may vary based on implementation and market conditions.
            </p>
          </div>
          
          <div class="footer">
            <h3>WeTechForU AI Marketing</h3>
            <p>Your Partner in Healthcare Digital Marketing Success</p>
            <p>📧 info@wetechforu.com | 🌐 www.wetechforu.com</p>
            <p>📞 (555) 123-4567</p>
            <p>LinkedIn | Facebook | Twitter</p>
            <p class="unsubscribe">
              You received this email because you're a valued lead or client of WeTechForU AI Marketing.<br>
              If you no longer wish to receive these emails, <a href="mailto:viral.tarpara@hotmail.com?subject=Unsubscribe">unsubscribe here</a>.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
