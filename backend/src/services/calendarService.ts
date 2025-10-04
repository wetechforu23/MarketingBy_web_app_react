import { google } from 'googleapis';
import ical from 'ical-generator';
import { EmailService } from './emailService';
import { AzureCalendarService } from './azureCalendarService';

export interface CalendarEvent {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  reminder?: number; // minutes before event
}

export class CalendarService {
  private emailService: EmailService;
  private azureCalendarService: AzureCalendarService | null = null;

  constructor() {
    this.emailService = new EmailService();
    
    // Try to initialize Azure calendar service
    try {
      if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
        this.azureCalendarService = new AzureCalendarService();
        console.log('Azure Calendar Service initialized successfully');
      }
    } catch (error) {
      console.warn('Azure Calendar Service not available:', error);
    }
  }

  async createGoogleCalendarEvent(event: CalendarEvent): Promise<string | null> {
    try {
      const auth = new google.auth.OAuth2(
        process.env.CALENDAR_CLIENT_ID,
        process.env.CALENDAR_CLIENT_SECRET,
        process.env.CALENDAR_REDIRECT_URI
      );

      // For demo purposes, we'll create a calendar invite via email
      // In production, you would use the Google Calendar API with proper OAuth flow
      return await this.createCalendarInvite(event);
    } catch (error) {
      console.error('Google Calendar event creation error:', error);
      return null;
    }
  }

  async createCalendarInvite(event: CalendarEvent): Promise<string> {
    try {
      // Create iCal event
      const cal = ical({
        name: 'WeTechForU Meeting',
        timezone: 'America/Chicago' // Texas timezone
      });

      cal.createEvent({
        start: event.startTime,
        end: event.endTime,
        summary: event.title,
        description: event.description,
        location: event.location || 'Online Meeting',
        organizer: {
          name: 'WeTechForU Team',
          email: process.env.ADMIN_EMAIL || 'viral.tarpara@hotmail.com'
        },
        attendees: event.attendees.map(email => ({
          email,
          name: email.split('@')[0]
        })),
        alarms: []
      });

      // Generate iCal content
      const icalContent = cal.toString();

      // Send calendar invite via email
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E86AB;">📅 Calendar Invitation</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>${event.title}</h3>
            <p><strong>Date:</strong> ${event.startTime.toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${event.startTime.toLocaleTimeString()} - ${event.endTime.toLocaleTimeString()}</p>
            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
            <p><strong>Description:</strong></p>
            <p>${event.description}</p>
          </div>

          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>📎 Calendar File Attached</strong></p>
            <p>Please find the calendar invitation attached to this email. You can add it to your calendar by:</p>
            <ul>
              <li>Opening the attached .ics file</li>
              <li>Your calendar application will automatically import the event</li>
              <li>Or save the file and import it manually</li>
            </ul>
          </div>

          <p>We look forward to meeting with you!</p>
          <p>Best regards,<br>The WeTechForU Team</p>
        </div>
      `;

      const success = await this.emailService.sendEmail({
        to: event.attendees,
        subject: `Calendar Invitation: ${event.title}`,
        html
      });

      if (success) {
        console.log('Calendar invite sent successfully');
        return 'Calendar invite sent successfully';
      } else {
        throw new Error('Failed to send calendar invite');
      }
    } catch (error) {
      console.error('Calendar invite creation error:', error);
      throw error;
    }
  }

  async scheduleConsultation(
    clientEmail: string,
    clientName: string,
    websiteUrl: string,
    complianceScore: number
  ): Promise<boolean> {
    try {
      const now = new Date();
      const meetingTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      const endTime = new Date(meetingTime.getTime() + 60 * 60 * 1000); // 1 hour duration

      // Try Azure calendar service first if available
      if (this.azureCalendarService) {
        try {
          const result = await this.azureCalendarService.scheduleConsultation(
            clientEmail,
            clientName,
            meetingTime,
            endTime,
            `Healthcare Marketing Consultation for ${websiteUrl} (Compliance Score: ${complianceScore}/100)`
          );
          
          if (result.success) {
            console.log('Consultation scheduled successfully via Azure Calendar');
            return true;
          }
        } catch (error) {
          console.warn('Azure calendar scheduling failed, falling back to email invite:', error);
        }
      }

      // Fallback to email calendar invite
      const event: CalendarEvent = {
        title: `WeTechForU Consultation - ${clientName}`,
        description: `
          Healthcare Marketing Consultation
          
          Client: ${clientName}
          Website: ${websiteUrl}
          Compliance Score: ${complianceScore}/100
          
          Agenda:
          - Review compliance analysis
          - Discuss marketing strategy
          - SEO recommendations
          - Next steps
          
          Please come prepared with any questions about your healthcare marketing needs.
        `,
        startTime: meetingTime,
        endTime: endTime,
        location: 'Online Meeting (Zoom link will be provided)',
        attendees: [clientEmail, process.env.ADMIN_EMAIL || 'viral.tarpara@hotmail.com'],
        reminder: 15 // 15 minutes before
      };

      const result = await this.createCalendarInvite(event);
      return !!result;
    } catch (error) {
      console.error('Schedule consultation error:', error);
      return false;
    }
  }

  async getAvailableSlots(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      if (this.azureCalendarService) {
        return await this.azureCalendarService.getAvailableSlots(startDate, endDate);
      }
      
      // Fallback: return mock available slots
      const slots = [];
      const currentDate = new Date(startDate);
      
      while (currentDate < endDate) {
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Skip weekends
          for (let hour = 9; hour < 17; hour++) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, 0, 0, 0);
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + 60);

            slots.push({
              start: slotStart,
              end: slotEnd,
              isAvailable: true
            });
          }
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return slots;
    } catch (error) {
      console.error('Get available slots error:', error);
      return [];
    }
  }

  async sendFollowUpReminder(
    clientEmail: string,
    clientName: string,
    meetingTime: Date
  ): Promise<boolean> {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E86AB;">📅 Meeting Reminder</h2>
          
          <p>Hello ${clientName},</p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3>⏰ Upcoming Meeting</h3>
            <p><strong>Date:</strong> ${meetingTime.toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${meetingTime.toLocaleTimeString()}</p>
            <p><strong>Duration:</strong> 1 hour</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Meeting Preparation:</h3>
            <ul>
              <li>Review your compliance report</li>
              <li>Prepare questions about your marketing strategy</li>
              <li>Have your website analytics ready</li>
              <li>Think about your marketing goals</li>
            </ul>
          </div>

          <p>We're excited to discuss your healthcare marketing strategy!</p>
          <p>Best regards,<br>The WeTechForU Team</p>
        </div>
      `;

      return await this.emailService.sendEmail({
        to: clientEmail,
        subject: `Meeting Reminder - WeTechForU Consultation`,
        html
      });
    } catch (error) {
      console.error('Send follow-up reminder error:', error);
      return false;
    }
  }
}
