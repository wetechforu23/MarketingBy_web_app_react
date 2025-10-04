import { useState, useEffect } from 'react';
import { api } from '../api/http';

interface AvailableSlot {
  start: string;
  end: string;
  isAvailable: boolean;
}

export default function CalendarPage() {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientEmail: 'viral.tarpara@hotmail.com',
    websiteUrl: 'https://www.promedhca.com',
    notes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    loadAvailableSlots();
  }, []);

  const loadAvailableSlots = async () => {
    setLoading(true);
    setError('');

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14); // Next 2 weeks

      const response = await api.get('/compliance/available-slots', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });

      setAvailableSlots(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load available slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setBookingSuccess(false);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSlot) {
      setError('Please select a time slot');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const response = await api.post('/compliance/schedule-consultation-slot', {
        clientEmail: bookingForm.clientEmail,
        clientName: bookingForm.clientName,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        websiteUrl: bookingForm.websiteUrl,
        complianceScore: 0,
        notes: bookingForm.notes
      });

      if (response.data.success) {
        setBookingSuccess(true);
        setSelectedSlot(null);
        setBookingForm({
          clientName: '',
          clientEmail: 'viral.tarpara@hotmail.com',
          websiteUrl: 'https://www.promedhca.com',
          notes: ''
        });
        // Reload available slots
        loadAvailableSlots();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to book consultation');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const groupSlotsByDate = (slots: AvailableSlot[]) => {
    const grouped: { [key: string]: AvailableSlot[] } = {};
    
    slots.forEach(slot => {
      const date = new Date(slot.start).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });

    return grouped;
  };

  const groupedSlots = groupSlotsByDate(availableSlots.filter(slot => slot.isAvailable));

  return (
    <div style={{ padding: '20px' }}>
      <h1>📅 Schedule Consultation</h1>
      
      <div style={{ 
        background: 'rgba(46, 134, 171, 0.1)', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Available Time Slots</h3>
        <p>Select a convenient time for your healthcare marketing consultation.</p>
        <p><strong>Email:</strong> {bookingForm.clientEmail}</p>
        <p><strong>Website:</strong> {bookingForm.websiteUrl}</p>
      </div>

      {error && (
        <div style={{ 
          background: '#f8d7da', 
          color: '#721c24', 
          padding: '12px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          ⚠️ {error}
        </div>
      )}

      {bookingSuccess && (
        <div style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '12px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          ✅ Consultation booked successfully! You will receive a calendar invite via email.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ 
            border: '3px solid rgba(46, 134, 171, 0.3)', 
            borderTop: '3px solid var(--primary)', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p>Loading available slots...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Available Slots */}
          <div>
            <h3>Available Time Slots</h3>
            {Object.keys(groupedSlots).length === 0 ? (
              <p>No available slots found. Please try a different date range.</p>
            ) : (
              Object.entries(groupedSlots).map(([date, slots]) => (
                <div key={date} style={{ marginBottom: '20px' }}>
                  <h4 style={{ 
                    background: 'var(--primary)', 
                    color: 'white', 
                    padding: '10px', 
                    borderRadius: '8px 8px 0 0',
                    margin: 0
                  }}>
                    {formatDate(date)}
                  </h4>
                  <div style={{ 
                    border: '1px solid #ddd', 
                    borderTop: 'none', 
                    borderRadius: '0 0 8px 8px',
                    padding: '10px'
                  }}>
                    {slots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleSlotSelect(slot)}
                        style={{
                          background: selectedSlot?.start === slot.start ? 'var(--primary)' : 'white',
                          color: selectedSlot?.start === slot.start ? 'white' : 'var(--primary)',
                          border: '1px solid var(--primary)',
                          padding: '8px 12px',
                          margin: '4px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        {formatTime(slot.start)} - {formatTime(slot.end)}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Booking Form */}
          <div>
            <h3>Book Consultation</h3>
            {selectedSlot ? (
              <div style={{ 
                background: '#e8f5e8', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <h4>Selected Time Slot</h4>
                <p><strong>Date:</strong> {formatDate(selectedSlot.start)}</p>
                <p><strong>Time:</strong> {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}</p>
              </div>
            ) : (
              <div style={{ 
                background: '#fff3cd', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '20px' 
              }}>
                <p>Please select a time slot from the left to book your consultation.</p>
              </div>
            )}

            <form onSubmit={handleBookingSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Your Name *
                </label>
                <input
                  type="text"
                  value={bookingForm.clientName}
                  onChange={(e) => setBookingForm({...bookingForm, clientName: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter your full name"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={bookingForm.clientEmail}
                  onChange={(e) => setBookingForm({...bookingForm, clientEmail: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter your email address"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Website URL
                </label>
                <input
                  type="url"
                  value={bookingForm.websiteUrl}
                  onChange={(e) => setBookingForm({...bookingForm, websiteUrl: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter your website URL"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  placeholder="Any specific topics you'd like to discuss..."
                />
              </div>

              <button
                type="submit"
                disabled={!selectedSlot || bookingLoading}
                style={{
                  background: selectedSlot ? 'var(--primary)' : '#ccc',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: selectedSlot ? 'pointer' : 'not-allowed',
                  width: '100%'
                }}
              >
                {bookingLoading ? (
                  <>
                    <div style={{ 
                      display: 'inline-block',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      animation: 'spin 1s linear infinite',
                      marginRight: '8px'
                    }}></div>
                    Booking...
                  </>
                ) : (
                  'Book Consultation'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
