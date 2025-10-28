import React from 'react';

interface FacebookOAuthButtonProps {
  clientId: string;
}

const FacebookOAuthButton: React.FC<FacebookOAuthButtonProps> = ({ clientId }) => {
  const handleOAuthConnect = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `/api/facebook-connect/auth/${clientId}`;
  };

  return (
    <button
      onClick={handleOAuthConnect}
      style={{
        width: '100%',
        padding: '16px 32px',
        background: 'linear-gradient(135deg, #1877f2 0%, #0c63d4 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        boxShadow: '0 6px 20px rgba(24, 119, 242, 0.4)',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(24, 119, 242, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(24, 119, 242, 0.4)';
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      Connect with Facebook OAuth
    </button>
  );
};

export default FacebookOAuthButton;
