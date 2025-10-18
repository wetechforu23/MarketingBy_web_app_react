import React, { useState, useEffect } from 'react';
import { GoogleMap, HeatmapLayer, LoadScript } from '@react-google-maps/api';
import { http } from '../api/http';

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
}

const LeadHeatmap: React.FC<LeadHeatmapProps> = ({ 
  clientId, 
  practiceLocation,
  onLeadsLoaded 
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
  }, [clientId, practiceLocation]);

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
      
      const response = await http.get(`/geocoding/leads/${clientId}`);
      
      if (response.data.success) {
        const leadsData = response.data.data;
        setLeads(leadsData);
        
        if (onLeadsLoaded) {
          onLeadsLoaded(leadsData);
        }
        
        console.log(`🗺️ Loaded ${leadsData.length} leads with coordinates for heatmap`);
      } else {
        setError('Failed to load leads data');
      }
    } catch (error: any) {
      console.error('❌ Error loading leads for heatmap:', error);
      setError(error.response?.data?.error || 'Failed to load leads data');
    } finally {
      setLoading(false);
    }
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
  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden' }}>
      <LoadScript
        googleMapsApiKey={googleMapsApiKey}
        libraries={['visualization']}
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
          <HeatmapLayer
            data={heatmapData.map(location => new window.google.maps.LatLng(location.lat, location.lng))}
            options={{
              radius: 20,
              opacity: 0.6,
              gradient: [
                'rgba(0, 255, 255, 0)',
                'rgba(0, 255, 255, 1)',
                'rgba(0, 191, 255, 1)',
                'rgba(0, 127, 255, 1)',
                'rgba(0, 63, 255, 1)',
                'rgba(0, 0, 255, 1)',
                'rgba(0, 0, 223, 1)',
                'rgba(0, 0, 191, 1)',
                'rgba(0, 0, 159, 1)',
                'rgba(0, 0, 127, 1)',
                'rgba(63, 0, 91, 1)',
                'rgba(127, 0, 63, 1)',
                'rgba(191, 0, 31, 1)',
                'rgba(255, 0, 0, 1)'
              ]
            }}
          />
        </GoogleMap>
      </LoadScript>
      
      {/* Heatmap Info */}
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        background: '#f8f9fa', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>Heatmap Info:</strong> Showing {leads.length} leads with coordinates. 
        {practiceLocation && (
          <span> Practice location: {practiceLocation.city}, {practiceLocation.state}</span>
        )}
      </div>
    </div>
  );
};

export default LeadHeatmap;
