import { createTheme } from '@mui/material/styles';

// WeTechForU Healthcare Brand Colors
const wetechforuColors = {
  // Primary Healthcare Blue - Trust and Professionalism
  primaryBlue: '#2E86AB',
  primaryBlueLight: '#5BA3C7',
  primaryBlueDark: '#1E5F7A',
  
  // Secondary Healthcare Teal - Health and Wellness
  secondaryTeal: '#20C997',
  secondaryTealLight: '#4DD4A7',
  secondaryTealDark: '#16A085',
  
  // Trust and Professional Colors
  trustBlue: '#007bff',
  trustBlueLight: '#3399ff',
  trustBlueDark: '#0056b3',
  
  // Neutral Colors for Healthcare
  professionalGray: '#6c757d',
  lightGray: '#f8f9fa',
  mediumGray: '#e9ecef',
  darkGray: '#343a40',
  
  // Status Colors
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  
  // Background Colors
  background: '#ffffff',
  paper: '#ffffff',
  default: '#f8f9fa',
};

export const healthcareTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: wetechforuColors.primaryBlue,
      light: wetechforuColors.primaryBlueLight,
      dark: wetechforuColors.primaryBlueDark,
      contrastText: '#ffffff',
    },
    secondary: {
      main: wetechforuColors.secondaryTeal,
      light: wetechforuColors.secondaryTealLight,
      dark: wetechforuColors.secondaryTealDark,
      contrastText: '#ffffff',
    },
    background: {
      default: wetechforuColors.lightGray,
      paper: wetechforuColors.background,
    },
    text: {
      primary: wetechforuColors.darkGray,
      secondary: wetechforuColors.professionalGray,
    },
    success: {
      main: wetechforuColors.success,
    },
    warning: {
      main: wetechforuColors.warning,
    },
    error: {
      main: wetechforuColors.error,
    },
    info: {
      main: wetechforuColors.info,
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: wetechforuColors.darkGray,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: wetechforuColors.darkGray,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: wetechforuColors.darkGray,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: wetechforuColors.darkGray,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: wetechforuColors.darkGray,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      color: wetechforuColors.darkGray,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(46, 134, 171, 0.3)',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${wetechforuColors.primaryBlue} 0%, ${wetechforuColors.secondaryTeal} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${wetechforuColors.primaryBlueDark} 0%, ${wetechforuColors.secondaryTealDark} 100%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)',
            transition: 'all 0.3s ease',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${wetechforuColors.primaryBlue} 0%, ${wetechforuColors.secondaryTeal} 100%)`,
          boxShadow: '0 4px 20px rgba(46, 134, 171, 0.3)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: `linear-gradient(180deg, ${wetechforuColors.primaryBlue} 0%, ${wetechforuColors.secondaryTeal} 100%)`,
          borderRight: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderLeft: '4px solid #ffffff',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          fontWeight: 500,
        },
        colorPrimary: {
          background: `linear-gradient(135deg, ${wetechforuColors.primaryBlue} 0%, ${wetechforuColors.secondaryTeal} 100%)`,
          color: '#ffffff',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: wetechforuColors.primaryBlue,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: wetechforuColors.primaryBlue,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          borderRadius: 12,
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: wetechforuColors.lightGray,
            borderBottom: `2px solid ${wetechforuColors.primaryBlue}`,
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: 'rgba(46, 134, 171, 0.05)',
          },
        },
      },
    },
  },
});

// Custom CSS Variables for easy access
export const cssVariables = {
  '--primary-blue': wetechforuColors.primaryBlue,
  '--secondary-teal': wetechforuColors.secondaryTeal,
  '--trust-blue': wetechforuColors.trustBlue,
  '--professional-gray': wetechforuColors.professionalGray,
  '--light-gray': wetechforuColors.lightGray,
  '--medium-gray': wetechforuColors.mediumGray,
  '--dark-gray': wetechforuColors.darkGray,
};
