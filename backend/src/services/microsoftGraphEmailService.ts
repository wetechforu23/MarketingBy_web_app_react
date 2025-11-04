import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import pool from '../config/database';
import crypto from 'crypto';

export interface MicrosoftGraphEmailOptions {
  to: string | string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  from?: string;
}

export class MicrosoftGraphEmailService {
  private graphClient: Client | null = null;
  private credential: ClientSecretCredential | null = null;
  private fromEmail: string;
  private initialized: boolean = false;

  constructor() {
    this.fromEmail = process.env.SMTP_SENDER_EMAIL || 'info@wetechforu.com';
    // Initialize asynchronously - credentials will be loaded when needed
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
      throw new Error('Failed to decrypt Azure credentials');
    }
  }

  private async initializeCredentials(): Promise<void> {
    if (this.initialized && this.credential) {
      return; // Already initialized
    }

    try {
      // Try to get credentials from database first
      const result = await pool.query(`
        SELECT key_name, encrypted_value
        FROM encrypted_credentials
        WHERE service = 'azure'
        AND key_name IN ('client_id', 'tenant_id', 'client_secret')
      `);

      let tenantId: string | undefined;
      let clientId: string | undefined;
      let clientSecret: string | undefined;

      if (result.rows.length > 0) {
        const creds: any = {};
        result.rows.forEach((row: any) => {
          creds[row.key_name] = this.decrypt(row.encrypted_value);
        });

        tenantId = creds.tenant_id;
        clientId = creds.client_id;
        clientSecret = creds.client_secret;

        console.log('✅ Azure credentials loaded from database');
      }

      // Fallback to environment variables if not found in database
      if (!tenantId || !clientId || !clientSecret) {
        tenantId = process.env.AZURE_TENANT_ID;
        clientId = process.env.AZURE_CLIENT_ID;
        clientSecret = process.env.AZURE_CLIENT_SECRET;

        if (tenantId && clientId && clientSecret) {
          console.log('✅ Azure credentials loaded from environment variables');
        }
      }

      if (!tenantId || !clientId || !clientSecret) {
        throw new Error('Azure credentials not found in database or environment variables');
      }

      // Initialize Azure credentials
      this.credential = new ClientSecretCredential(
        tenantId,
        clientId,
        clientSecret
      );

      // Create Graph client with custom authentication provider
      this.graphClient = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            const tokenResponse = await this.credential!.getToken('https://graph.microsoft.com/.default');
            return tokenResponse?.token || '';
          }
        }
      });

      this.initialized = true;
      console.log('✅ Microsoft Graph Email Service initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize Microsoft Graph Email Service:', error.message);
      throw error;
    }
  }

  async sendEmail(options: MicrosoftGraphEmailOptions): Promise<boolean> {
    try {
      // Initialize credentials if not already done
      await this.initializeCredentials();

      if (!this.graphClient || !this.credential) {
        throw new Error('Microsoft Graph client not initialized');
      }

      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      
      const message = {
        subject: options.subject,
        body: {
          contentType: 'HTML',
          content: options.htmlContent
        },
        toRecipients: recipients.map(email => ({
          emailAddress: {
            address: email
          }
        })),
        from: {
          emailAddress: {
            address: options.from || this.fromEmail
          }
        }
      };

      const sendMailRequest = {
        message,
        saveToSentItems: true
      };

      // Use /users/{email}/sendMail for application permissions (client credentials flow)
      // instead of /me/sendMail which requires delegated permissions
      const senderEmail = options.from || this.fromEmail;
      
      await this.graphClient
        .api(`/users/${senderEmail}/sendMail`)
        .post(sendMailRequest);

      console.log('✅ Email sent successfully via Microsoft Graph API');
      return true;
    } catch (error: any) {
      console.error('❌ Microsoft Graph email sending failed:', error.message);
      console.error('❌ Error details:', error);
      return false;
    }
  }

  async sendSEOReport(
    clientEmail: string,
    clientName: string,
    seoReport: any
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateSEOEmailHTML(clientName, seoReport);
      
      return await this.sendEmail({
        to: clientEmail,
        subject: '🎯 Your Basic SEO Report is Ready!',
        htmlContent
      });
    } catch (error) {
      console.error('Send SEO report error:', error);
      return false;
    }
  }

  async sendCalendarInvite(
    clientEmail: string,
    clientName: string,
    meetingDetails: any
  ): Promise<boolean> {
    try {
      const htmlContent = this.generateCalendarInviteHTML(clientName, meetingDetails);
      
      return await this.sendEmail({
        to: clientEmail,
        subject: `📅 Calendar Invitation: ${meetingDetails.title}`,
        htmlContent
      });
    } catch (error) {
      console.error('Send calendar invite error:', error);
      return false;
    }
  }

  private generateSEOEmailHTML(clientName: string, seoReport: any): string {
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
          .cta-section { background: #e8f5e8; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
          .cta-button { background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin: 10px; }
          .cta-button:hover { background: #218838; }
          .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .footer a { color: #3498db; text-decoration: none; }
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
                ${seoReport.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
              </ol>
            </div>
            
            <div class="cta-section">
              <h3>🚀 Ready to See Your Detailed Report?</h3>
              <p>This is just the beginning! I've prepared a comprehensive detailed SEO analysis with actionable recommendations.</p>
              
              <a href="mailto:viral.tarpara@hotmail.com?subject=Schedule Free SEO Consultation" class="cta-button">📅 Schedule Free SEO Consultation</a>
              <a href="mailto:viral.tarpara@hotmail.com?subject=View Detailed Report" class="cta-button">📋 View Detailed Report</a>
            </div>
            
            <p>I'm excited to help you grow your healthcare practice online. Let's schedule a time to discuss how we can improve your digital presence and attract more patients.</p>
            
            <p>Best regards,<br>
            <strong>Viral Tarpara</strong><br>
            WeTechForU AI Marketing<br>
            📧 viral.tarpara@hotmail.com<br>
            📞 (555) 123-4567</p>
          </div>
          
          <div class="footer">
            <h3>WeTechForU AI Marketing</h3>
            <p>Your Partner in Healthcare Digital Marketing Success</p>
            <p>📧 info@wetechforu.com | 🌐 www.wetechforu.com</p>
            <p>📞 (555) 123-4567</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateCalendarInviteHTML(clientName: string, meetingDetails: any): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Calendar Invitation - WeTechForU</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background: linear-gradient(135deg, #2E86AB 0%, #1E3A8A 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .meeting-details { background: #f8f9fa; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .cta-button { background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin: 10px; }
          .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Calendar Invitation</h1>
          </div>
          
          <div class="content">
            <p>Hello ${clientName},</p>
            
            <div class="meeting-details">
              <h3>${meetingDetails.title}</h3>
              <p><strong>Date:</strong> ${meetingDetails.startTime.toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${meetingDetails.startTime.toLocaleTimeString()} - ${meetingDetails.endTime.toLocaleTimeString()}</p>
              <p><strong>Location:</strong> ${meetingDetails.location || 'Online Meeting'}</p>
              <p><strong>Description:</strong></p>
              <p>${meetingDetails.description}</p>
            </div>
            
            <p>We look forward to meeting with you!</p>
            <p>Best regards,<br>The WeTechForU Team</p>
          </div>
          
          <div class="footer">
            <p>WeTechForU AI Marketing | viral.tarpara@hotmail.com</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
