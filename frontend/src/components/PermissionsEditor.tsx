import React, { useState, useEffect } from 'react';
import { http } from '../api/http';

interface PermissionsEditorProps {
  permissions: any;
  onChange: (permissions: any) => void;
}

export default function PermissionsEditor({ permissions, onChange }: PermissionsEditorProps) {
  const [allPermissions, setAllPermissions] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAllPermissions();
  }, []);

  const fetchAllPermissions = async () => {
    try {
      const response = await http.get('/users/permissions/all');
      setAllPermissions(response.data.permissions);
      // Auto-expand all sections for better UX
      const sections = Object.keys(response.data.permissions);
      setExpandedSections(new Set(sections));
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const togglePermission = (section: string, key: string) => {
    const updated = {
      ...permissions,
      [section]: {
        ...(permissions[section] || {}),
        [key]: !(permissions[section]?.[key] || false),
      },
    };
    onChange(updated);
  };

  const toggleAllInSection = (section: string, value: boolean) => {
    if (!allPermissions) return;
    
    const updated = { ...permissions };
    updated[section] = {};
    
    Object.keys(allPermissions[section]).forEach(key => {
      updated[section][key] = value;
    });
    
    onChange(updated);
  };

  const getSectionIcon = (section: string) => {
    const icons: { [key: string]: string } = {
      pages: '📄',
      leads: '👥',
      users: '👤',
      reports: '📊',
      clients: '🏢',
      seo: '🔍',
      analytics: '📈',
      email: '📧',
      settings: '⚙️',
      database: '💾',
      system: '🔧',
    };
    return icons[section] || '📋';
  };

  const getSectionTitle = (section: string) => {
    const titles: { [key: string]: string } = {
      pages: 'Page Access',
      leads: 'Leads Management',
      users: 'User Management',
      reports: 'Reports & Analytics',
      clients: 'Client Management',
      seo: 'SEO Tools',
      analytics: 'Analytics & Tracking',
      email: 'Email & Communication',
      settings: 'Settings & Configuration',
      database: 'Database Table Access',
      system: 'System Administration',
    };
    return titles[section] || section;
  };

  const formatPermissionLabel = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase());
  };

  if (!allPermissions) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <i className="fas fa-spinner fa-spin me-2"></i>
        Loading permissions...
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px', marginBottom: '1.5rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #4682B4'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', margin: 0 }}>
          🔐 Granular Permissions
        </h3>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Check boxes to grant access to specific features
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        padding: '16px',
        border: '1px solid #dee2e6',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {Object.keys(allPermissions).map((section) => {
          const sectionPerms = allPermissions[section];
          const currentSectionPerms = permissions[section] || {};
          const isExpanded = expandedSections.has(section);
          const allChecked = Object.keys(sectionPerms).every(key => currentSectionPerms[key] === true);
          const someChecked = Object.keys(sectionPerms).some(key => currentSectionPerms[key] === true);

          return (
            <div 
              key={section} 
              style={{
                marginBottom: '12px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                overflow: 'hidden'
              }}
            >
              {/* Section Header */}
              <div 
                onClick={() => toggleSection(section)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: someChecked ? '#e7f3ff' : '#f8f9fa',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: isExpanded ? '1px solid #dee2e6' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '20px' }}>{getSectionIcon(section)}</span>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#2c3e50' }}>
                    {getSectionTitle(section)}
                  </span>
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#666',
                    backgroundColor: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #dee2e6'
                  }}>
                    {Object.keys(sectionPerms).length} permissions
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllInSection(section, true);
                    }}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    title="Grant all permissions in this section"
                  >
                    ✓ All
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllInSection(section, false);
                    }}
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                    title="Remove all permissions in this section"
                  >
                    ✗ None
                  </button>
                  <i 
                    className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}
                    style={{ color: '#666', fontSize: '12px' }}
                  ></i>
                </div>
              </div>

              {/* Section Content */}
              {isExpanded && (
                <div style={{ padding: '16px' }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.keys(sectionPerms).map((key) => {
                      const isChecked = currentSectionPerms[key] === true;
                      return (
                        <label
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            backgroundColor: isChecked ? '#e7f3ff' : '#f8f9fa',
                            borderRadius: '6px',
                            border: `2px solid ${isChecked ? '#0d6efd' : '#dee2e6'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '13px'
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.backgroundColor = '#fff';
                              e.currentTarget.style.borderColor = '#adb5bd';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                              e.currentTarget.style.borderColor = '#dee2e6';
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(section, key)}
                            style={{
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer',
                              accentColor: '#0d6efd'
                            }}
                          />
                          <span style={{ 
                            fontWeight: isChecked ? '600' : '500',
                            color: isChecked ? '#0d6efd' : '#495057',
                            fontSize: '13px'
                          }}>
                            {formatPermissionLabel(key)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: '#e7f3ff',
        borderRadius: '8px',
        border: '1px solid #0d6efd',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#0d6efd' }}>
          <i className="fas fa-info-circle me-2"></i>
          Permission Summary
        </div>
        <div style={{ fontSize: '12px', color: '#495057' }}>
          {Object.values(permissions).reduce((acc: number, section: any) => {
            return acc + Object.values(section).filter(v => v === true).length;
          }, 0)} permissions granted
        </div>
      </div>
    </div>
  );
}

