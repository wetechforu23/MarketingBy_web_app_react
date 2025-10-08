import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

export interface CalendarEvent {
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  body?: {
    contentType: string;
    content: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    type: string;
  }>;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  isAvailable: boolean;
}

export class AzureCalendarService {
  private graphClient: Client;
  private credential: ClientSecretCredential;

  constructor() {
    // Initialize Azure credentials
    this.credential = new ClientSecretCredential(
      process.env.AZURE_TENANT_ID!,
      process.env.AZURE_CLIENT_ID!,
      process.env.AZURE_CLIENT_SECRET!
    );

    // Create Graph client with custom authentication provider
    this.graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await this.credential.getToken('https://graph.microsoft.com/.default');
          return tokenResponse?.token || '';
        }
      }
    });
  }

  async getAvailableSlots(
    startDate: Date,
    endDate: Date,
    durationMinutes: number = 60
  ): Promise<AvailableSlot[]> {
    try {
      // Get calendar events for the date range
      const events = await this.graphClient
        .api('/me/calendar/events')
        .filter(`start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`)
        .get();

      // Generate time slots
      const slots: AvailableSlot[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate < endDate) {
        // Skip weekends (optional - customize as needed)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
          // Generate slots for business hours (9 AM to 5 PM)
          for (let hour = 9; hour < 17; hour++) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, 0, 0, 0);
            
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

            // Check if this slot conflicts with existing events
            const isAvailable = !this.hasConflict(slotStart, slotEnd, events.value);

            slots.push({
              start: slotStart,
              end: slotEnd,
              isAvailable
            });
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw new Error('Failed to get available calendar slots');
    }
  }

  async createEvent(event: CalendarEvent): Promise<any> {
    try {
      const createdEvent = await this.graphClient
        .api('/me/calendar/events')
        .post(event);

      return createdEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async getCalendarEvents(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const events = await this.graphClient
        .api('/me/calendar/events')
        .filter(`start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`)
        .get();

      return events.value;
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw new Error('Failed to get calendar events');
    }
  }

  async checkAvailability(
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    try {
      const events = await this.graphClient
        .api('/me/calendar/events')
        .filter(`start/dateTime ge '${startTime.toISOString()}' and end/dateTime le '${endTime.toISOString()}'`)
        .get();

      return events.value.length === 0;
    } catch (error) {
      console.error('Error checking availability:', error);
      return false;
    }
  }

  private hasConflict(slotStart: Date, slotEnd: Date, events: any[]): boolean {
    return events.some(event => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);
      
      return (
        (slotStart >= eventStart && slotStart < eventEnd) ||
        (slotEnd > eventStart && slotEnd <= eventEnd) ||
        (slotStart <= eventStart && slotEnd >= eventEnd)
      );
    });
  }

  async scheduleConsultation(
    clientEmail: string,
    clientName: string,
    startTime: Date,
    endTime: Date,
    notes?: string
  ): Promise<any> {
    try {
      // Check if the time slot is available
      const isAvailable = await this.checkAvailability(startTime, endTime);
      
      if (!isAvailable) {
        throw new Error('Selected time slot is not available');
      }

      const event: CalendarEvent = {
        subject: `WeTechForU Consultation with ${clientName}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Chicago' // Adjust timezone as needed
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Chicago'
        },
        location: {
          displayName: 'Online Meeting (Link to be provided)'
        },
        body: {
          contentType: 'HTML',
          content: `
            <p>Healthcare Marketing Consultation</p>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            <p>Meeting link will be provided closer to the appointment time.</p>
          `
        },
        attendees: [
          {
            emailAddress: {
              address: clientEmail,
              name: clientName
            },
            type: 'required'
          }
        ]
      };

      const createdEvent = await this.createEvent(event);
      
      return {
        success: true,
        eventId: createdEvent.id,
        event: createdEvent
      };
    } catch (error) {
      console.error('Error scheduling consultation:', error);
      throw new Error(`Failed to schedule consultation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUpcomingAppointments(days: number = 7): Promise<any[]> {
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const events = await this.getCalendarEvents(startDate, endDate);
      
      return events.filter(event => 
        event.attendees && 
        event.attendees.some((attendee: any) => 
          attendee.emailAddress.address !== process.env.AZURE_EMAIL_FROM_ADDRESS
        )
      );
    } catch (error) {
      console.error('Error getting upcoming appointments:', error);
      return [];
    }
  }
}
