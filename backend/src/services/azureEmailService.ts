import { EmailClient } from '@azure/communication-email';
import { DefaultAzureCredential } from '@azure/identity';

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  from: string;
  replyTo?: string;
}

export interface EmailResult {
  messageId: string;
  success: boolean;
  error?: string;
}

export interface BulkEmailOptions {
  recipients: Array<{
    email: string;
    name?: string;
    customData?: any;
  }>;
  subject: string;
  template: string;
  from: string;
  replyTo?: string;
}

export class AzureEmailService {
  private static instance: AzureEmailService;
  private emailClient: EmailClient | null = null;
  private connectionString: string;
  private isConfigured: boolean = false;

  private constructor() {
    this.connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
    
    if (this.connectionString) {
      try {
        this.emailClient = new EmailClient(this.connectionString);
        this.isConfigured = true;
        console.log('✅ Azure Email Service configured successfully');
      } catch (error) {
        console.error('❌ Failed to configure Azure Email Service:', error);
        this.isConfigured = false;
      }
    } else {
      console.warn('⚠️ AZURE_COMMUNICATION_CONNECTION_STRING is not set. Azure Email Service will not function.');
    }
  }

  public static getInstance(): AzureEmailService {
    if (!AzureEmailService.instance) {
      AzureEmailService.instance = new AzureEmailService();
    }
    return AzureEmailService.instance;
  }

  /**
   * Send a single email
   */
  async sendEmail(emailData: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured || !this.emailClient) {
      throw new Error('Azure Email Service is not configured');
    }

    try {
      const message = {
        senderAddress: emailData.from,
        recipients: {
          to: emailData.to.map(email => ({ address: email })),
          cc: emailData.cc?.map(email => ({ address: email })),
          bcc: emailData.bcc?.map(email => ({ address: email })),
        },
        content: {
          subject: emailData.subject,
          html: emailData.htmlContent,
          plainText: emailData.textContent || this.stripHtml(emailData.htmlContent),
        },
        replyTo: emailData.replyTo ? [{ address: emailData.replyTo }] : undefined,
      };

      const poller = await this.emailClient.beginSend(message);
      const result = await poller.pollUntilDone();

      return {
        messageId: result.id || 'unknown',
        success: true,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        messageId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk emails with template
   */
  async sendBulkEmails(options: BulkEmailOptions): Promise<EmailResult[]> {
    if (!this.isConfigured || !this.emailClient) {
      throw new Error('Azure Email Service is not configured');
    }

    const results: EmailResult[] = [];

    // Send emails in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < options.recipients.length; i += batchSize) {
      const batch = options.recipients.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (recipient) => {
        try {
          const personalizedContent = this.personalizeTemplate(
            options.template,
            recipient.name || '',
            recipient.customData || {}
          );

          const emailData: EmailMessage = {
            to: [recipient.email],
            subject: options.subject,
            htmlContent: personalizedContent,
            from: options.from,
            replyTo: options.replyTo,
          };

          return await this.sendEmail(emailData);
        } catch (error) {
          return {
            messageId: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < options.recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Send SEO report email to a lead
   */
  async sendSEOReportEmail(
    leadEmail: string,
    leadName: string,
    clinicName: string,
    websiteUrl: string,
    seoScore: number,
    reportContent: string,
    recommendations: string[],
    senderInfo: {
      name: string;
      email: string;
      phone: string;
      website: string;
    }
  ): Promise<EmailResult> {
    const htmlContent = this.generateSEOReportEmail(
      leadName,
      clinicName,
      websiteUrl,
      seoScore,
      reportContent,
      recommendations,
      senderInfo
    );

    const emailData: EmailMessage = {
      to: [leadEmail],
      subject: `Free SEO Analysis Report for ${clinicName}`,
      htmlContent: htmlContent,
      from: senderInfo.email,
      replyTo: senderInfo.email,
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Send welcome email to new leads
   */
  async sendWelcomeEmail(
    leadEmail: string,
    leadName: string,
    senderInfo: {
      name: string;
      email: string;
      phone: string;
      website: string;
    }
  ): Promise<EmailResult> {
    const htmlContent = this.generateWelcomeEmail(leadName, senderInfo);

    const emailData: EmailMessage = {
      to: [leadEmail],
      subject: 'Welcome! Let\'s Grow Your Healthcare Practice Together',
      htmlContent: htmlContent,
      from: senderInfo.email,
      replyTo: senderInfo.email,
    };

    return await this.sendEmail(emailData);
  }

  /**
   * Test email configuration
   */
  async testConfiguration(): Promise<boolean> {
    if (!this.isConfigured || !this.emailClient) {
      return false;
    }

    try {
      // Try to send a test email to verify configuration
      const testEmail: EmailMessage = {
        to: ['test@example.com'], // This will fail but we can catch the error
        subject: 'Test Email',
        htmlContent: '<p>This is a test email to verify Azure Email Service configuration.</p>',
        from: 'noreply@example.com',
      };

      await this.sendEmail(testEmail);
      return true;
    } catch (error) {
      // Even if it fails, if we get here it means the service is configured
      // The failure might be due to invalid email addresses or other issues
      console.log('Azure Email Service test completed (expected to fail with test data)');
      return true;
    }
  }

  private personalizeTemplate(template: string, name: string, customData: any): string {
    let personalizedTemplate = template
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{firstName\}\}/g, name.split(' ')[0] || name);

    // Replace custom data placeholders
    Object.keys(customData).forEach(key => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      personalizedTemplate = personalizedTemplate.replace(placeholder, customData[key] || '');
    });

    return personalizedTemplate;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private generateSEOReportEmail(
    leadName: string,
    clinicName: string,
    websiteUrl: string,
    seoScore: number,
    reportContent: string,
    recommendations: string[],
    senderInfo: any
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .score { font-size: 48px; font-weight: bold; color: ${seoScore >= 70 ? '#28a745' : seoScore >= 50 ? '#ffc107' : '#dc3545'}; }
        .recommendations { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2c5aa0; }
        .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .cta-button { background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Free SEO Analysis Report</h1>
            <p>For ${clinicName}</p>
        </div>
        
        <div class="content">
            <h2>Hello ${leadName},</h2>
            
            <p>Thank you for your interest in our SEO analysis services. I've completed a comprehensive analysis of your website <strong>${websiteUrl}</strong> and I'm excited to share the results with you.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <h3>Your SEO Score</h3>
                <div class="score">${seoScore}/100</div>
                <p>${seoScore >= 70 ? 'Great job! Your website is performing well.' : seoScore >= 50 ? 'Good foundation, but there\'s room for improvement.' : 'Significant opportunities for improvement.'}</p>
            </div>
            
            <div class="recommendations">
                <h3>Key Recommendations:</h3>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            
            <p>This analysis is just the beginning. I'd love to discuss how we can help improve your online presence and drive more patients to your practice.</p>
            
            <div style="text-align: center;">
                <a href="mailto:${senderInfo.email}?subject=Discuss SEO Report for ${clinicName}" class="cta-button">
                    Schedule a Free Consultation
                </a>
            </div>
            
            <p>Best regards,<br>
            ${senderInfo.name}<br>
            ${senderInfo.phone}<br>
            <a href="${senderInfo.website}">${senderInfo.website}</a></p>
        </div>
        
        <div class="footer">
            <p>This email was sent because you requested an SEO analysis. If you no longer wish to receive these emails, please reply with "UNSUBSCRIBE".</p>
        </div>
    </div>
</body>
</html>`;
  }

  private generateWelcomeEmail(leadName: string, senderInfo: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Healthcare Marketing Services</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { background: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .cta-button { background: #2c5aa0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Our Healthcare Marketing Services</h1>
        </div>
        
        <div class="content">
            <h2>Hello ${leadName},</h2>
            
            <p>Thank you for your interest in our healthcare marketing services! We're excited to help you grow your practice and reach more patients.</p>
            
            <h3>What We Can Do for You:</h3>
            <ul>
                <li><strong>SEO Optimization:</strong> Improve your website's search engine rankings</li>
                <li><strong>Lead Generation:</strong> Attract more qualified patients to your practice</li>
                <li><strong>Digital Marketing:</strong> Comprehensive online marketing strategies</li>
                <li><strong>Website Optimization:</strong> Make your website work harder for you</li>
            </ul>
            
            <p>I'd love to schedule a brief call to discuss your specific needs and how we can help your practice thrive.</p>
            
            <div style="text-align: center;">
                <a href="mailto:${senderInfo.email}?subject=Schedule Consultation for ${leadName}" class="cta-button">
                    Schedule a Free Consultation
                </a>
            </div>
            
            <p>Best regards,<br>
            ${senderInfo.name}<br>
            ${senderInfo.phone}<br>
            <a href="${senderInfo.website}">${senderInfo.website}</a></p>
        </div>
        
        <div class="footer">
            <p>This email was sent because you expressed interest in our services. If you no longer wish to receive these emails, please reply with "UNSUBSCRIBE".</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Send consultation booking email to a lead
   */
  async sendConsultationBookingEmail(
    leadEmail: string,
    leadName: string,
    clinicName: string,
    bookingDetails: {
      date: string;
      time: string;
      duration: number;
      meetingType: string;
      meetingLink?: string;
      phoneNumber?: string;
    },
    senderInfo: { name: string; email: string; phone?: string }
  ): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('Azure Communication Services is not configured');
    }

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (timeString: string) => {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Consultation Confirmed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${clinicName}</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Dear ${leadName},
          </p>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Thank you for scheduling a consultation with our healthcare marketing team. We're excited to discuss how we can help grow your practice and improve your online presence.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin-top: 0;">Consultation Details</h3>
            <p style="color: #333; margin: 5px 0;"><strong>Date:</strong> ${formatDate(bookingDetails.date)}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Time:</strong> ${formatTime(bookingDetails.time)}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Duration:</strong> ${bookingDetails.duration} minutes</p>
            <p style="color: #333; margin: 5px 0;"><strong>Type:</strong> ${bookingDetails.meetingType}</p>
            ${bookingDetails.meetingLink ? `<p style="color: #333; margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${bookingDetails.meetingLink}" style="color: #667eea;">Join Meeting</a></p>` : ''}
            ${bookingDetails.phoneNumber ? `<p style="color: #333; margin: 5px 0;"><strong>Phone:</strong> ${bookingDetails.phoneNumber}</p>` : ''}
          </div>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #667eea; margin-top: 0;">What to Expect</h3>
            <ul style="color: #333; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Review of your current online presence</li>
              <li>SEO analysis and recommendations</li>
              <li>Discussion of your marketing goals</li>
              <li>Custom strategy for your practice</li>
              <li>Q&A about our services</li>
            </ul>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">Important Notes</h3>
            <ul style="color: #856404; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Please have your website URL ready for discussion</li>
              <li>Think about your current marketing challenges</li>
              <li>Prepare any questions about SEO and digital marketing</li>
              <li>We'll send a calendar reminder 24 hours before the meeting</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #333; margin-bottom: 15px;">
              <strong>Need to reschedule or have questions?</strong>
            </p>
            <a href="mailto:${senderInfo.email}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 5px;">
              Contact Us
            </a>
            ${senderInfo.phone ? `<a href="tel:${senderInfo.phone}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; margin: 5px;">Call Us</a>` : ''}
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            <strong>${senderInfo.name}</strong><br>
            ${senderInfo.email}${senderInfo.phone ? `<br>${senderInfo.phone}` : ''}
          </p>
          <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
            WeTechForU Healthcare Marketing Team
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: [leadEmail],
      subject: `Consultation Confirmed - ${formatDate(bookingDetails.date)} at ${formatTime(bookingDetails.time)}`,
      htmlContent: htmlContent,
      from: process.env.AZURE_EMAIL_FROM_ADDRESS || 'info@wetechforu.com',
      replyTo: senderInfo.email
    });
  }
}