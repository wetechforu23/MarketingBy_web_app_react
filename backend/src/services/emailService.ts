import nodemailer from 'nodemailer';
import { AzureEmailService } from './azureEmailService';
import { MicrosoftGraphEmailService } from './microsoftGraphEmailService';
import dotenv from 'dotenv';

dotenv.config();

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  htmlContent?: string;
  textContent?: string;
  from?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private azureEmailService: AzureEmailService | null = null;
  private microsoftGraphEmailService: MicrosoftGraphEmailService | null = null;

  constructor() {
    // Try to initialize Microsoft Graph email service first
    // Note: Credentials will be loaded from database or environment variables when needed
    try {
      this.microsoftGraphEmailService = new MicrosoftGraphEmailService();
      console.log('Microsoft Graph Email Service instance created (credentials will load from database)');
    } catch (error) {
      console.warn('Microsoft Graph Email Service not available:', error);
    }

    // Try to initialize Azure Communication Services email service
    try {
      if (process.env.AZURE_COMMUNICATION_CONNECTION_STRING) {
        this.azureEmailService = AzureEmailService.getInstance();
        console.log('Azure Communication Services Email Service initialized successfully');
      }
    } catch (error) {
      console.warn('Azure Communication Services Email Service not available:', error);
    }

    // Create SMTP transporter as last fallback (but won't work with disabled SMTP auth)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER || 'smtp-mail.outlook.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_USE_TLS === 'True',
      auth: {
        user: process.env.SMTP_SENDER_EMAIL || 'info@wetechforu.com',
        pass: process.env.AZURE_CLIENT_SECRET || 'your-app-password'
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    // Try Microsoft Graph email service first if available
    if (this.microsoftGraphEmailService) {
      try {
        const success = await this.microsoftGraphEmailService.sendEmail({
          to: options.to,
          subject: options.subject,
          htmlContent: options.html || options.text || '',
          textContent: options.text
        });
        
        if (success) {
          console.log('Email sent successfully via Microsoft Graph API');
          return true;
        }
      } catch (error) {
        console.warn('Microsoft Graph email failed, trying Azure Communication Services:', error);
      }
    }

    // Try Azure Communication Services email service if available
    if (this.azureEmailService) {
      try {
        const recipients = Array.isArray(options.to) ? options.to : [options.to];
        const success = await this.azureEmailService.sendEmail({
          to: recipients,
          subject: options.subject,
          htmlContent: options.html || options.text || '',
          textContent: options.text,
          from: options.from || process.env.AZURE_EMAIL_FROM_ADDRESS || 'info@wetechforu.com'
        });
        
        if (success) {
          console.log('Email sent successfully via Azure Communication Services');
          return true;
        }
      } catch (error) {
        console.warn('Azure Communication Services email failed, falling back to SMTP:', error);
      }
    }

    // Fallback to SMTP
    try {
      const mailOptions = {
        from: options.from || process.env.SMTP_SENDER_EMAIL || 'WeTechForU <info@wetechforu.com>',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully via SMTP:', result.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E86AB;">Welcome to WeTechForU!</h2>
        <p>Hello ${username},</p>
        <p>Welcome to the WeTechForU Healthcare Marketing Platform. We're excited to have you on board!</p>
        <p>Your account has been successfully created and you can now access all our marketing tools and services.</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>What's Next?</h3>
          <ul>
            <li>Complete your profile setup</li>
            <li>Explore our SEO analysis tools</li>
            <li>Set up your first marketing campaign</li>
            <li>Connect with our support team if you need help</li>
          </ul>
        </div>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Best regards,<br>The WeTechForU Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to WeTechForU Healthcare Marketing Platform',
      html
    });
  }

  async sendSEOResultsEmail(to: string, url: string, score: number, recommendations: string[]): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E86AB;">SEO Analysis Results</h2>
        <p>Your SEO analysis for <strong>${url}</strong> is complete!</p>
        
        <div style="background: ${score >= 80 ? '#d4edda' : score >= 60 ? '#fff3cd' : '#f8d7da'}; 
                    padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545'};">
          <h3 style="margin: 0 0 10px 0;">SEO Score: ${score}/100</h3>
          <p style="margin: 0;">${score >= 80 ? 'Excellent!' : score >= 60 ? 'Good, but can be improved' : 'Needs significant improvement'}</p>
        </div>

        ${recommendations.length > 0 ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Recommendations:</h3>
            <ul>
              ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <p>You can view the full report in your dashboard.</p>
        <p>Best regards,<br>The WeTechForU Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `SEO Analysis Results for ${url}`,
      html
    });
  }

  async sendCampaignUpdateEmail(to: string, campaignName: string, status: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E86AB;">Campaign Update</h2>
        <p>Your marketing campaign <strong>"${campaignName}"</strong> status has been updated.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Campaign Status: ${status}</h3>
          <p>You can view detailed performance metrics in your dashboard.</p>
        </div>

        <p>Best regards,<br>The WeTechForU Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Campaign Update: ${campaignName}`,
      html
    });
  }

  async sendLeadNotificationEmail(to: string, leadName: string, leadEmail: string, source: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2E86AB;">New Lead Alert!</h2>
        <p>A new lead has been added to your marketing pipeline.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Lead Details:</h3>
          <p><strong>Name:</strong> ${leadName}</p>
          <p><strong>Email:</strong> ${leadEmail}</p>
          <p><strong>Source:</strong> ${source}</p>
        </div>

        <p>You can view and manage this lead in your dashboard.</p>
        <p>Best regards,<br>The WeTechForU Team</p>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `New Lead: ${leadName}`,
      html
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Check if we have any email service available
      if (this.azureEmailService || this.microsoftGraphEmailService) {
        console.log('Email service available (Azure/Microsoft Graph)');
        return true;
      }
      
      // Try SMTP verification only if we have proper credentials
      if (process.env.SMTP_SENDER_EMAIL && process.env.SMTP_SENDER_PASSWORD) {
        await this.transporter.verify();
        console.log('Email service connection verified');
        return true;
      } else {
        console.log('Email service not configured - no credentials available');
        return false;
      }
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}
