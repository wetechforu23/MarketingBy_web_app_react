import express from 'express';
import { EmailService } from '../services/emailService';

const router = express.Router();
const emailService = new EmailService();

// Test email endpoint - send test email
router.post('/send-test', async (req, res) => {
  try {
    const { to, subject, message } = req.body;
    
    const testEmail = to || 'viral.tarpara@hotmail.com';
    const testSubject = subject || '🧪 Test Email from WeTechForU Marketing Platform';
    const testMessage = message || 'This is a test email to verify the email service is working correctly.';
    
    console.log(`📧 Sending test email to: ${testEmail}`);
    
    const success = await emailService.sendEmail({
      to: testEmail,
      from: '"WeTechForU Team" <info@wetechforu.com>',
      subject: testSubject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Email Service Working!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              ${testMessage}
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <h3 style="margin: 0 0 10px 0; color: #667eea;">📊 Email Service Details:</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                <li style="padding: 5px 0;">✅ Microsoft Graph API: Active</li>
                <li style="padding: 5px 0;">✅ Azure Email Service: Configured</li>
                <li style="padding: 5px 0;">✅ SMTP Fallback: Available</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If you received this email, the email notification system is working perfectly!
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
              <p style="font-size: 12px; color: #999; margin: 0;">
                Sent from <strong>WeTechForU Marketing Platform</strong><br>
                Test performed on ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      `,
      text: `${testMessage}\n\nEmail Service Working!\n\nSent from WeTechForU Marketing Platform\nTest performed on ${new Date().toLocaleString()}`
    });
    
    if (success) {
      console.log(`✅ Test email sent successfully to ${testEmail}`);
      res.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`❌ Failed to send test email to ${testEmail}`);
      res.status(500).json({
        success: false,
        error: 'Failed to send test email',
        message: 'Check server logs for details'
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send visitor engagement test email
router.post('/send-visitor-engagement', async (req, res) => {
  try {
    const { to, widgetName, visitorName, minutesOnSite } = req.body;
    
    const recipient = to || 'viral.tarpara@hotmail.com';
    const widget = widgetName || 'WeTechForU Chat Widget';
    const visitor = visitorName || 'Test Visitor';
    const minutes = minutesOnSite || 5;
    
    console.log(`📧 Sending visitor engagement email to: ${recipient}`);
    
    const success = await emailService.sendEmail({
      to: recipient,
      from: `"${widget} - Visitor Alert" <info@wetechforu.com>`,
      subject: `🔔 New Visitor Alert: ${visitor} spent ${minutes}+ minutes on your site!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4682B4;">🎯 High-Interest Visitor Alert!</h2>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4682B4;">
            <h3 style="margin: 0 0 15px 0; color: #0c4a6e;">📊 Visitor Details:</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${visitor}</p>
            <p style="margin: 5px 0;"><strong>Time on Site:</strong> ${minutes} minutes</p>
            <p style="margin: 5px 0;"><strong>Widget:</strong> ${widget}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #22c55e; font-weight: bold;">🟢 Currently Active</span></p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            This visitor has shown <strong>high interest</strong> in your services by spending ${minutes}+ minutes on your website. 
            This is a great opportunity to engage!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://marketingby.wetechforu.com/app/chat-conversations" 
               style="display: inline-block; background: #4682B4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Conversation →
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>💡 Pro Tip:</strong> Visitors who spend 5+ minutes are 3x more likely to convert. 
              Consider reaching out to offer assistance!
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            You're receiving this because email notifications are enabled for "${widget}".<br>
            <a href="https://marketingby.wetechforu.com/app/chat-widgets" style="color: #4682B4;">Manage notification settings</a>
          </p>
        </div>
      `,
      text: `🎯 High-Interest Visitor Alert!

${visitor} has spent ${minutes}+ minutes on your website!

Visitor Details:
- Name: ${visitor}
- Time on Site: ${minutes} minutes  
- Widget: ${widget}
- Status: 🟢 Currently Active

This visitor has shown high interest in your services. This is a great opportunity to engage!

View conversation: https://marketingby.wetechforu.com/app/chat-conversations

💡 Pro Tip: Visitors who spend 5+ minutes are 3x more likely to convert.

---
You're receiving this because email notifications are enabled for "${widget}".
Manage settings: https://marketingby.wetechforu.com/app/chat-widgets`
    });
    
    if (success) {
      console.log(`✅ Visitor engagement email sent successfully to ${recipient}`);
      res.json({
        success: true,
        message: `Visitor engagement email sent successfully to ${recipient}`,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error(`❌ Failed to send visitor engagement email to ${recipient}`);
      res.status(500).json({
        success: false,
        error: 'Failed to send email'
      });
    }
  } catch (error) {
    console.error('Visitor engagement email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

