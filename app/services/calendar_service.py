"""
Calendar Service for WeTechForU Healthcare Marketing Platform
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import os

logger = logging.getLogger(__name__)

class CalendarService:
    """Calendar service for appointment scheduling"""
    
    def __init__(self):
        # Calendar configuration
        self.calendar_id = os.getenv('GOOGLE_CALENDAR_ID', 'primary')
        self.timezone = os.getenv('TIMEZONE', 'America/New_York')
        
        # Sales team availability (in real implementation, this would come from Google Calendar)
        self.sales_team_availability = self.get_sales_team_availability()
        
        # Meeting duration
        self.meeting_duration_minutes = 30
        
    def get_sales_team_availability(self) -> Dict[str, List[Dict]]:
        """Get sales team availability (mock data for now)"""
        # In real implementation, this would fetch from Google Calendar API
        return {
            'monday': [
                {'start': '09:00', 'end': '17:00'}
            ],
            'tuesday': [
                {'start': '09:00', 'end': '17:00'}
            ],
            'wednesday': [
                {'start': '09:00', 'end': '17:00'}
            ],
            'thursday': [
                {'start': '09:00', 'end': '17:00'}
            ],
            'friday': [
                {'start': '09:00', 'end': '17:00'}
            ],
            'saturday': [],
            'sunday': []
        }
    
    def get_available_slots(self, date: str, duration_minutes: int = None) -> List[Dict]:
        """Get available appointment slots for a given date"""
        try:
            if duration_minutes is None:
                duration_minutes = self.meeting_duration_minutes
            
            # Parse date
            appointment_date = datetime.strptime(date, '%Y-%m-%d')
            day_name = appointment_date.strftime('%A').lower()
            
            # Get availability for the day
            day_availability = self.sales_team_availability.get(day_name, [])
            
            if not day_availability:
                return []
            
            available_slots = []
            
            for time_block in day_availability:
                start_time = datetime.strptime(f"{date} {time_block['start']}", '%Y-%m-%d %H:%M')
                end_time = datetime.strptime(f"{date} {time_block['end']}", '%Y-%m-%d %H:%M')
                
                current_time = start_time
                while current_time + timedelta(minutes=duration_minutes) <= end_time:
                    slot_end = current_time + timedelta(minutes=duration_minutes)
                    
                    # Check if slot is not in the past
                    if current_time > datetime.now():
                        available_slots.append({
                            'start_time': current_time.strftime('%H:%M'),
                            'end_time': slot_end.strftime('%H:%M'),
                            'datetime_start': current_time.isoformat(),
                            'datetime_end': slot_end.isoformat(),
                            'duration_minutes': duration_minutes
                        })
                    
                    current_time += timedelta(minutes=30)  # 30-minute intervals
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Error getting available slots for {date}: {e}")
            return []
    
    def book_appointment(self, appointment_data: Dict) -> Dict[str, any]:
        """Book an appointment"""
        try:
            # Validate appointment data
            required_fields = ['name', 'email', 'phone', 'date', 'time']
            for field in required_fields:
                if not appointment_data.get(field):
                    return {
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }
            
            # Check if slot is still available
            available_slots = self.get_available_slots(appointment_data['date'])
            requested_time = appointment_data['time']
            
            slot_available = any(
                slot['start_time'] == requested_time for slot in available_slots
            )
            
            if not slot_available:
                return {
                    'success': False,
                    'error': 'Requested time slot is no longer available'
                }
            
            # Create appointment record
            appointment = {
                'id': f"APT_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'name': appointment_data['name'],
                'email': appointment_data['email'],
                'phone': appointment_data['phone'],
                'date': appointment_data['date'],
                'time': appointment_data['time'],
                'duration_minutes': self.meeting_duration_minutes,
                'status': 'confirmed',
                'created_at': datetime.utcnow().isoformat(),
                'meeting_link': self.generate_meeting_link(appointment_data),
                'calendar_event_id': None  # Would be set when creating Google Calendar event
            }
            
            # In real implementation, create Google Calendar event
            # calendar_event = self.create_calendar_event(appointment)
            # appointment['calendar_event_id'] = calendar_event.get('id')
            
            logger.info(f"Appointment booked: {appointment['id']}")
            
            return {
                'success': True,
                'appointment': appointment,
                'message': 'Appointment booked successfully'
            }
            
        except Exception as e:
            logger.error(f"Error booking appointment: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_meeting_link(self, appointment_data: Dict) -> str:
        """Generate meeting link (Google Meet)"""
        # In real implementation, this would create a Google Meet link
        base_url = "https://meet.google.com"
        meeting_code = f"wetechforu-{appointment_data['date'].replace('-', '')}-{appointment_data['time'].replace(':', '')}"
        return f"{base_url}/{meeting_code}"
    
    def send_appointment_confirmation(self, appointment: Dict) -> Dict[str, any]:
        """Send appointment confirmation email"""
        try:
            from .email_service import EmailService
            
            email_service = EmailService()
            result = email_service.send_appointment_confirmation(appointment)
            
            return result
            
        except Exception as e:
            logger.error(f"Error sending appointment confirmation: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_appointment_status(self, appointment_id: str) -> Dict[str, any]:
        """Get appointment status"""
        try:
            # In real implementation, this would query the database
            # For now, return mock data
            return {
                'appointment_id': appointment_id,
                'status': 'confirmed',
                'message': 'Appointment is confirmed'
            }
            
        except Exception as e:
            logger.error(f"Error getting appointment status: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def cancel_appointment(self, appointment_id: str, reason: str = None) -> Dict[str, any]:
        """Cancel an appointment"""
        try:
            # In real implementation, this would update the database and Google Calendar
            logger.info(f"Appointment {appointment_id} cancelled. Reason: {reason}")
            
            return {
                'success': True,
                'message': 'Appointment cancelled successfully',
                'appointment_id': appointment_id,
                'cancelled_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error cancelling appointment: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_calendar_stats(self) -> Dict[str, any]:
        """Get calendar statistics"""
        try:
            # In real implementation, this would query the database
            return {
                'total_appointments_today': 3,
                'total_appointments_this_week': 15,
                'total_appointments_this_month': 65,
                'average_appointments_per_day': 2.5,
                'conversion_rate': '23%',
                'next_available_slot': '2025-01-03 09:00'
            }
            
        except Exception as e:
            logger.error(f"Error getting calendar stats: {e}")
            return {
                'total_appointments_today': 0,
                'total_appointments_this_week': 0,
                'total_appointments_this_month': 0,
                'error': str(e)
            }
