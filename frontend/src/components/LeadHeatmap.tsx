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
  created_at?: string;
  source?: string;
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
      
      console.log(`📊 Total leads fetched: ${allLeads.length}`);
      if (allLeads.length > 0) {
        console.log(`📊 Sample lead data:`, allLeads[0]);
      }
      
      // Filter only leads that have coordinates (geocoded)
      let leadsWithCoordinates = allLeads.filter((lead: any) => {
        const hasLat = lead.latitude !== null && lead.latitude !== undefined && lead.latitude !== '';
        const hasLng = lead.longitude !== null && lead.longitude !== undefined && lead.longitude !== '';
        const hasStatus = lead.geocoding_status === 'completed';
        const hasCoords = hasLat && hasLng && hasStatus;
        
        if (!hasCoords) {
          console.log(`🚫 Filtering out lead ${lead.id}: lat=${lead.latitude} (${typeof lead.latitude}), lng=${lead.longitude} (${typeof lead.longitude}), status=${lead.geocoding_status}`);
        } else {
          console.log(`✅ Keeping lead ${lead.id}: lat=${lead.latitude}, lng=${lead.longitude}, status=${lead.geocoding_status}`);
        }
        return hasCoords;
      });
      
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
      console.log(`🗺️ Practice location:`, practiceLocation);
      console.log(`🗺️ Radius filter: ${radiusMiles} miles`);
      
      if (practiceLocation && radiusMiles && practiceLocation.latitude && practiceLocation.longitude) {
        console.log(`🗺️ Applying radius filter: ${radiusMiles} miles from (${practiceLocation.latitude}, ${practiceLocation.longitude})`);
        const beforeFilter = leadsWithCoordinates.length;
        leadsWithCoordinates = leadsWithCoordinates.filter((lead: any) => {
          const distance = calculateDistance(
            practiceLocation.latitude,
            practiceLocation.longitude,
            parseFloat(lead.latitude),
            parseFloat(lead.longitude)
          );
          console.log(`🗺️ Lead ${lead.id} distance: ${distance.toFixed(2)} miles (${distance <= radiusMiles ? '✅ KEEP' : '❌ FILTER OUT'})`);
          return distance <= radiusMiles;
        });
        console.log(`🗺️ Radius filter result: ${beforeFilter} leads → ${leadsWithCoordinates.length} leads`);
      } else {
        console.log(`⚠️ Skipping radius filter - practiceLocation is null or incomplete`);
      }
      
      // Convert string coordinates to numbers for all leads
      const leadsWithNumberCoords = leadsWithCoordinates.map((lead: any) => ({
        ...lead,
        latitude: parseFloat(lead.latitude),
        longitude: parseFloat(lead.longitude)
      }));
      
      setLeads(leadsWithNumberCoords);
      
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
            // Smooth transitions when filtering
            gestureHandling: 'cooperative',
            clickableIcons: false,
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
           
           console.log(`🏥 Rendering RED clinic marker at: (${lat}, ${lng}) - ${practiceLocation.city}, ${practiceLocation.state}`);
           
           return (
             <Marker
               position={{ lat, lng }}
               title={`🏥 ${practiceLocation.city} Clinic - ${practiceLocation.address}`}
               icon={window.google && window.google.maps ? {
                 path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                 fillColor: '#EA4335',
                 fillOpacity: 1,
                 strokeColor: '#ffffff',
                 strokeWeight: 3,
                 scale: 8,
                 rotation: 180
               } : undefined}
               label={window.google && window.google.maps ? {
                 text: '🏥',
                 fontSize: '18px'
               } : undefined}
               zIndex={9999}
             />
           );
         })()}
         
         {/* Show lead markers */}
         {leads.map((lead, index) => {
           // Ensure lat/lng are numbers
           let lat = typeof lead.latitude === 'number' ? lead.latitude : parseFloat(lead.latitude);
           let lng = typeof lead.longitude === 'number' ? lead.longitude : parseFloat(lead.longitude);
           
           // Skip invalid coordinates
           if (isNaN(lat) || isNaN(lng)) {
             console.warn(`⚠️ Invalid coordinates for lead ${lead.id}: lat=${lead.latitude}, lng=${lead.longitude}`);
             return null;
           }
           
           // Add CONSISTENT small offset for stacked markers using lead.id as seed
           // This keeps the same position on re-render instead of random jumping
           const offset = 0.0003;
           const seed = lead.id * 1000; // Use lead ID as seed for consistent offset
           const latOffset = ((seed % 100) / 100 - 0.5) * offset;
           const lngOffset = (((seed * 7) % 100) / 100 - 0.5) * offset;
           lat += latOffset;
           lng += lngOffset;
           
           return (
             <Marker
               key={lead.id}
               position={{ lat, lng }}
               title={`Lead #${index + 1}: ${lead.company || 'Unknown'} - ${lead.city}, ${lead.state}`}
               label={window.google && window.google.maps ? {
                 text: String(index + 1),
                 color: 'white',
                 fontSize: '11px',
                 fontWeight: 'bold'
               } : undefined}
               icon={window.google && window.google.maps ? {
                 path: window.google.maps.SymbolPath.CIRCLE,
                 fillColor: '#4285F4',
                 fillOpacity: 0.9,
                 strokeColor: '#ffffff',
                 strokeWeight: 2,
                 scale: 10
               } : undefined}
             />
           );
         })}
        </GoogleMap>
      </LoadScript>
      
      {/* Lead Map Legend */}
      <div style={{ 
        marginTop: '10px', 
        padding: '12px', 
        background: '#ffffff', 
        borderRadius: '6px',
        border: '1px solid #dee2e6',
        fontSize: '12px',
        color: '#333'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>Map Legend</div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: '#EA4335', 
              borderRadius: '50% 50% 50% 0', 
              transform: 'rotate(-45deg)',
              border: '2px solid white'
            }}></div>
            <span style={{ fontSize: '11px', color: '#666' }}>🏥 Clinic Location</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              background: '#4285F4', 
              borderRadius: '50%',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '8px',
              color: 'white',
              fontWeight: 'bold'
            }}>1</div>
            <span style={{ fontSize: '11px', color: '#666' }}>📍 Leads (numbered)</span>
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>
            Showing <strong>{leads.length} leads</strong> within <strong>{radiusMiles} miles</strong>
          </div>
          {startDate && endDate && (
            <div style={{ fontSize: '11px', color: '#888' }}>
              📅 {startDate} to {endDate}
            </div>
          )}
        </div>
        {practiceLocation && (
          <div style={{ fontSize: '10px', color: '#999', marginTop: '6px' }}>
            Practice: {practiceLocation.address}, {practiceLocation.city}, {practiceLocation.state}
          </div>
        )}
      </div>

      {/* Lead Details Table */}
      <div style={{ 
        marginTop: '15px', 
        background: '#ffffff', 
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        overflow: 'hidden'
      }}>
        <div style={{ 
          padding: '15px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          📊 Lead Details ({leads.length} leads)
        </div>
        
        {leads.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#999',
            fontSize: '14px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
            <div>No leads found matching the current filters</div>
            <div style={{ fontSize: '12px', marginTop: '5px' }}>
              Try adjusting the radius or date range
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>#</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Company</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Location</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Coordinates</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Distance</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Source</th>
                  <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#333' }}>Date Captured</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, index) => (
                  <tr 
                    key={lead.id} 
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ 
                        display: 'inline-block',
                        width: '24px',
                        height: '24px',
                        background: '#4285F4',
                        borderRadius: '50%',
                        color: 'white',
                        textAlign: 'center',
                        lineHeight: '24px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px', fontWeight: '500', color: '#333' }}>
                      {lead.company || 'Unknown'}
                    </td>
                    <td style={{ padding: '12px 15px', color: '#666' }}>
                      {lead.city}, {lead.state}
                    </td>
                    <td style={{ padding: '12px 15px', color: '#666', fontSize: '11px', fontFamily: 'monospace' }}>
                      {typeof lead.latitude === 'number' ? lead.latitude.toFixed(4) : parseFloat(lead.latitude).toFixed(4)}, 
                      {typeof lead.longitude === 'number' ? lead.longitude.toFixed(4) : parseFloat(lead.longitude).toFixed(4)}
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      {lead.distance_miles !== undefined ? (
                        <span style={{ 
                          padding: '4px 8px', 
                          background: '#e3f2fd', 
                          color: '#1976d2', 
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {lead.distance_miles.toFixed(1)} mi
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontSize: '11px' }}>N/A</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 15px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        background: '#f3e5f5', 
                        color: '#7b1fa2', 
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500'
                      }}>
                        Google Analytics
                      </span>
                    </td>
                    <td style={{ padding: '12px 15px', color: '#666', fontSize: '12px' }}>
                      {new Date((lead as any).created_at || Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadHeatmap;
