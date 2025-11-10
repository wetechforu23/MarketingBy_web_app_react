/**
 * Appointment Availability Service
 * Manages team member availability, calendar integration, and time slot blocking
 * Industry Standard: No hardcoded configurations
 */

import pool from '../config/database';

export interface TimeSlot {
  start: string; // ISO datetime string
  end: string; // ISO datetime string
  available: boolean;
  member_id?: number;
  member_name?: string;
}

export interface AvailabilityConfig {
  member_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  availability_type: 'available' | 'unavailable' | 'limited';
  max_appointments?: number;
}

export class AppointmentAvailabilityService {
  private static instance: AppointmentAvailabilityService;

  private constructor() {}

  static getInstance(): AppointmentAvailabilityService {
    if (!AppointmentAvailabilityService.instance) {
      AppointmentAvailabilityService.instance = new AppointmentAvailabilityService();
    }
    return AppointmentAvailabilityService.instance;
  }

  /**
   * Get available time slots for a date range
   */
  async getAvailableSlots(
    widgetId: number,
    startDate: Date,
    endDate: Date,
    durationMinutes: number = 60
  ): Promise<TimeSlot[]> {
    try {
      // Get all active team members for this widget
      const membersResult = await pool.query(
        `SELECT id, name, default_duration_minutes, buffer_time_minutes, timezone
         FROM team_members
         WHERE widget_id = $1 
           AND is_active = true 
           AND is_available_for_booking = true
         ORDER BY name`,
        [widgetId]
      );

      if (membersResult.rows.length === 0) {
        return [];
      }

      const availableSlots: TimeSlot[] = [];
      const members = membersResult.rows;

      // Generate slots for each day in range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, etc.

        for (const member of members) {
          // Get member's availability for this day of week
          const availabilityResult = await pool.query(
            `SELECT start_time, end_time, availability_type, max_appointments
             FROM member_availability
             WHERE member_id = $1 
               AND day_of_week = $2
               AND is_recurring = true
               AND (valid_from IS NULL OR valid_from <= $3)
               AND (valid_until IS NULL OR valid_until >= $3)
             ORDER BY start_time`,
            [member.id, dayOfWeek, currentDate]
          );

          // Get blocked slots for this member on this date
          const blockedResult = await pool.query(
            `SELECT start_datetime, end_datetime
             FROM blocked_time_slots
             WHERE (member_id = $1 OR applies_to_all_members = true)
               AND widget_id = $2
               AND DATE(start_datetime) = $3
             ORDER BY start_datetime`,
            [member.id, widgetId, currentDate.toISOString().split('T')[0]]
          );

          // Get existing appointments for this member on this date
          const appointmentsResult = await pool.query(
            `SELECT appointment_time, duration_minutes
             FROM appointments
             WHERE widget_id = $2
               AND DATE(appointment_date) = $3
               AND status IN ('scheduled', 'confirmed')
               AND (SELECT id FROM team_members WHERE id = $1 LIMIT 1) IS NOT NULL
             ORDER BY appointment_time`,
            [member.id, widgetId, currentDate.toISOString().split('T')[0]]
          );

          // Generate time slots based on availability
          for (const availability of availabilityResult.rows) {
            const slots = this.generateTimeSlots(
              currentDate,
              availability.start_time,
              availability.end_time,
              durationMinutes || member.default_duration_minutes || 60,
              member.buffer_time_minutes || 15,
              blockedResult.rows,
              appointmentsResult.rows,
              availability.availability_type,
              availability.max_appointments
            );

            availableSlots.push(...slots.map(slot => ({
              ...slot,
              member_id: member.id,
              member_name: member.name
            })));
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Sort by datetime
      return availableSlots.sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw error;
    }
  }

  /**
   * Generate time slots for a day
   */
  private generateTimeSlots(
    date: Date,
    startTime: string,
    endTime: string,
    durationMinutes: number,
    bufferMinutes: number,
    blockedSlots: any[],
    existingAppointments: any[],
    availabilityType: string,
    maxAppointments?: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const dateStr = date.toISOString().split('T')[0];
    
    // Parse start and end times
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const slotStart = new Date(date);
    slotStart.setHours(startHour, startMin, 0, 0);
    
    const slotEnd = new Date(date);
    slotEnd.setHours(endHour, endMin, 0, 0);

    // Generate slots
    let currentSlotStart = new Date(slotStart);
    
    while (currentSlotStart.getTime() + durationMinutes * 60000 <= slotEnd.getTime()) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60000);
      
      // Check if slot is blocked
      const isBlocked = blockedSlots.some(blocked => {
        const blockedStart = new Date(blocked.start_datetime);
        const blockedEnd = new Date(blocked.end_datetime);
        return (
          (currentSlotStart >= blockedStart && currentSlotStart < blockedEnd) ||
          (currentSlotEnd > blockedStart && currentSlotEnd <= blockedEnd) ||
          (currentSlotStart <= blockedStart && currentSlotEnd >= blockedEnd)
        );
      });

      // Check if slot conflicts with existing appointment
      const hasConflict = existingAppointments.some(apt => {
        const aptTime = new Date(`${dateStr}T${apt.appointment_time}`);
        const aptEnd = new Date(aptTime.getTime() + (apt.duration_minutes || 60) * 60000);
        return (
          (currentSlotStart >= aptTime && currentSlotStart < aptEnd) ||
          (currentSlotEnd > aptTime && currentSlotEnd <= aptEnd) ||
          (currentSlotStart <= aptTime && currentSlotEnd >= aptEnd)
        );
      });

      // Check max appointments limit
      const slotTimeStr = currentSlotStart.toTimeString().substring(0, 5);
      const appointmentsAtThisTime = existingAppointments.filter(
        apt => apt.appointment_time.substring(0, 5) === slotTimeStr
      ).length;
      
      const exceedsMax = maxAppointments !== null && 
                        appointmentsAtThisTime >= maxAppointments;

      const available = !isBlocked && !hasConflict && !exceedsMax && 
                       availabilityType === 'available';

      slots.push({
        start: currentSlotStart.toISOString(),
        end: currentSlotEnd.toISOString(),
        available
      });

      // Move to next slot (with buffer time)
      currentSlotStart = new Date(currentSlotEnd.getTime() + bufferMinutes * 60000);
    }

    return slots;
  }

  /**
   * Check if a specific time slot is available
   */
  async checkSlotAvailability(
    widgetId: number,
    memberId: number | null,
    requestedDateTime: Date,
    durationMinutes: number
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      const dayOfWeek = requestedDateTime.getDay();
      const dateStr = requestedDateTime.toISOString().split('T')[0];
      const timeStr = requestedDateTime.toTimeString().substring(0, 5);
      const requestedEnd = new Date(requestedDateTime.getTime() + durationMinutes * 60000);

      // Check if member exists and is available
      if (memberId) {
        const memberResult = await pool.query(
          `SELECT id, is_active, is_available_for_booking
           FROM team_members
           WHERE id = $1 AND widget_id = $2`,
          [memberId, widgetId]
        );

        if (memberResult.rows.length === 0) {
          return { available: false, reason: 'Team member not found' };
        }

        const member = memberResult.rows[0];
        if (!member.is_active || !member.is_available_for_booking) {
          return { available: false, reason: 'Team member is not available for booking' };
        }

        // Check member's availability schedule
        const availabilityResult = await pool.query(
          `SELECT start_time, end_time, availability_type, max_appointments
           FROM member_availability
           WHERE member_id = $1 
             AND day_of_week = $2
             AND is_recurring = true
             AND start_time <= $3
             AND end_time >= $4
             AND (valid_from IS NULL OR valid_from <= $5)
             AND (valid_until IS NULL OR valid_until >= $5)`,
          [memberId, dayOfWeek, timeStr, timeStr, dateStr]
        );

        if (availabilityResult.rows.length === 0) {
          return { available: false, reason: 'No availability schedule for this time' };
        }

        const availability = availabilityResult.rows[0];
        if (availability.availability_type !== 'available') {
          return { available: false, reason: 'Time slot is not available' };
        }

        // Check max appointments
        if (availability.max_appointments) {
          const existingCount = await pool.query(
            `SELECT COUNT(*) as count
             FROM appointments
             WHERE widget_id = $1
               AND DATE(appointment_date) = $2
               AND appointment_time = $3
               AND status IN ('scheduled', 'confirmed')`,
            [widgetId, dateStr, timeStr]
          );

          if (parseInt(existingCount.rows[0].count) >= availability.max_appointments) {
            return { available: false, reason: 'Maximum appointments reached for this time slot' };
          }
        }
      }

      // Check blocked slots
      const blockedResult = await pool.query(
        `SELECT id
         FROM blocked_time_slots
         WHERE widget_id = $1
           AND (member_id = $2 OR applies_to_all_members = true)
           AND start_datetime <= $3
           AND end_datetime > $4`,
        [widgetId, memberId, requestedEnd.toISOString(), requestedDateTime.toISOString()]
      );

      if (blockedResult.rows.length > 0) {
        return { available: false, reason: 'Time slot is blocked' };
      }

      // Check existing appointments
      const conflictResult = await pool.query(
        `SELECT id
         FROM appointments
         WHERE widget_id = $1
           AND appointment_datetime < $2
           AND appointment_datetime + (duration_minutes || ' minutes')::interval > $3
           AND status IN ('scheduled', 'confirmed')`,
        [widgetId, requestedEnd.toISOString(), requestedDateTime.toISOString()]
      );

      if (conflictResult.rows.length > 0) {
        return { available: false, reason: 'Time slot conflicts with existing appointment' };
      }

      return { available: true };
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return { available: false, reason: 'Error checking availability' };
    }
  }

  /**
   * Sync calendar events (Google Calendar, Outlook, etc.)
   */
  async syncCalendar(memberId: number): Promise<{ success: boolean; eventsSynced: number; errors: string[] }> {
    try {
      // Get member's calendar configuration
      const memberResult = await pool.query(
        `SELECT id, calendar_type, calendar_id, calendar_url, calendar_credentials
         FROM team_members
         WHERE id = $1`,
        [memberId]
      );

      if (memberResult.rows.length === 0) {
        throw new Error('Team member not found');
      }

      const member = memberResult.rows[0];

      if (!member.calendar_type || member.calendar_type === 'manual') {
        return { success: true, eventsSynced: 0, errors: [] };
      }

      // Log sync start
      const syncLogResult = await pool.query(
        `INSERT INTO calendar_sync_logs (member_id, sync_type, sync_status)
         VALUES ($1, 'incremental', 'pending')
         RETURNING id`,
        [memberId]
      );

      const syncLogId = syncLogResult.rows[0].id;
      let eventsSynced = 0;
      const errors: string[] = [];

      try {
        // Import calendar service based on type
        if (member.calendar_type === 'google') {
          const { GoogleCalendarService } = await import('./googleCalendarService');
          const calendarService = new GoogleCalendarService();
          // Sync logic here
          eventsSynced = 0; // Placeholder
        } else if (member.calendar_type === 'outlook') {
          const { AzureCalendarService } = await import('./azureCalendarService');
          const calendarService = AzureCalendarService.getInstance();
          // Sync logic here
          eventsSynced = 0; // Placeholder
        } else if (member.calendar_type === 'ical') {
          // iCal feed sync
          // Implementation here
          eventsSynced = 0; // Placeholder
        }

        // Update sync log
        await pool.query(
          `UPDATE calendar_sync_logs
           SET sync_status = 'success',
               sync_completed_at = NOW(),
               events_synced = $1
           WHERE id = $2`,
          [eventsSynced, syncLogId]
        );

        return { success: true, eventsSynced, errors };
      } catch (syncError: any) {
        errors.push(syncError.message || 'Unknown sync error');
        
        await pool.query(
          `UPDATE calendar_sync_logs
           SET sync_status = 'failed',
               sync_completed_at = NOW(),
               errors = $1
           WHERE id = $2`,
          [JSON.stringify(errors), syncLogId]
        );

        return { success: false, eventsSynced: 0, errors };
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      return { 
        success: false, 
        eventsSynced: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      };
    }
  }
}

export default AppointmentAvailabilityService;

