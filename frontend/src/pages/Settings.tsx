import React from 'react';
import '../theme/brand.css';

const Settings: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '1.8rem', 
          fontWeight: '700', 
          color: '#2c3e50', 
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-cog" style={{ color: '#4682B4' }}></i>
          System Settings
        </h1>
        
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <i className="fas fa-tools" style={{ fontSize: '3rem', color: '#6c757d', marginBottom: '1rem' }}></i>
          <h3 style={{ color: '#495057', marginBottom: '0.5rem' }}>Coming Soon</h3>
          <p style={{ color: '#6c757d', margin: 0 }}>
            System settings panel is under development. 
            This will allow you to configure application settings, preferences, and system-wide options.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
