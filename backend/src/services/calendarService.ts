import axios from 'axios';

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  leadId?: number;
  clientId?: number;
  meetingType?: 'consultation' | 'follow-up' | 'presentation' | 'other';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookingRequest {
  leadId?: number;
  clientId?: number;
  title: string;
  description?: string;
  preferredDate: string;
  preferredTime: string;
  duration: number; // in minutes
  meetingType: 'consultation' | 'follow-up' | 'presentation' | 'other';
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
}

export class CalendarService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.GOOGLE_CALENDAR_API_URL || 'https://www.googleapis.com/calendar/v3';
    this.apiKey = process.env.GOOGLE_CALENDAR_API_KEY || '';
  }

  /**
   * Check if Google Calendar API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: CalendarEvent): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar API is not configured');
    }

    try {
      const calendarEvent = {
        summary: event.title,
        description: event.description || '',
        start: {
          dateTime: event.startTime,
          timeZone: 'America/Chicago'
        },
        end: {
          dateTime: event.endTime,
          timeZone: 'America/Chicago'
        },
        location: event.location || '',
        attendees: event.attendees?.map(email => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 }
          ]
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/calendars/primary/events`,
        calendarEvent,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * Get calendar events for a date range
   */
  async getEvents(startDate: string, endDate: string): Promise<any[]> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar API is not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/calendars/primary/events`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          params: {
            timeMin: startDate,
            timeMax: endDate,
            singleEvents: true,
            orderBy: 'startTime'
          }
        }
      );

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar API is not configured');
    }

    try {
      const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: event.startTime ? {
          dateTime: event.startTime,
          timeZone: 'America/Chicago'
        } : undefined,
        end: event.endTime ? {
          dateTime: event.endTime,
          timeZone: 'America/Chicago'
        } : undefined,
        location: event.location,
        attendees: event.attendees?.map(email => ({ email })) || []
      };

      // Remove undefined values
      Object.keys(calendarEvent).forEach(key => {
        if (calendarEvent[key] === undefined) {
          delete calendarEvent[key];
        }
      });

      const response = await axios.put(
        `${this.baseUrl}/calendars/primary/events/${eventId}`,
        calendarEvent,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar API is not configured');
    }

    try {
      await axios.delete(
        `${this.baseUrl}/calendars/primary/events/${eventId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  /**
   * Get available time slots for booking
   */
  async getAvailableSlots(date: string, duration: number = 60): Promise<string[]> {
    try {
      // For now, return mock available slots since Google Calendar API requires OAuth
      // In production, you would implement proper Google Calendar integration
      const startOfDay = new Date(date);
      startOfDay.setHours(9, 0, 0, 0); // 9 AM
      
      const endOfDay = new Date(date);
      endOfDay.setHours(17, 0, 0, 0); // 5 PM

      // Generate available slots (every hour from 9 AM to 5 PM)
      const availableSlots: string[] = [];
      const current = new Date(startOfDay);

      while (current < endOfDay) {
        availableSlots.push(new Date(current).toISOString());
        current.setHours(current.getHours() + 1);
      }

      return availableSlots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Process a booking request
   */
  async processBookingRequest(booking: BookingRequest): Promise<any> {
    try {
      // For now, we'll create a mock booking since we don't have Google Calendar fully configured
      const event: CalendarEvent = {
        title: booking.title,
        description: booking.description || '',
        startTime: new Date(`${booking.preferredDate}T${booking.preferredTime}`).toISOString(),
        endTime: new Date(new Date(`${booking.preferredDate}T${booking.preferredTime}`).getTime() + booking.duration * 60000).toISOString(),
        meetingType: booking.meetingType,
        leadId: booking.leadId,
        clientId: booking.clientId,
        notes: booking.notes,
        status: 'scheduled',
        attendees: [booking.contactEmail]
      };

      // In a real implementation, you would:
      // 1. Check availability
      // 2. Create the calendar event
      // 3. Send confirmation email
      // 4. Store in database

      return {
        success: true,
        eventId: `mock-${Date.now()}`,
        event: event,
        message: 'Booking request processed successfully'
      };
    } catch (error) {
      console.error('Error processing booking request:', error);
      throw error;
    }
  }
}


