import { EmailService } from './emailService';

export interface SEOEmailData {
  leadName: string;
  leadEmail: string;
  clinicName: string;
  websiteUrl: string;
  seoScore: number;
  reportContent: string;
  recommendations: string[];
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  senderWebsite: string;
}

export class SEOEmailService {
  private static instance: SEOEmailService;
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  public static getInstance(): SEOEmailService {
    if (!SEOEmailService.instance) {
      SEOEmailService.instance = new SEOEmailService();
    }
    return SEOEmailService.instance;
  }

  async sendSEOReport(data: SEOEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const subject = `Free SEO Analysis Report for ${data.clinicName}`;
      const htmlContent = this.generateEmailHTML(data);
      const textContent = this.generateEmailText(data);

      const result = await this.emailService.sendEmail({
        to: data.leadEmail,
        subject: subject,
        html: htmlContent,
        text: textContent,
        from: data.senderEmail
      });

      return {
        success: true,
        messageId: result ? 'sent' : undefined
      };

    } catch (error) {
      console.error('Failed to send SEO report email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private generateEmailHTML(data: SEOEmailData): string {
    const scoreColor = data.seoScore >= 80 ? '#10B981' : data.seoScore >= 60 ? '#F59E0B' : '#EF4444';
    const scoreText = data.seoScore >= 80 ? 'Excellent' : data.seoScore >= 60 ? 'Good' : 'Needs Improvement';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Analysis Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3B82F6;
            margin-bottom: 10px;
        }
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: ${scoreColor};
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 20px auto;
            font-size: 24px;
            font-weight: bold;
        }
        .score-number {
            font-size: 36px;
        }
        .score-text {
            font-size: 14px;
            margin-top: 5px;
        }
        .section {
            margin: 25px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3B82F6;
        }
        .section h3 {
            color: #3B82F6;
            margin-top: 0;
            font-size: 18px;
        }
        .recommendations {
            background: #FEF3C7;
            border-left-color: #F59E0B;
        }
        .recommendations h3 {
            color: #D97706;
        }
        .recommendations ul {
            margin: 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin: 8px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3B82F6, #1D4ED8);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
        .contact-info {
            background: #EFF6FF;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .contact-info h4 {
            color: #1E40AF;
            margin: 0 0 10px 0;
        }
        .contact-info p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏥 Healthcare Marketing Pro</div>
            <h1>Free SEO Analysis Report</h1>
            <p>Comprehensive website analysis for <strong>${data.clinicName}</strong></p>
        </div>

        <div style="text-align: center;">
            <div class="score-circle">
                <div class="score-number">${data.seoScore}</div>
                <div class="score-text">${scoreText}</div>
            </div>
            <h2>Overall SEO Score: ${data.seoScore}/100</h2>
        </div>

        <div class="section">
            <h3>📊 Analysis Summary</h3>
            <p>We've completed a comprehensive SEO analysis of your website <strong>${data.websiteUrl}</strong>. 
            Your current SEO score is <strong>${data.seoScore}/100</strong>, which indicates 
            <strong>${scoreText.toLowerCase()}</strong> optimization.</p>
            
            <p>This analysis covers technical SEO, content optimization, mobile-friendliness, 
            page speed, and search engine visibility factors that directly impact your online presence 
            and patient acquisition.</p>
        </div>

        <div class="section recommendations">
            <h3>🎯 Priority Recommendations</h3>
            <p>Based on our analysis, here are the most impactful improvements you can make:</p>
            <ul>
                ${data.recommendations.slice(0, 5).map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="section">
            <h3>💡 How This Helps Your Practice</h3>
            <p>Improving your website's SEO can significantly impact your practice:</p>
            <ul>
                <li><strong>More Patient Inquiries:</strong> Better search rankings = more visibility = more patients</li>
                <li><strong>Higher Quality Leads:</strong> Patients find you when actively searching for your services</li>
                <li><strong>Competitive Advantage:</strong> Outrank competitors in local search results</li>
                <li><strong>Cost-Effective Marketing:</strong> Organic search traffic is free and highly targeted</li>
            </ul>
        </div>

        <div class="contact-info">
            <h4>🤝 Ready to Improve Your Online Presence?</h4>
            <p>As healthcare marketing specialists, we help practices like yours:</p>
            <ul>
                <li>Implement SEO improvements that drive results</li>
                <li>Create content that attracts and converts patients</li>
                <li>Optimize for local search to dominate your market</li>
                <li>Track and measure your online marketing success</li>
            </ul>
        </div>

        <div style="text-align: center;">
            <a href="mailto:${data.senderEmail}?subject=Interested in SEO Services for ${data.clinicName}" class="cta-button">
                📧 Get Your Custom SEO Strategy
            </a>
        </div>

        <div class="footer">
            <p><strong>${data.senderName}</strong><br>
            Healthcare Marketing Specialist</p>
            <p>📧 ${data.senderEmail} | 📞 ${data.senderPhone}<br>
            🌐 ${data.senderWebsite}</p>
            <p style="font-size: 12px; margin-top: 15px;">
                This report was generated using advanced SEO analysis tools. 
                For questions about this analysis or to discuss implementation, please don't hesitate to reach out.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private generateEmailText(data: SEOEmailData): string {
    const scoreText = data.seoScore >= 80 ? 'Excellent' : data.seoScore >= 60 ? 'Good' : 'Needs Improvement';

    return `
FREE SEO ANALYSIS REPORT FOR ${data.clinicName.toUpperCase()}

Dear ${data.leadName},

We've completed a comprehensive SEO analysis of your website: ${data.websiteUrl}

OVERALL SEO SCORE: ${data.seoScore}/100 (${scoreText})

ANALYSIS SUMMARY:
We've analyzed your website for technical SEO, content optimization, mobile-friendliness, page speed, and search engine visibility factors that directly impact your online presence and patient acquisition.

PRIORITY RECOMMENDATIONS:
${data.recommendations.slice(0, 5).map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

HOW THIS HELPS YOUR PRACTICE:
• More Patient Inquiries: Better search rankings = more visibility = more patients
• Higher Quality Leads: Patients find you when actively searching for your services  
• Competitive Advantage: Outrank competitors in local search results
• Cost-Effective Marketing: Organic search traffic is free and highly targeted

READY TO IMPROVE YOUR ONLINE PRESENCE?
As healthcare marketing specialists, we help practices like yours:
• Implement SEO improvements that drive results
• Create content that attracts and converts patients
• Optimize for local search to dominate your market
• Track and measure your online marketing success

CONTACT INFORMATION:
${data.senderName}
Healthcare Marketing Specialist
Email: ${data.senderEmail}
Phone: ${data.senderPhone}
Website: ${data.senderWebsite}

This report was generated using advanced SEO analysis tools. For questions about this analysis or to discuss implementation, please don't hesitate to reach out.

Best regards,
${data.senderName}
    `;
  }

  async sendBulkSEOReports(leads: SEOEmailData[]): Promise<{ success: number; failed: number; results: any[] }> {
    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const lead of leads) {
      try {
        const result = await this.sendSEOReport(lead);
        results.push({ lead: lead.leadEmail, ...result });
        
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }

        // Add delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.push({ 
          lead: lead.leadEmail, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failedCount++;
      }
    }

    return {
      success: successCount,
      failed: failedCount,
      results
    };
  }
}