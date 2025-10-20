import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, LoadScript } from '@react-google-maps/api';
import { http } from '../api/http';

// Static libraries array to prevent re-renders
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
    lat: 33.2148,
    lng: -96.6331
  });
  const [mapZoom, setMapZoom] = useState(10);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string>('');
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState<boolean>(false);
  const [hoveredLeadId, setHoveredLeadId] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fetch Google Maps API key
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await http.get('/google-maps-api-key');
        if (response.data && response.data.apiKey) {
          setGoogleMapsApiKey(response.data.apiKey);
        }
      } catch (error) {
        console.error('Failed to fetch Google Maps API key:', error);
        setError('Failed to load Google Maps API key');
      }
    };
    fetchApiKey();
  }, []);

  // Load leads with coordinates
  const loadLeadsWithCoordinates = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await http.get(`/analytics/leads/${clientId}`);
      const allLeads = response.data.leads || [];

      // Filter leads with coordinates
      let leadsWithCoordinates = allLeads.filter((lead: any) => {
        const hasCoords = lead.latitude && lead.longitude && lead.geocoding_status === 'completed';
        return hasCoords;
      });

      // Apply radius filter
      if (practiceLocation && radiusMiles && practiceLocation.latitude && practiceLocation.longitude) {
        leadsWithCoordinates = leadsWithCoordinates.filter((lead: any) => {
          const distance = calculateDistance(
            practiceLocation.latitude,
            practiceLocation.longitude,
            parseFloat(lead.latitude),
            parseFloat(lead.longitude)
          );
          return distance <= radiusMiles;
        });
      }

      // Apply date filter
      if (startDate && endDate) {
        leadsWithCoordinates = leadsWithCoordinates.filter((lead: any) => {
          if (!lead.created_at) return true;
          const leadDate = new Date(lead.created_at).toISOString().split('T')[0];
          return leadDate >= startDate && leadDate <= endDate;
        });
      }

      setLeads(leadsWithCoordinates);
      
      if (onLeadsLoaded) {
        onLeadsLoaded(leadsWithCoordinates);
      }

      // Update map center to practice location or first lead
      if (practiceLocation && practiceLocation.latitude && practiceLocation.longitude) {
        setMapCenter({
          lat: parseFloat(practiceLocation.latitude as any),
          lng: parseFloat(practiceLocation.longitude as any)
        });
      } else if (leadsWithCoordinates.length > 0) {
        const firstLead = leadsWithCoordinates[0];
        setMapCenter({
          lat: parseFloat(firstLead.latitude),
          lng: parseFloat(firstLead.longitude)
        });
      }

    } catch (err) {
      console.error('Error loading leads:', err);
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadsWithCoordinates();
  }, [clientId, radiusMiles, startDate, endDate]);

  if (loading) {
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
          Loading Lead Map
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Fetching geocoded leads...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#fff3cd', 
        borderRadius: '8px',
        border: '1px solid #ffc107'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
        <div style={{ fontWeight: '600', marginBottom: '10px', color: '#856404' }}>
          Error Loading Map
        </div>
        <div style={{ fontSize: '14px', color: '#856404' }}>
          {error}
        </div>
      </div>
    );
  }

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
    <div style={{ width: '100%' }}>
      {/* Side-by-Side Layout: Map + Lead Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px', 
        gap: '15px',
        '@media (max-width: 1024px)': {
          gridTemplateColumns: '1fr'
        }
      }}>
        
        {/* Map Section */}
        <div style={{ 
          borderRadius: '8px', 
          overflow: 'hidden',
          border: '1px solid #dee2e6',
          background: '#fff',
          minHeight: '600px'
        }}>
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
              mapContainerStyle={{ width: '100%', height: '600px' }}
              center={mapCenter}
              zoom={mapZoom}
              options={{
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true,
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
              {/* Clinic Location Marker */}
              {practiceLocation && isGoogleMapsLoaded && (() => {
                const lat = parseFloat(practiceLocation.latitude as any);
                const lng = parseFloat(practiceLocation.longitude as any);
                
                if (isNaN(lat) || isNaN(lng)) return null;
                
                // Simplified clinic marker - using standard red marker
                return (
                  <Marker
                    position={{ lat, lng }}
                    title={`🏥 ${practiceLocation.city} Clinic - ${practiceLocation.address}`}
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                      scaledSize: { width: 40, height: 40 }
                    }}
                    zIndex={9999}
                  />
                );
              })()}
              
              {/* Lead Markers */}
              {leads.map((lead, index) => {
                let lat = typeof lead.latitude === 'number' ? lead.latitude : parseFloat(lead.latitude);
                let lng = typeof lead.longitude === 'number' ? lead.longitude : parseFloat(lead.longitude);
                
                if (isNaN(lat) || isNaN(lng)) return null;
                
                // Consistent offset based on lead ID to prevent stacking
                const offset = 0.0002;
                const seed = lead.id * 1000;
                lat += ((seed % 100) / 100 - 0.5) * offset;
                lng += (((seed * 7) % 100) / 100 - 0.5) * offset;
                
                const isHovered = hoveredLeadId === lead.id;
                const isSelected = selectedLeadId === lead.id;
                
                // Use different marker colors based on state
                const markerUrl = isSelected 
                  ? 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'
                  : isHovered 
                  ? 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                  : 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
                
                const markerSize = isHovered || isSelected ? 35 : 30;
                
                return (
                  <Marker
                    key={lead.id}
                    position={{ lat, lng }}
                    title={`${lead.company || 'Lead'} - ${lead.city}, ${lead.state}`}
                    icon={{
                      url: markerUrl,
                      scaledSize: { width: markerSize, height: markerSize }
                    }}
                    onClick={() => {
                      setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id);
                      setMapCenter({ lat, lng });
                      setMapZoom(13);
                    }}
                    onMouseOver={() => setHoveredLeadId(lead.id)}
                    onMouseOut={() => setHoveredLeadId(null)}
                    zIndex={isHovered || isSelected ? 1000 : 100}
                  />
                );
              })}
            </GoogleMap>
          </LoadScript>
        </div>
        
        {/* Lead Cards Section */}
        <div style={{ 
          maxHeight: '600px', 
          overflowY: 'auto',
          background: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          padding: '15px'
        }}>
          <div style={{ 
            position: 'sticky',
            top: '-15px',
            background: '#f8f9fa',
            padding: '10px 0',
            marginBottom: '10px',
            borderBottom: '2px solid #dee2e6',
            zIndex: 10
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                display: 'inline-block',
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                color: 'white',
                textAlign: 'center',
                lineHeight: '32px',
                fontSize: '18px'
              }}>
                📍
              </span>
              <div>
                <div style={{ fontWeight: '600' }}>Nearby Leads</div>
                <div style={{ fontSize: '11px', color: '#666', fontWeight: 'normal' }}>
                  {leads.length} within {radiusMiles} miles
                </div>
              </div>
            </h3>
          </div>
          
          {leads.length === 0 ? (
            <div style={{ 
              padding: '40px 20px', 
              textAlign: 'center', 
              color: '#999'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
                No leads found
              </div>
              <div style={{ fontSize: '12px' }}>
                Try adjusting the radius or date range
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {leads.map((lead, index) => {
                const isHovered = hoveredLeadId === lead.id;
                const isSelected = selectedLeadId === lead.id;
                
                return (
                  <div
                    key={lead.id}
                    style={{
                      background: isSelected ? '#fef3c7' : isHovered ? '#dbeafe' : '#ffffff',
                      border: isSelected ? '2px solid #f59e0b' : isHovered ? '2px solid #3b82f6' : '1px solid #dee2e6',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isHovered || isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                    }}
                    onMouseEnter={() => setHoveredLeadId(lead.id)}
                    onMouseLeave={() => setHoveredLeadId(null)}
                    onClick={() => {
                      setSelectedLeadId(lead.id === selectedLeadId ? null : lead.id);
                      // Center map on selected lead
                      const lat = typeof lead.latitude === 'number' ? lead.latitude : parseFloat(lead.latitude);
                      const lng = typeof lead.longitude === 'number' ? lead.longitude : parseFloat(lead.longitude);
                      if (!isNaN(lat) && !isNaN(lng)) {
                        setMapCenter({ lat, lng });
                        setMapZoom(13);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isSelected ? '#f59e0b' : isHovered ? '#3b82f6' : '#6366f1',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '14px', 
                          color: '#333',
                          marginBottom: '4px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {lead.company || 'Unknown Company'}
                        </div>
                        
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666',
                          marginBottom: '6px'
                        }}>
                          📍 {lead.city}, {lead.state}
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          flexWrap: 'wrap',
                          alignItems: 'center'
                        }}>
                          {lead.distance_miles !== undefined && (
                            <span style={{
                              padding: '3px 8px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              📏 {lead.distance_miles.toFixed(1)} mi
                            </span>
                          )}
                          
                          <span style={{
                            padding: '3px 8px',
                            background: '#f3e8ff',
                            color: '#6b21a8',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500'
                          }}>
                            📊 GA
                          </span>
                          
                          {lead.created_at && (
                            <span style={{
                              fontSize: '10px',
                              color: '#999'
                            }}>
                              {new Date(lead.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Map Legend */}
      <div style={{ 
        marginTop: '15px', 
        padding: '12px 15px', 
        background: '#ffffff', 
        borderRadius: '6px',
        border: '1px solid #dee2e6',
        fontSize: '12px'
      }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#EA4335', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '2px solid white' }}></div>
            <span style={{ fontSize: '11px', color: '#666' }}>🏥 Clinic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#6366f1', borderRadius: '50%', border: '2px solid white' }}></div>
            <span style={{ fontSize: '11px', color: '#666' }}>📍 Lead</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#3b82f6', borderRadius: '50%', border: '2px solid white' }}></div>
            <span style={{ fontSize: '11px', color: '#666' }}>Hover</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '16px', background: '#f59e0b', borderRadius: '50%', border: '2px solid white' }}></div>
            <span style={{ fontSize: '11px', color: '#666' }}>Selected</span>
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>
            <strong>{leads.length} leads</strong> · {radiusMiles} mi radius
            {startDate && endDate && ` · ${startDate} to ${endDate}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadHeatmap;
