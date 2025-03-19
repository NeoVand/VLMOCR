import { createTheme, PaletteMode } from '@mui/material/styles';

// Create theme creator function that can handle both dark and light modes
const createAppTheme = (mode: PaletteMode) => {
  const primaryColor = mode === 'dark' ? '#e08c16' : '#d97706';
  const primaryLighter = mode === 'dark' ? 'rgba(224, 140, 22, 0.08)' : 'rgba(217, 119, 6, 0.08)';
  const backgroundColor = mode === 'dark' ? '#000000' : '#ffffff';
  const paperColor = mode === 'dark' ? '#000000' : '#ffffff';
  const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  const textPrimary = mode === 'dark' ? '#ffffff' : '#111111';
  const textSecondary = mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const inputBackground = mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryColor,
      },
      secondary: {
        main: mode === 'dark' ? '#10b981' : '#0d9488',
      },
      background: {
        default: backgroundColor,
        paper: paperColor,
      },
      error: {
        main: mode === 'dark' ? '#ef4444' : '#dc2626',
      },
      success: {
        main: mode === 'dark' ? '#22c55e' : '#16a34a',
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      fontSize: 13,
      h6: {
        fontSize: '1.1rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
      subtitle1: {
        fontSize: '0.9rem',
        fontWeight: 500,
      },
      subtitle2: {
        fontSize: '0.8rem',
        fontWeight: 500,
        letterSpacing: '0.01em',
        marginBottom: '0.5rem',
      },
      body1: {
        fontSize: '0.875rem',
      },
      body2: {
        fontSize: '0.8rem',
      },
      caption: {
        fontSize: '0.7rem',
        opacity: 0.8,
      },
    },
    shape: {
      borderRadius: 6,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--sidebar-transition': '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '--primary-color': primaryColor,
            '--primary-light': primaryLighter,
            '--border-color': borderColor,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: mode === 'dark' ? backgroundColor : backgroundColor,
            boxShadow: 'none',
            borderBottom: `1px solid ${borderColor}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
            border: `1px solid ${borderColor}`,
          },
          outlined: {
            borderColor: borderColor,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.8rem',
            padding: '6px 12px',
            borderRadius: 6,
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            },
          },
          sizeSmall: {
            fontSize: '0.75rem',
            padding: '4px 10px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            },
          },
          outlined: {
            borderWidth: '1px',
            '&:hover': {
              borderWidth: '1px',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            '& .MuiOutlinedInput-root': {
              backgroundColor: inputBackground,
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            fontSize: '0.875rem',
          },
        },
      },
      MuiSlider: {
        styleOverrides: {
          root: {
            padding: '10px 0',
            height: 4,
            color: primaryColor,
          },
          thumb: {
            width: 14,
            height: 14,
          },
          markLabel: {
            fontSize: '0.7rem',
            color: textSecondary,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            fontSize: '0.75rem',
            backgroundColor: mode === 'dark' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.75)',
            padding: '8px 12px',
            borderRadius: 4,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem',
            height: '24px',
            fontWeight: 500,
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            },
          },
          label: {
            padding: '0 8px',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            backgroundColor: borderColor,
            margin: '12px 0',
          },
        },
      },
      MuiFormControlLabel: {
        styleOverrides: {
          root: {
            marginRight: 0,
          },
          label: {
            fontSize: '0.8rem',
          },
        },
      },
    },
    spacing: (factor: number) => `${0.5 * factor}rem`,
  });
};

// Default theme (dark mode)
const theme = createAppTheme('dark');

export { createAppTheme };
export default theme; 