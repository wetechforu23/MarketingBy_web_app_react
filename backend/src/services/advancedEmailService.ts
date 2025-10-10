import pool from '../config/database';
import * as crypto from 'crypto';
import { MicrosoftGraphEmailService } from './microsoftGraphSEOEmailService';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

interface EmailTrackingData {
  emailId: string;
  leadId: number;
  trackingPixelUrl: string;
  trackedLinks: Map<string, string>;
}

export class AdvancedEmailService {
  private static instance: AdvancedEmailService;
  private trackingDomain: string = 'https://www.marketingby.wetechforu.com';

  private constructor() {}

  public static getInstance(): AdvancedEmailService {
    if (!AdvancedEmailService.instance) {
      AdvancedEmailService.instance = new AdvancedEmailService();
    }
    return AdvancedEmailService.instance;
  }

  /**
   * Get email templates for different scenarios
   */
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return [
      {
        id: 'basic_seo_followup',
        name: 'Basic SEO Report Follow-up',
        subject: '🚀 Your Free SEO Analysis Results - {company_name}',
        body: `Hi {contact_name},

I hope this email finds you well! I wanted to follow up on the SEO analysis we completed for {company_name}.

We discovered some key opportunities that could significantly improve your online visibility:

• Your website currently scores {seo_score}/100 for SEO performance
• {mobile_score}% mobile optimization score
• {broken_links_count} broken links affecting user experience
• {recommendations_count} actionable recommendations to improve rankings

The healthcare industry is incredibly competitive online, and 93% of patients start their search for healthcare providers on Google. This means every point of improvement in your SEO can translate to more patient inquiries and appointments.

I'd love to discuss these findings with you and show you exactly how we can help {company_name} rank higher and attract more patients.

Are you available for a quick 15-minute call this week? You can book a time that works for you here: {calendar_link}

Looking forward to helping you grow!

Best regards,
{sender_name}
WeTechForU Healthcare Marketing
{sender_phone}
{sender_email}`,
        category: 'seo'
      },
      {
        id: 'comprehensive_seo_followup',
        name: 'Comprehensive SEO Report Follow-up',
        subject: '📊 Complete Digital Marketing Analysis - {company_name}',
        body: `Hi {contact_name},

Thank you for taking the time to review the comprehensive SEO and competitive analysis we prepared for {company_name}.

Here's a quick summary of what we found:

📈 CURRENT PERFORMANCE:
• Overall SEO Score: {seo_score}/100
• Desktop Speed: {desktop_score}/100
• Mobile Speed: {mobile_score}/100
• Current Search Ranking: Not in top 50 for key healthcare terms

🎯 OPPORTUNITIES IDENTIFIED:
• {keyword_opportunities} high-value keywords you're missing
• {competitor_gap} areas where competitors are outranking you
• {backlink_potential} potential backlink sources
• {content_gaps} content topics that could drive traffic

💰 POTENTIAL IMPACT:
Based on our analysis, implementing our recommendations could:
✓ Increase organic traffic by 300-500%
✓ Generate 20-50 new patient leads per month
✓ Improve local search visibility by 10+ positions
✓ Establish {company_name} as the go-to healthcare provider in your area

I've attached a detailed action plan in the report. Would you like to schedule a strategy session to discuss how we can implement these changes?

Book your free consultation: {calendar_link}

Best regards,
{sender_name}
WeTechForU Healthcare Marketing
📞 {sender_phone}
📧 {sender_email}
🌐 www.marketingby.wetechforu.com`,
        category: 'seo'
      },
      {
        id: 'introduction',
        name: 'Introduction / First Contact',
        subject: 'Helping {company_name} Reach More Patients Online',
        body: `Hi {contact_name},

My name is {sender_name}, and I specialize in helping healthcare providers like {company_name} grow their practice through digital marketing.

I noticed that {company_name} has a great reputation in the community, but there might be opportunities to increase your online visibility and attract more patients through:

✓ Local SEO optimization (rank higher on Google Maps)
✓ Professional social media management
✓ Patient acquisition campaigns
✓ Review management and reputation building

Would you be open to a brief conversation about how we're helping other healthcare providers in your area increase their patient flow by 30-50%?

I'd be happy to provide a free analysis of your current online presence with no obligation.

Let me know if you'd like to connect!

Best regards,
{sender_name}
WeTechForU Healthcare Marketing
📞 {sender_phone}
📧 {sender_email}`,
        category: 'intro'
      },
      {
        id: 'pricing_discussion',
        name: 'Pricing & Service Packages',
        subject: 'Healthcare Marketing Packages for {company_name}',
        body: `Hi {contact_name},

Thank you for your interest in our healthcare marketing services!

I wanted to outline our service packages designed specifically for healthcare providers like {company_name}:

📦 BASIC SEO & CONTENT MARKETING - $399/month
✓ On-page SEO optimization
✓ 2 healthcare blog posts per month
✓ Google My Business optimization
✓ Monthly performance reports

📦 COMPLETE DIGITAL MARKETING - $799/month
✓ Everything in Basic, PLUS:
✓ Social media management (Facebook & Instagram)
✓ 6-8 posts + 8-10 stories per month
✓ Paid advertising management
✓ Advanced analytics and reporting

💰 ONE-TIME SETUP FEE: $150 (50% OFF - normally $300)
Includes: Platform setup, analytics configuration, competitor research, and initial optimization.

🎁 SPECIAL OFFER FOR {company_name}:
Sign up this week and receive:
• Setup fee at 50% off ($150 instead of $300)
• First month at 20% discount
• FREE competitor keyword analysis ($500 value)

Would you like to schedule a call to discuss which package would be the best fit for your goals?

Book a time here: {calendar_link}

Best regards,
{sender_name}
WeTechForU Healthcare Marketing`,
        category: 'pricing'
      },
      {
        id: 'meeting_reminder',
        name: 'Meeting Reminder',
        subject: 'Reminder: Our Call Tomorrow - {company_name}',
        body: `Hi {contact_name},

This is a friendly reminder about our scheduled call tomorrow to discuss digital marketing strategies for {company_name}.

📅 Meeting Details:
Date: {meeting_date}
Time: {meeting_time}
Duration: 30 minutes

We'll be discussing:
• Your current online presence analysis
• Customized growth strategies
• Service packages and pricing
• Next steps to get started

If you need to reschedule, you can do so here: {calendar_link}

Looking forward to speaking with you!

Best regards,
{sender_name}
WeTechForU Healthcare Marketing`,
        category: 'reminder'
      },
      {
        id: 'thank_you',
        name: 'Thank You / Post-Meeting',
        subject: 'Thank You - Next Steps for {company_name}',
        body: `Hi {contact_name},

Thank you for taking the time to speak with me today about {company_name}'s digital marketing needs.

As discussed, here's a quick recap of our conversation:

📌 KEY TAKEAWAYS:
{meeting_notes}

📋 NEXT STEPS:
1. Review the proposal I've attached
2. Let me know if you have any questions
3. We can start as early as next week!

💡 WHAT HAPPENS NEXT:
Once you're ready to move forward, we'll:
• Complete all platform setups within 3 business days
• Start with a comprehensive audit and baseline analysis
• Begin implementing strategies immediately
• Have our first performance review in 30 days

If you have any questions or need clarification on anything, please don't hesitate to reach out!

Best regards,
{sender_name}
WeTechForU Healthcare Marketing
📞 {sender_phone}
📧 {sender_email}`,
        category: 'followup'
      },
      {
        id: 'no_response_followup',
        name: 'No Response Follow-up',
        subject: 'Following Up - {company_name}',
        body: `Hi {contact_name},

I hope this email finds you well! I wanted to follow up on my previous email regarding digital marketing opportunities for {company_name}.

I understand you're busy running your practice, so I wanted to make this as easy as possible for you.

If you're interested in:
✓ Attracting more patients through local SEO
✓ Building a strong social media presence
✓ Getting more 5-star reviews
✓ Ranking higher on Google

I'd be happy to provide a free, no-obligation analysis of your current online presence.

No pressure at all - just reply with "INTERESTED" and I'll send over the details.

Best regards,
{sender_name}
WeTechForU Healthcare Marketing`,
        category: 'followup'
      },
      {
        id: 'custom',
        name: 'Custom Email (Blank Template)',
        subject: '',
        body: '',
        category: 'custom'
      }
    ];
  }

  /**
   * Send tracked email with open and click tracking
   */
  async sendTrackedEmail(params: {
    leadId: number;
    to: string;
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    template?: string;
    attachments?: any[];
    userId: number;
  }): Promise<{ success: boolean; emailId?: number; error?: string }> {
    try {
      // Generate unique email ID for tracking
      const emailId = crypto.randomBytes(16).toString('hex');

      // Process body with tracking
      const { trackedBody, trackedLinks } = await this.addEmailTracking(
        params.body,
        emailId,
        params.leadId
      );

      // Add tracking pixel (invisible 1x1 image)
      const trackingPixel = `<img src="${this.trackingDomain}/api/track/email/${emailId}/open" width="1" height="1" style="display:none;" />`;
      const finalBody = trackedBody + trackingPixel;

      // Send via Microsoft Graph
      const graphService = MicrosoftGraphEmailService.getInstance();
      
      try {
        await graphService.sendEmail(params.to, params.subject, finalBody);
      } catch (graphError) {
        console.error('Microsoft Graph failed:', graphError);
        throw graphError;
      }

      // Save to database
      const result = await pool.query(
        `INSERT INTO lead_emails 
         (lead_id, tracking_id, subject, body, status, sent_at, created_at, 
          to_email, cc_emails, bcc_emails, template_used, sent_by_user_id)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          params.leadId,
          emailId,
          params.subject,
          params.body, // Store original body without tracking
          'sent',
          params.to,
          params.cc ? JSON.stringify(params.cc) : null,
          params.bcc ? JSON.stringify(params.bcc) : null,
          params.template || null,
          params.userId
        ]
      );

      const dbEmailId = result.rows[0].id;

      // Save tracked links
      for (const [originalUrl, trackedUrl] of trackedLinks.entries()) {
        await pool.query(
          `INSERT INTO email_link_tracking 
           (email_id, original_url, tracking_url, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [dbEmailId, originalUrl, trackedUrl]
        );
      }

      // Log activity
      await pool.query(
        `INSERT INTO lead_activity 
         (lead_id, activity_type, activity_data, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          params.leadId,
          'email_sent',
          JSON.stringify({
            email_id: dbEmailId,
            tracking_id: emailId,
            subject: params.subject,
            template: params.template
          })
        ]
      );

      console.log(`✅ Tracked email sent to ${params.to}, tracking ID: ${emailId}`);

      return { success: true, emailId: dbEmailId };
    } catch (error) {
      console.error('Error sending tracked email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Add tracking to email body
   */
  private async addEmailTracking(
    body: string,
    emailId: string,
    leadId: number
  ): Promise<{ trackedBody: string; trackedLinks: Map<string, string> }> {
    const trackedLinks = new Map<string, string>();
    
    // Find all links in the body
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi;
    let trackedBody = body;
    let match;

    while ((match = linkRegex.exec(body)) !== null) {
      const originalUrl = match[1];
      
      // Skip tracking for unsubscribe links and tracking URLs
      if (originalUrl.includes('unsubscribe') || originalUrl.includes('/track/')) {
        continue;
      }

      // Generate tracking URL
      const trackingUrl = `${this.trackingDomain}/api/track/email/${emailId}/click?url=${encodeURIComponent(originalUrl)}`;
      
      trackedLinks.set(originalUrl, trackingUrl);
      
      // Replace original URL with tracking URL
      trackedBody = trackedBody.replace(
        `href="${originalUrl}"`,
        `href="${trackingUrl}"`
      );
    }

    return { trackedBody, trackedLinks };
  }

  /**
   * Grammar and spell check using basic rules
   */
  async checkGrammarAndSpelling(text: string): Promise<{
    correctedText: string;
    suggestions: Array<{ original: string; suggestion: string; type: string; position: number }>;
  }> {
    const suggestions: Array<{ original: string; suggestion: string; type: string; position: number }> = [];
    let correctedText = text;

    // Common spelling mistakes
    const commonMistakes: { [key: string]: string } = {
      'recieve': 'receive',
      'definately': 'definitely',
      'occured': 'occurred',
      'seperete': 'separate',
      'maintainance': 'maintenance',
      'acheive': 'achieve',
      'beleive': 'believe',
      'thier': 'their',
      'wierd': 'weird',
      'untill': 'until',
      'tommorrow': 'tomorrow',
      'greatful': 'grateful',
      'priviledge': 'privilege'
    };

    // Check for common mistakes
    for (const [wrong, correct] of Object.entries(commonMistakes)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      if (regex.test(correctedText)) {
        const match = correctedText.match(regex);
        if (match) {
          suggestions.push({
            original: wrong,
            suggestion: correct,
            type: 'spelling',
            position: correctedText.indexOf(match[0])
          });
          correctedText = correctedText.replace(regex, correct);
        }
      }
    }

    // Check for double spaces
    if (/  +/.test(correctedText)) {
      suggestions.push({
        original: '  ',
        suggestion: ' ',
        type: 'spacing',
        position: correctedText.indexOf('  ')
      });
      correctedText = correctedText.replace(/  +/g, ' ');
    }

    // Check for missing punctuation at end of sentences
    const lines = correctedText.split('\n');
    lines.forEach((line, index) => {
      if (line.trim().length > 10 && !/[.!?]$/.test(line.trim())) {
        suggestions.push({
          original: line.trim(),
          suggestion: line.trim() + '.',
          type: 'punctuation',
          position: correctedText.indexOf(line)
        });
      }
    });

    return { correctedText, suggestions };
  }

  /**
   * Replace template variables
   */
  replaceTemplateVariables(template: string, variables: { [key: string]: string }): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value || '');
    }

    return result;
  }

  /**
   * Get email statistics for a lead
   */
  async getEmailStatistics(leadId: number): Promise<any> {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as total_opened,
        COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as total_clicked,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as total_replied,
        MAX(sent_at) as last_sent,
        MAX(opened_at) as last_opened
       FROM lead_emails
       WHERE lead_id = $1`,
      [leadId]
    );

    return result.rows[0];
  }
}

export default AdvancedEmailService;

