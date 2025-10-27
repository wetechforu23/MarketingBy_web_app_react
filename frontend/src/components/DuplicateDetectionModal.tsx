import React, { useState } from 'react';

interface Duplicate {
  id: number;
  company?: string;
  client_name?: string;
  email: string;
  phone?: string;
  status?: string;
  match_field: string;
  created_at: string;
  converted_to_client_id?: number;
  converted_client_name?: string;
  location_count?: number;
  is_primary_location?: boolean;
  location_name?: string;
}

interface DuplicateDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'lead' | 'client';
  duplicates: Duplicate[];
  newEntityData: {
    company?: string;
    client_name?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    location_name?: string;
  };
  onResolve: (action: 'merge' | 'separate' | 'location', selectedDuplicateId?: number, locationName?: string) => void;
}

const DuplicateDetectionModal: React.FC<DuplicateDetectionModalProps> = ({
  isOpen,
  onClose,
  entityType,
  duplicates,
  newEntityData,
  onResolve
}) => {
  const [selectedAction, setSelectedAction] = useState<'merge' | 'separate' | 'location' | null>(null);
  const [selectedDuplicateId, setSelectedDuplicateId] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!selectedAction) {
      alert('Please select an action');
      return;
    }

    if (selectedAction === 'merge' && !selectedDuplicateId) {
      alert('Please select which duplicate to merge with');
      return;
    }

    if (selectedAction === 'location' && !selectedDuplicateId) {
      alert('Please select the parent client');
      return;
    }

    if (selectedAction === 'location' && !locationName.trim()) {
      alert('Please enter a location name');
      return;
    }

    onResolve(selectedAction, selectedDuplicateId || undefined, locationName);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px 12px 0 0'
        }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fas fa-exclamation-triangle"></i>
            Potential Duplicate Detected!
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '14px' }}>
            A {entityType} with the same email already exists in the system
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* New Entity Info */}
          <div style={{
            background: '#f5f5f5',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            borderLeft: '4px solid #2196f3'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#2196f3' }}>
              <i className="fas fa-plus-circle"></i> New {entityType === 'lead' ? 'Lead' : 'Client'} You're Creating:
            </h3>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>{newEntityData.company || newEntityData.client_name}</strong>
            </p>
            <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
              📧 {newEntityData.email}
            </p>
            {newEntityData.phone && (
              <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                📞 {newEntityData.phone}
              </p>
            )}
            {newEntityData.location_name && (
              <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                📍 Location: {newEntityData.location_name}
              </p>
            )}
          </div>

          {/* Existing Duplicates */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '16px', color: '#ff9800', marginTop: 0 }}>
              <i className="fas fa-database"></i> Found {duplicates.length} Existing {entityType === 'lead' ? 'Lead(s)' : 'Client(s)'}:
            </h3>
            
            {duplicates.map((duplicate, index) => (
              <div
                key={duplicate.id}
                style={{
                  background: selectedDuplicateId === duplicate.id ? '#fff3e0' : 'white',
                  border: `2px solid ${selectedDuplicateId === duplicate.id ? '#ff9800' : '#e0e0e0'}`,
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedDuplicateId(duplicate.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="radio"
                    checked={selectedDuplicateId === duplicate.id}
                    onChange={() => setSelectedDuplicateId(duplicate.id)}
                    style={{ width: '20px', height: '20px' }}
                  />
                  <strong>{duplicate.company || duplicate.client_name}</strong>
                  {duplicate.is_primary_location && (
                    <span style={{
                      background: '#4caf50',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      PRIMARY
                    </span>
                  )}
                  {duplicate.status && (
                    <span style={{
                      background: duplicate.status === 'converted' ? '#4caf50' : '#9e9e9e',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {duplicate.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                  📧 {duplicate.email}
                  <span style={{
                    background: '#ff9800',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    marginLeft: '8px',
                    fontWeight: '600'
                  }}>
                    MATCH
                  </span>
                </p>
                {duplicate.phone && (
                  <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                    📞 {duplicate.phone}
                  </p>
                )}
                {duplicate.location_name && (
                  <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#666' }}>
                    📍 {duplicate.location_name}
                  </p>
                )}
                {duplicate.location_count !== undefined && duplicate.location_count > 0 && (
                  <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#2196f3', fontWeight: '600' }}>
                    <i className="fas fa-map-marker-alt"></i> Has {duplicate.location_count} additional location(s)
                  </p>
                )}
                {duplicate.converted_client_name && (
                  <p style={{ margin: '0.25rem 0', fontSize: '14px', color: '#4caf50', fontWeight: '600' }}>
                    ✅ Converted to: {duplicate.converted_client_name}
                  </p>
                )}
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '12px', color: '#999' }}>
                  Created: {new Date(duplicate.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Action Selection */}
          <div style={{
            background: '#e3f2fd',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '2px solid #2196f3'
          }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#1976d2' }}>
              <i className="fas fa-tasks"></i> What would you like to do?
            </h3>

            {/* Option 1: Add as additional location */}
            {entityType === 'client' && (
              <div
                style={{
                  background: selectedAction === 'location' ? 'white' : 'transparent',
                  border: `2px solid ${selectedAction === 'location' ? '#4caf50' : 'transparent'}`,
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  cursor: 'pointer'
                }}
                onClick={() => setSelectedAction('location')}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '0.75rem' }}>
                  <input
                    type="radio"
                    name="action"
                    value="location"
                    checked={selectedAction === 'location'}
                    onChange={() => setSelectedAction('location')}
                    style={{ marginTop: '4px', width: '20px', height: '20px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '15px', color: '#4caf50' }}>
                      <i className="fas fa-map-marker-alt"></i> Add as Additional Location
                    </strong>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', color: '#666' }}>
                      Create this as another location for the existing client (same company, different address)
                    </p>
                    {selectedAction === 'location' && (
                      <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '14px' }}>
                          Location Name: <span style={{ color: 'red' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={locationName}
                          onChange={(e) => setLocationName(e.target.value)}
                          placeholder="e.g., Downtown Office, North Branch, etc."
                          required
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '2px solid #e0e0e0',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}

            {/* Option 2: Create as separate */}
            <div
              style={{
                background: selectedAction === 'separate' ? 'white' : 'transparent',
                border: `2px solid ${selectedAction === 'separate' ? '#2196f3' : 'transparent'}`,
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedAction('separate')}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '0.75rem' }}>
                <input
                  type="radio"
                  name="action"
                  value="separate"
                  checked={selectedAction === 'separate'}
                  onChange={() => setSelectedAction('separate')}
                  style={{ marginTop: '4px', width: '20px', height: '20px' }}
                />
                <div>
                  <strong style={{ fontSize: '15px', color: '#2196f3' }}>
                    <i className="fas fa-plus-circle"></i> Create as Separate Entity
                  </strong>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', color: '#666' }}>
                    Allow duplicate email (same person but different company/context)
                  </p>
                </div>
              </label>
            </div>

            {/* Option 3: Merge/Skip */}
            <div
              style={{
                background: selectedAction === 'merge' ? 'white' : 'transparent',
                border: `2px solid ${selectedAction === 'merge' ? '#ff9800' : 'transparent'}`,
                padding: '1rem',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedAction('merge')}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', gap: '0.75rem' }}>
                <input
                  type="radio"
                  name="action"
                  value="merge"
                  checked={selectedAction === 'merge'}
                  onChange={() => setSelectedAction('merge')}
                  style={{ marginTop: '4px', width: '20px', height: '20px' }}
                />
                <div>
                  <strong style={{ fontSize: '15px', color: '#ff9800' }}>
                    <i className="fas fa-ban"></i> Skip / Use Existing
                  </strong>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '14px', color: '#666' }}>
                    Don't create new {entityType}, this is a duplicate of an existing one
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#9e9e9e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAction || (selectedAction === 'merge' && !selectedDuplicateId) || (selectedAction === 'location' && (!selectedDuplicateId || !locationName.trim()))}
            style={{
              padding: '0.75rem 1.5rem',
              background: !selectedAction || (selectedAction === 'merge' && !selectedDuplicateId) || (selectedAction === 'location' && (!selectedDuplicateId || !locationName.trim())) ? '#ccc' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: !selectedAction || (selectedAction === 'merge' && !selectedDuplicateId) || (selectedAction === 'location' && (!selectedDuplicateId || !locationName.trim())) ? 'not-allowed' : 'pointer'
            }}
          >
            <i className="fas fa-check"></i> Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateDetectionModal;

