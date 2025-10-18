import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import { http } from '../api/http';

// Static libraries array to prevent re-renders - removed visualization since we're using markers instead of heatmap
const GOOGLE_MAPS_LIBRARIES: ("drawing" | "geometry" | "localContext" | "places")[] = [];

interface Lead {
  id: number;
  company: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  distance_miles?: number;
}

interface PracticeLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
}

interface LeadHeatmapProps {
  clientId: number;
  practiceLocation?: PracticeLocation;
  onLeadsLoaded?: (leads: Lead[]) => void;
  radiusMiles?: number;
  startDate?: string;
  endDate?: string;
}

const LeadHeatmap: React.FC<LeadHeatmapProps> = ({ 
  clientId, 
  practiceLocation,
  onLeadsLoaded,
  radiusMiles = 10,
  startDate,
  endDate
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 33.2148, // Default to Aubrey, TX
    lng: -96.6331
  });
  const [mapZoom, setMapZoom] = useState(10);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState<boolean>(false);

  useEffect(() => {
    loadGoogleMapsApiKey();
    loadLeadsWithCoordinates();
    
    // Set map center to practice location if available
    if (practiceLocation) {
      setMapCenter({
        lat: practiceLocation.latitude,
        lng: practiceLocation.longitude
      });
      setMapZoom(12);
    }
  }, [clientId, practiceLocation, radiusMiles, startDate, endDate]);

  const loadGoogleMapsApiKey = async () => {
    try {
      const response = await http.get('/google-maps-api-key');
      if (response.data.success) {
        setGoogleMapsApiKey(response.data.apiKey);
      } else {
        console.error('Failed to load Google Maps API key:', response.data.error);
        setError('Failed to load Google Maps API key');
      }
    } catch (error) {
      console.error('Error loading Google Maps API key:', error);
      setError('Error loading Google Maps API key');
    }
  };

  const loadLeadsWithCoordinates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get Google Analytics leads with coordinates
      const leadsResponse = await http.get(`/analytics/leads/${clientId}`);
      const allLeads = leadsResponse.data.leads || [];
      
      // Filter only leads that have coordinates (geocoded)
      let leadsWithCoordinates = allLeads.filter((lead: any) => 
        lead.latitude && lead.longitude && lead.geocoding_status === 'completed'
      );
      
      // Apply date range filter if provided
      if (startDate && endDate) {
        const startFilterDate = new Date(startDate);
        const endFilterDate = new Date(endDate);
        leadsWithCoordinates = leadsWithCoordinates.filter((lead: any) => {
          const leadDate = new Date(lead.created_at);
          return leadDate >= startFilterDate && leadDate <= endFilterDate;
        });
      } else if (startDate) {
        // If only start date is provided, filter from start date to current date
        const startFilterDate = new Date(startDate);
        leadsWithCoordinates = leadsWithCoordinates.filter((lead: any) => {
          const leadDate = new Date(lead.created_at);
          return leadDate >= startFilterDate;
        });
      }
      
      // Apply radius filter if practice location is available
      if (practiceLocation && radiusMiles) {
        leadsWithCoordinates = leadsWithCoordinates.filter((lead: any) => {
          const distance = calculateDistance(
            practiceLocation.latitude,
            practiceLocation.longitude,
            lead.latitude,
            lead.longitude
          );
          return distance <= radiusMiles;
        });
      }
      
      setLeads(leadsWithCoordinates);
      
      if (onLeadsLoaded) {
        onLeadsLoaded(leadsWithCoordinates);
      }
      
      console.log(`🗺️ Loaded ${leadsWithCoordinates.length} Google Analytics leads with coordinates for heatmap (radius: ${radiusMiles} miles, date range: ${startDate || 'all'} to ${endDate || 'current'})`);
    } catch (error: any) {
      console.error('❌ Error loading Google Analytics leads for heatmap:', error);
      setError(error.response?.data?.error || 'Failed to load Google Analytics leads data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates in miles
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRadians = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  // Prepare heatmap data - only when Google Maps is loaded
  const heatmapData = leads.map(lead => ({
    lat: lead.latitude,
    lng: lead.longitude,
    weight: 1
  }));

  // If no Google Maps API key, show error
  if (!googleMapsApiKey) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🗺️</div>
        <div style={{ fontWeight: '600', marginBottom: '10px', color: '#dc3545' }}>
          Google Maps API Key Required
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Please configure REACT_APP_GOOGLE_MAPS_API_KEY to display the heatmap
        </div>
      </div>
    );
  }

  // If loading
  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⏳</div>
        <div style={{ fontWeight: '600', marginBottom: '10px' }}>
          Loading Lead Heatmap...
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Fetching lead coordinates and preparing map
        </div>
      </div>
    );
  }

  // If error
  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>❌</div>
        <div style={{ fontWeight: '600', marginBottom: '10px', color: '#dc3545' }}>
          Error Loading Heatmap
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          {error}
        </div>
        <button 
          onClick={loadLeadsWithCoordinates}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // If no leads with coordinates
  if (leads.length === 0) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>📍</div>
        <div style={{ fontWeight: '600', marginBottom: '10px' }}>
          No Lead Coordinates Available
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
          Leads need to be geocoded to display on the heatmap. 
          <br />
          Use the geocoding tools to convert addresses to coordinates.
        </div>
        <button 
          onClick={loadLeadsWithCoordinates}
          style={{
            background: '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Again
        </button>
      </div>
    );
  }

  // Render the heatmap
  // Don't render map until API key is loaded
  if (!googleMapsApiKey) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>🗺️</div>
        <div style={{ fontWeight: '600', marginBottom: '10px', color: '#007bff' }}>
          Loading Google Maps API
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Fetching API key and initializing map...
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
      <LoadScript
        googleMapsApiKey={googleMapsApiKey}
        libraries={GOOGLE_MAPS_LIBRARIES}
        onLoad={() => {
          console.log('🗺️ Google Maps API loaded successfully');
          setIsGoogleMapsLoaded(true);
        }}
        onError={(error) => {
          console.error('❌ Google Maps API failed to load:', error);
          setError('Failed to load Google Maps API');
          setIsGoogleMapsLoaded(false);
        }}
      >
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={mapCenter}
          zoom={mapZoom}
          options={{
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          }}
        >
         {/* Show clinic location marker */}
         {practiceLocation && isGoogleMapsLoaded && (() => {
           // Ensure lat/lng are numbers
           const lat = typeof practiceLocation.latitude === 'number' ? practiceLocation.latitude : parseFloat(practiceLocation.latitude);
           const lng = typeof practiceLocation.longitude === 'number' ? practiceLocation.longitude : parseFloat(practiceLocation.longitude);
           
           // Skip if invalid
           if (isNaN(lat) || isNaN(lng)) {
             console.warn(`⚠️ Invalid clinic coordinates: lat=${practiceLocation.latitude}, lng=${practiceLocation.longitude}`);
             return null;
           }
           
           return (
             <Marker
               position={{ lat, lng }}
               title={`${practiceLocation.city} Clinic`}
               icon={window.google && window.google.maps ? {
                 url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                 scaledSize: new window.google.maps.Size(40, 40)
               } : undefined}
             />
           );
         })()}
         
         {/* Show lead markers */}
         {leads.map((lead, index) => {
           // Ensure lat/lng are numbers
           const lat = typeof lead.latitude === 'number' ? lead.latitude : parseFloat(lead.latitude);
           const lng = typeof lead.longitude === 'number' ? lead.longitude : parseFloat(lead.longitude);
           
           // Skip invalid coordinates
           if (isNaN(lat) || isNaN(lng)) {
             console.warn(`⚠️ Invalid coordinates for lead ${lead.id}: lat=${lead.latitude}, lng=${lead.longitude}`);
             return null;
           }
           
           return (
             <Marker
               key={lead.id}
               position={{ lat, lng }}
               title={`${lead.company} - ${lead.city}, ${lead.state}`}
               icon={window.google && window.google.maps ? {
                 url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                 scaledSize: new window.google.maps.Size(30, 30)
               } : undefined}
             />
           );
         })}
        </GoogleMap>
      </LoadScript>
      
      {/* Lead Map Info */}
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        background: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>Lead Map Info:</strong> Showing {leads.length} leads with coordinates. 
        {practiceLocation && (
          <span> Practice location: {practiceLocation.address}, {practiceLocation.city}, {practiceLocation.state} (Red marker)</span>
        )}
        <br />
        <span style={{ fontSize: '11px', color: '#888' }}>
          🏥 Red marker = Clinic location | 📍 Blue markers = Lead locations
          {startDate && endDate && (
            <span> | 📅 Date range: {startDate} to {endDate}</span>
          )}
        </span>
      </div>
    </div>
  );
};

export default LeadHeatmap;
