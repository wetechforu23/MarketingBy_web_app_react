import nodemailer from 'nodemailer';
import pool from '../config/database';
import * as crypto from 'crypto';
import { MicrosoftGraphEmailService } from './microsoftGraphSEOEmailService';

interface EmailConfig {
  from: string;
  service: string;
  user: string;
  password: string;
}

export class SEOEmailReportService {
  private static instance: SEOEmailReportService;
  private emailConfig: EmailConfig | null = null;
  private calendarBookingLink: string = '';
  private useMicrosoftGraph: boolean = true; // Prefer Microsoft Graph

  private constructor() {
    this.initializeConfig();
  }

  public static getInstance(): SEOEmailReportService {
    if (!SEOEmailReportService.instance) {
      SEOEmailReportService.instance = new SEOEmailReportService();
    }
    return SEOEmailReportService.instance;
  }

  private async initializeConfig() {
    try {
      // Get email credentials from encrypted_credentials table
      const result = await pool.query(`
        SELECT service, key_name, encrypted_value 
        FROM encrypted_credentials 
        WHERE service IN ('gmail', 'azure_email', 'office365', 'azure_calendar')
        AND key_name IN ('email_user', 'email_password', 'calendar_booking_link')
      `);

      const config: any = {};
      
      for (const row of result.rows) {
        const decrypted = this.decrypt(row.encrypted_value);
        
        if (row.key_name === 'calendar_booking_link') {
          this.calendarBookingLink = decrypted;
        } else if (row.key_name === 'email_user') {
          config.user = decrypted;
        } else if (row.key_name === 'email_password') {
          config.password = decrypted;
        }
      }

      // Use Gmail or fallback to environment
      this.emailConfig = {
        from: config.user || process.env.EMAIL_USER || 'noreply@marketingby.wetechforu.com',
        service: 'gmail',
        user: config.user || process.env.EMAIL_USER || '',
        password: config.password || process.env.EMAIL_PASSWORD || ''
      };

      if (!this.calendarBookingLink) {
        this.calendarBookingLink = 'https://outlook.office365.com/book/WeTechForU@wetechforu.com/';
      }

      console.log('✅ Email service initialized:', this.emailConfig.user);
    } catch (error) {
      console.error('Error initializing email config:', error);
    }
  }

  private decrypt(encryptedValue: string): string {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    
    try {
      const parts = encryptedValue.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return '';
    }
  }

  /**
   * Send Basic SEO Report Email
   */
  async sendBasicSEOReport(
    toEmail: string,
    companyName: string,
    contactName: string,
    websiteUrl: string,
    seoReport: any
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateBasicSEOEmailTemplate(
        companyName,
        contactName,
        websiteUrl,
        seoReport,
        toEmail
      );

      const subject = `🚀 Your Free Basic SEO Analysis - ${companyName}`;

      // Try Microsoft Graph first
      if (this.useMicrosoftGraph) {
        try {
          const graphService = MicrosoftGraphEmailService.getInstance();
          await graphService.sendEmail(toEmail, subject, htmlContent);
          console.log(`✅ Basic SEO report sent via Microsoft Graph to ${toEmail}`);
          return true;
        } catch (graphError) {
          console.warn('⚠️ Microsoft Graph failed, falling back to nodemailer:', graphError);
          this.useMicrosoftGraph = false; // Disable for future attempts this session
        }
      }

      // Fallback to nodemailer
      const transporter = nodemailer.createTransport({
        service: this.emailConfig?.service || 'gmail',
        auth: {
          user: this.emailConfig?.user,
          pass: this.emailConfig?.password
        }
      });

      await transporter.sendMail({
        from: `"WeTechForU - Healthcare Marketing" <${this.emailConfig?.from}>`,
        to: toEmail,
        subject,
        html: htmlContent
      });

      console.log(`✅ Basic SEO report sent via nodemailer to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending basic SEO report:', error);
      throw error;
    }
  }

  /**
   * Send Comprehensive SEO Report Email
   */
  async sendComprehensiveSEOReport(
    toEmail: string,
    companyName: string,
    contactName: string,
    websiteUrl: string,
    seoReport: any
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateComprehensiveSEOEmailTemplate(
        companyName,
        contactName,
        websiteUrl,
        seoReport,
        toEmail
      );

      const subject = `📊 Your Complete SEO & Competitor Analysis - ${companyName}`;

      // Try Microsoft Graph first
      if (this.useMicrosoftGraph) {
        try {
          const graphService = MicrosoftGraphEmailService.getInstance();
          await graphService.sendEmail(toEmail, subject, htmlContent);
          console.log(`✅ Comprehensive SEO report sent via Microsoft Graph to ${toEmail}`);
          return true;
        } catch (graphError) {
          console.warn('⚠️ Microsoft Graph failed, falling back to nodemailer:', graphError);
          this.useMicrosoftGraph = false;
        }
      }

      // Fallback to nodemailer
      const transporter = nodemailer.createTransport({
        service: this.emailConfig?.service || 'gmail',
        auth: {
          user: this.emailConfig?.user,
          pass: this.emailConfig?.password
        }
      });

      await transporter.sendMail({
        from: `"WeTechForU - Healthcare Marketing" <${this.emailConfig?.from}>`,
        to: toEmail,
        subject,
        html: htmlContent
      });

      console.log(`✅ Comprehensive SEO report sent via nodemailer to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending comprehensive SEO report:', error);
      throw error;
    }
  }

  /**
   * Generate Basic SEO Email Template
   */
  private generateBasicSEOEmailTemplate(
    companyName: string,
    contactName: string,
    websiteUrl: string,
    report: any,
    toEmail: string
  ): string {
    const score = report.overallScore || 0;
    const scoreColor = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
    const recommendations = report.recommendations?.slice(0, 5) || [];

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
        .container { max-width: 650px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4682B4 0%, #87CEEB 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
        .content { padding: 40px 30px; }
        .score-card { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px; border: 2px solid ${scoreColor}; }
        .score-number { font-size: 64px; font-weight: 800; color: ${scoreColor}; margin: 0; line-height: 1; }
        .score-label { font-size: 18px; color: #666; margin-top: 5px; font-weight: 600; }
        .section { margin: 30px 0; }
        .section-title { font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 15px; border-left: 4px solid #4682B4; padding-left: 12px; }
        .recommendation { background: #f8f9fa; border-left: 3px solid #4682B4; padding: 15px 20px; margin: 10px 0; border-radius: 6px; }
        .recommendation strong { color: #4682B4; display: block; margin-bottom: 5px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .stat-box { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; }
        .stat-number { font-size: 32px; font-weight: 700; color: #4682B4; margin: 0; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
        .cta-section { background: linear-gradient(135deg, #4682B4 0%, #87CEEB 100%); color: white; padding: 35px; text-align: center; border-radius: 12px; margin: 30px 0; }
        .cta-button { display: inline-block; background: white; color: #4682B4; padding: 16px 40px; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 16px; margin-top: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.2s; }
        .cta-button:hover { transform: translateY(-2px); }
        .services-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .service-box { background: #f8f9fa; border-radius: 8px; padding: 20px; border: 2px solid #e9ecef; }
        .service-box h4 { margin: 0 0 10px 0; color: #4682B4; font-size: 16px; }
        .service-box ul { margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #666; }
        .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
        .footer p { margin: 5px 0; font-size: 14px; opacity: 0.9; }
        @media only screen and (max-width: 600px) {
            .stats-grid, .services-grid { grid-template-columns: 1fr; }
            .score-number { font-size: 48px; }
            .content { padding: 25px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Your Basic SEO Analysis</h1>
            <p>Discover How to Improve Your Online Visibility</p>
        </div>

        <div class="content">
            <p style="font-size: 16px; color: #555;">Hi ${contactName},</p>
            
            <p style="font-size: 16px; color: #555; line-height: 1.8;">
                Thank you for your interest in improving <strong>${companyName}</strong>'s online presence! 
                We've completed a comprehensive analysis of <strong>${websiteUrl}</strong> and discovered 
                several opportunities to help you attract more patients and grow your practice.
            </p>

            <div class="score-card">
                <div class="score-number">${score}</div>
                <div class="score-label">Overall SEO Score</div>
                <p style="margin-top: 15px; color: #666; font-size: 14px;">
                    ${score >= 80 ? '🎉 Great job! But there\'s always room for improvement.' : 
                      score >= 60 ? '⚠️ Good start, but significant opportunities exist.' : 
                      '🚨 Critical issues need immediate attention.'}
                </p>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-number">${report.performance?.pageSpeedDesktop?.score || 0}</div>
                    <div class="stat-label">Desktop Speed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${report.performance?.pageSpeedMobile?.score || 0}</div>
                    <div class="stat-label">Mobile Speed</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">🔍 Key Findings</div>
                ${recommendations.map((rec: string, i: number) => `
                    <div class="recommendation">
                        <strong>${i + 1}. ${rec.split(':')[0] || 'Recommendation'}</strong>
                        ${rec.split(':')[1] || rec}
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <div class="section-title">⚠️ Why This Matters for Healthcare</div>
                <p style="color: #555; font-size: 15px; line-height: 1.8;">
                    In today's digital age, <strong>93% of patients</strong> search online before choosing a healthcare provider. 
                    If your website isn't optimized:
                </p>
                <ul style="color: #555; font-size: 15px; line-height: 1.8;">
                    <li><strong>You're losing patients</strong> to competitors who rank higher on Google</li>
                    <li><strong>Your website loads slowly</strong>, causing potential patients to leave</li>
                    <li><strong>You're not showing up</strong> when patients search for your services</li>
                    <li><strong>You're missing out</strong> on thousands of dollars in monthly revenue</li>
                </ul>
            </div>

            <div class="cta-section">
                <h2 style="margin: 0 0 15px 0; font-size: 24px;">🚀 Ready to Dominate Local Search?</h2>
                <p style="margin: 0; font-size: 16px; opacity: 0.95;">
                    Let's schedule a FREE 30-minute consultation to discuss how we can:
                </p>
                <ul style="text-align: left; max-width: 450px; margin: 20px auto; font-size: 15px;">
                    <li>Rank #1 on Google for local healthcare searches</li>
                    <li>Increase website traffic by 300-500%</li>
                    <li>Generate 20-50 new patient leads per month</li>
                    <li>Build a strong social media presence</li>
                </ul>
                <a href="${this.calendarBookingLink}" class="cta-button">📅 Book Your Free Consultation</a>
            </div>

            <div class="section">
                <div class="section-title">💼 Our Healthcare Marketing Services</div>
                <div class="services-grid">
                    <div class="service-box">
                        <h4>🔍 SEO & Content</h4>
                        <ul>
                            <li>Local SEO optimization</li>
                            <li>Healthcare blogging</li>
                            <li>Google My Business</li>
                            <li>Review management</li>
                        </ul>
                    </div>
                    <div class="service-box">
                        <h4>📱 Social Media</h4>
                        <ul>
                            <li>Facebook & Instagram</li>
                            <li>Organic posts & stories</li>
                            <li>Patient engagement</li>
                            <li>Community building</li>
                        </ul>
                    </div>
                    <div class="service-box">
                        <h4>💰 Paid Advertising</h4>
                        <ul>
                            <li>Google Ads</li>
                            <li>Facebook/Instagram Ads</li>
                            <li>Lead generation</li>
                            <li>ROI tracking</li>
                        </ul>
                    </div>
                    <div class="service-box">
                        <h4>⚡ One-Time Setup</h4>
                        <ul>
                            <li>50% OFF - Just $150</li>
                            <li>Complete platform setup</li>
                            <li>Analytics configuration</li>
                            <li>Pixel & tracking setup</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="margin: 0; color: #856404; font-size: 15px; font-weight: 600;">
                    ⏰ <strong>Limited Time Offer:</strong> Book a consultation this week and get 50% OFF your setup fee ($150 instead of $300) + First month's management at 20% discount!
                </p>
            </div>

            <p style="font-size: 16px; color: #555; margin-top: 30px;">
                Looking forward to helping <strong>${companyName}</strong> reach more patients!
            </p>
            
            <p style="font-size: 16px; color: #555; margin-top: 20px;">
                <strong>Best regards,</strong><br>
                <strong style="color: #4682B4;">WeTechForU Healthcare Marketing Team</strong><br>
                📧 info@wetechforu.com<br>
                📞 (469) 888-0705<br>
                🌐 <a href="https://www.marketingby.wetechforu.com" style="color: #4682B4;">www.marketingby.wetechforu.com</a>
            </p>
        </div>

        <div class="footer">
            <p><strong>WeTechForU</strong> - Healthcare Marketing Experts</p>
            <p>Helping healthcare providers grow their practice through AI-powered marketing</p>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 15px;">
                This email was sent to ${toEmail} because you requested an SEO analysis. 
                <a href="#" style="color: white;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate Comprehensive SEO Email Template
   */
  private generateComprehensiveSEOEmailTemplate(
    companyName: string,
    contactName: string,
    websiteUrl: string,
    report: any,
    toEmail: string
  ): string {
    const score = report.score || 0;
    const scoreColor = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';
    const recommendations = report.recommendations?.slice(0, 10) || [];
    const actionItems = report.actionItems?.slice(0, 5) || [];

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
        .container { max-width: 700px; margin: 30px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2c3e50 0%, #4682B4 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
        .header p { margin: 10px 0 0 0; font-size: 18px; opacity: 0.95; }
        .badge { display: inline-block; background: #ffc107; color: #000; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 10px; }
        .content { padding: 40px 30px; }
        .score-card { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 35px; text-align: center; margin-bottom: 30px; border: 3px solid ${scoreColor}; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .score-number { font-size: 72px; font-weight: 900; color: ${scoreColor}; margin: 0; line-height: 1; text-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
        .score-label { font-size: 20px; color: #666; margin-top: 8px; font-weight: 600; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 25px 0; }
        .stat-box { background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 10px; padding: 20px; text-align: center; border: 2px solid #e9ecef; }
        .stat-number { font-size: 36px; font-weight: 800; color: #4682B4; margin: 0; }
        .stat-label { font-size: 13px; color: #666; margin-top: 5px; font-weight: 600; }
        .section { margin: 35px 0; }
        .section-title { font-size: 22px; font-weight: 700; color: #2c3e50; margin-bottom: 20px; border-left: 5px solid #4682B4; padding-left: 15px; background: linear-gradient(90deg, #f8f9fa 0%, transparent 100%); padding: 12px 15px; border-radius: 0 8px 8px 0; }
        .recommendation { background: #ffffff; border: 2px solid #e9ecef; border-left: 4px solid #4682B4; padding: 18px 22px; margin: 12px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: transform 0.2s; }
        .recommendation:hover { transform: translateX(5px); }
        .recommendation strong { color: #2c3e50; display: block; margin-bottom: 8px; font-size: 16px; }
        .action-item { background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 4px solid #ffc107; padding: 20px; margin: 15px 0; border-radius: 8px; }
        .action-item .priority { display: inline-block; background: #dc3545; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
        .action-item .priority.high { background: #ff9800; }
        .action-item .priority.medium { background: #ffc107; color: #000; }
        .action-item h4 { margin: 8px 0; color: #2c3e50; font-size: 16px; }
        .competitor-box { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; border: 2px solid #e9ecef; }
        .competitor-box h4 { margin: 0 0 10px 0; color: #4682B4; }
        .cta-section { background: linear-gradient(135deg, #2c3e50 0%, #4682B4 100%); color: white; padding: 40px; text-align: center; border-radius: 12px; margin: 35px 0; box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
        .cta-button { display: inline-block; background: #ffc107; color: #000; padding: 18px 45px; text-decoration: none; border-radius: 50px; font-weight: 800; font-size: 17px; margin-top: 20px; box-shadow: 0 4px 15px rgba(255,193,7,0.4); transition: all 0.3s; }
        .cta-button:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(255,193,7,0.6); }
        .footer { background: #2c3e50; color: white; padding: 35px; text-align: center; }
        @media only screen and (max-width: 600px) {
            .stats-grid { grid-template-columns: 1fr; }
            .score-number { font-size: 56px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Comprehensive SEO Analysis</h1>
            <p>Complete Digital Marketing Audit & Strategy</p>
            <div class="badge">🏆 PREMIUM REPORT</div>
        </div>

        <div class="content">
            <p style="font-size: 17px; color: #555;">Dear ${contactName},</p>
            
            <p style="font-size: 17px; color: #555; line-height: 1.9;">
                We've completed an in-depth analysis of <strong>${companyName}</strong>'s entire digital presence. 
                This comprehensive audit covers SEO, competitor analysis, content strategy, technical performance, 
                and actionable insights to help you <strong>dominate your local healthcare market</strong>.
            </p>

            <div class="score-card">
                <div class="score-number">${score}</div>
                <div class="score-label">Comprehensive SEO Score</div>
                <p style="margin-top: 15px; color: #666; font-size: 15px; font-weight: 600;">
                    ${score >= 80 ? '🎯 Excellent foundation! Let\'s make you #1 in your area.' : 
                      score >= 60 ? '⚡ Strong potential! We can dramatically improve your visibility.' : 
                      '🚀 Huge opportunity! Your competitors are vulnerable.'}
                </p>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-number">${report.speedInsights?.desktop?.score || 0}</div>
                    <div class="stat-label">Desktop Performance</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${report.speedInsights?.mobile?.score || 0}</div>
                    <div class="stat-label">Mobile Performance</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${report.brokenLinks?.length || 0}</div>
                    <div class="stat-label">Broken Links</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">🎯 Critical Action Items</div>
                <p style="color: #555; margin-bottom: 20px;">These high-impact changes will drive immediate results:</p>
                ${actionItems.map((item: any) => `
                    <div class="action-item">
                        <span class="priority ${item.priority}">${item.priority}</span>
                        <h4>${item.action}</h4>
                        <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            <strong>Impact:</strong> ${item.impact} | 
                            <strong>Timeline:</strong> ${item.timeline || '2-4 weeks'}
                        </p>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <div class="section-title">🔍 Detailed Recommendations</div>
                ${recommendations.map((rec: string, i: number) => `
                    <div class="recommendation">
                        <strong>${i + 1}. ${rec.split(':')[0] || 'Key Finding'}</strong>
                        <span style="color: #666; font-size: 14px;">${rec.split(':')[1] || rec}</span>
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <div class="section-title">🏆 Competitor Analysis</div>
                <p style="color: #555; margin-bottom: 15px;">We analyzed your top 3 competitors in the healthcare space:</p>
                ${(report.competitorAnalysis?.topCompetitors || []).map((comp: any) => `
                    <div class="competitor-box">
                        <h4>🏥 ${comp.domain}</h4>
                        <p style="margin: 5px 0; color: #666; font-size: 14px;">
                            📊 Estimated Monthly Traffic: <strong>${comp.estimatedTraffic?.toLocaleString()}</strong><br>
                            ⭐ Domain Authority: <strong>${comp.domainAuthority}/100</strong>
                        </p>
                    </div>
                `).join('')}
                <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; border-radius: 8px; margin-top: 15px;">
                    <p style="margin: 0; color: #1565C0; font-size: 15px;">
                        <strong>💡 Opportunity:</strong> With the right strategy, you can outrank these competitors 
                        and capture their traffic within 3-6 months.
                    </p>
                </div>
            </div>

            <div class="section">
                <div class="section-title">💰 Why Investing in SEO is Critical</div>
                <ul style="color: #555; font-size: 16px; line-height: 2;">
                    <li><strong>75% of users</strong> never scroll past the first page of search results</li>
                    <li><strong>Local searches</strong> drive 50% of mobile users to visit stores within one day</li>
                    <li><strong>Healthcare SEO</strong> has 14.6% close rate vs 1.7% for traditional outbound</li>
                    <li><strong>Every $1 spent</strong> on SEO generates an average of $22 in revenue</li>
                    <li><strong>93% of patients</strong> start their healthcare journey with online search</li>
                </ul>
            </div>

            <div class="cta-section">
                <h2 style="margin: 0 0 15px 0; font-size: 28px;">🚀 Ready to 10X Your Patient Flow?</h2>
                <p style="margin: 0; font-size: 17px; opacity: 0.95; line-height: 1.7;">
                    Let's turn this analysis into <strong>real results</strong>. Book a FREE strategy session where we'll:
                </p>
                <ul style="text-align: left; max-width: 500px; margin: 20px auto; font-size: 16px; line-height: 1.9;">
                    <li>Create a custom 90-day action plan</li>
                    <li>Show you exactly how to outrank your competitors</li>
                    <li>Identify quick wins for immediate results</li>
                    <li>Discuss our proven healthcare marketing system</li>
                </ul>
                <a href="${this.calendarBookingLink}" class="cta-button">📅 Schedule My FREE Strategy Call</a>
                <p style="margin: 20px 0 0 0; font-size: 14px; opacity: 0.9;">
                    ⏰ Limited slots available this week
                </p>
            </div>

            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-left: 5px solid #ffc107; padding: 25px; border-radius: 10px; margin: 35px 0;">
                <h3 style="margin: 0 0 10px 0; color: #856404;">🎁 Exclusive Offer for ${companyName}</h3>
                <p style="margin: 0; color: #856404; font-size: 16px; line-height: 1.8;">
                    <strong>Book this week and receive:</strong><br>
                    ✅ 50% OFF Setup Fee ($150 instead of $300)<br>
                    ✅ FREE competitor keyword analysis ($500 value)<br>
                    ✅ FREE Google My Business optimization<br>
                    ✅ 20% OFF your first 3 months of service
                </p>
            </div>

            <p style="font-size: 17px; color: #555; margin-top: 35px;">
                We're excited to help <strong>${companyName}</strong> achieve market dominance!
            </p>
            
            <p style="font-size: 17px; color: #555; margin-top: 25px;">
                <strong>Best regards,</strong><br>
                <strong style="color: #4682B4; font-size: 18px;">WeTechForU Healthcare Marketing Team</strong><br>
                📧 info@wetechforu.com | 📞 (469) 888-0705<br>
                🌐 <a href="https://www.marketingby.wetechforu.com" style="color: #4682B4; font-weight: 600;">www.marketingby.wetechforu.com</a>
            </p>
        </div>

        <div class="footer">
            <p style="font-size: 18px; font-weight: 700;">WeTechForU - Healthcare Marketing Experts</p>
            <p style="opacity: 0.9;">AI-Powered Marketing Solutions for Healthcare Providers</p>
            <p style="font-size: 12px; opacity: 0.7; margin-top: 20px;">
                This comprehensive report was generated for ${toEmail}. 
                <a href="#" style="color: white;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

export default SEOEmailReportService;

