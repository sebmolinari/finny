// theme/theme.js
import { createTheme } from "@mui/material/styles";

const FONT_FAMILY = '"Inter", "Helvetica Neue", Arial, sans-serif';

// Brand colour palette
const PRIMARY = {
  50: "#eff6ff",
  100: "#dbeafe",
  200: "#bfdbfe",
  300: "#93c5fd",
  400: "#60a5fa",
  500: "#3b82f6",
  600: "#2563eb",
  700: "#1d4ed8",
  800: "#1e40af",
  900: "#1e3a8a",
  main: "#2563eb",
  light: "#60a5fa",
  dark: "#1d4ed8",
  contrastText: "#ffffff",
};

export const theme = createTheme({
  cssVariables: true,
  colorSchemeSelector: "data-mui-color-scheme",

  colorSchemes: {
    light: {
      palette: {
        mode: "light",
        primary: PRIMARY,
        background: {
          default: "#f8fafc",
          paper: "#ffffff",
        },
        text: {
          primary: "#0f172a",
          secondary: "#64748b",
        },
        divider: "rgba(0,0,0,0.07)",
        success: { main: "#16a34a", light: "#22c55e", dark: "#166534" },
        error: { main: "#dc2626", light: "#ef4444", dark: "#991b1b" },
        warning: { main: "#d97706", light: "#f59e0b", dark: "#92400e" },
      },
    },
    dark: {
      palette: {
        mode: "dark",
        primary: PRIMARY,
        background: {
          default: "#0b1120",
          paper: "#111827",
        },
        text: {
          primary: "#f1f5f9",
          secondary: "#94a3b8",
        },
        divider: "rgba(255,255,255,0.07)",
        success: { main: "#22c55e", light: "#4ade80", dark: "#16a34a" },
        error: { main: "#ef4444", light: "#f87171", dark: "#dc2626" },
        warning: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
      },
    },
  },

  shape: { borderRadius: 10 },

  typography: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    h4: { fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 500 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
  },

  shadows: [
    "none",
    "0 1px 2px 0 rgba(0,0,0,0.05)",
    "0 1px 3px 0 rgba(0,0,0,0.08),0 1px 2px -1px rgba(0,0,0,0.06)",
    "0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)",
    "0 6px 10px -2px rgba(0,0,0,0.08),0 3px 6px -3px rgba(0,0,0,0.05)",
    "0 10px 15px -3px rgba(0,0,0,0.08),0 4px 6px -4px rgba(0,0,0,0.04)",
    "0 14px 20px -4px rgba(0,0,0,0.08),0 6px 10px -4px rgba(0,0,0,0.04)",
    "0 18px 24px -5px rgba(0,0,0,0.08),0 8px 12px -5px rgba(0,0,0,0.04)",
    "0 20px 28px -6px rgba(0,0,0,0.1)",
    "0 24px 32px -6px rgba(0,0,0,0.1)",
    "0 28px 36px -7px rgba(0,0,0,0.12)",
    "0 32px 40px -7px rgba(0,0,0,0.12)",
    "0 36px 44px -8px rgba(0,0,0,0.14)",
    "0 40px 48px -8px rgba(0,0,0,0.14)",
    "0 44px 52px -9px rgba(0,0,0,0.15)",
    "0 48px 56px -9px rgba(0,0,0,0.15)",
    "0 52px 60px -10px rgba(0,0,0,0.16)",
    "0 56px 64px -10px rgba(0,0,0,0.16)",
    "0 60px 68px -11px rgba(0,0,0,0.17)",
    "0 64px 72px -11px rgba(0,0,0,0.17)",
    "0 68px 76px -12px rgba(0,0,0,0.18)",
    "0 72px 80px -12px rgba(0,0,0,0.18)",
    "0 76px 84px -13px rgba(0,0,0,0.19)",
    "0 80px 88px -13px rgba(0,0,0,0.19)",
    "0 84px 92px -14px rgba(0,0,0,0.2)",
  ],

  components: {
    // ── Buttons ───────────────────────────────────────────────
    MuiButton: {
      defaultProps: { variant: "contained", disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "7px 18px",
          fontWeight: 600,
        },
        containedPrimary: {
          background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          color: "#ffffff",
          "&:hover": {
            background: "linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)",
            color: "#ffffff",
          },
          "&.Mui-disabled": {
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
            opacity: 0.45,
            color: "#ffffff",
          },
        },
      },
    },

    // ── Cards ─────────────────────────────────────────────────
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 12,
          transition:
            "box-shadow 0.2s ease, transform 0.15s ease, border-color 0.2s ease",
          "&:hover": {
            boxShadow: theme.shadows[4],
            transform: "translateY(-2px)",
            borderColor:
              theme.palette.mode === "light"
                ? "rgba(37,99,235,0.25)"
                : "rgba(96,165,250,0.25)",
          },
        }),
      },
    },

    // ── Paper ─────────────────────────────────────────────────
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 12,
          backgroundImage: "none",
        }),
      },
    },

    // ── Drawer (sidebar) ──────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: "none",
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundImage: "none",
          backgroundColor:
            theme.palette.mode === "light" ? "#ffffff" : "#111827",
        }),
      },
    },

    // ── List items ────────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          marginBottom: 2,
          paddingLeft: 12,
          "&.active, &.Mui-selected": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(37,99,235,0.09)"
                : "rgba(96,165,250,0.12)",
            color: theme.palette.primary.main,
            "& .MuiListItemIcon-root": { color: theme.palette.primary.main },
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light"
                  ? "rgba(37,99,235,0.14)"
                  : "rgba(96,165,250,0.18)",
            },
          },
          "&:hover": {
            backgroundColor:
              theme.palette.mode === "light"
                ? "rgba(0,0,0,0.04)"
                : "rgba(255,255,255,0.05)",
          },
        }),
      },
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: { minWidth: 36, color: "inherit", transition: "color 0.15s" },
      },
    },

    // ── Chip ──────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
    },

    // ── TextField / Inputs ────────────────────────────────────
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
        }),
      },
    },

    // ── Tooltips ──────────────────────────────────────────────
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: "grey",
          color: "#ffffff",
          borderRadius: 6,
          fontSize: "0.75rem",
          maxWidth: 320,
          lineHeight: 1.5,
        },
        arrow: {
          color: "grey",
        },
      },
    },

    // ── AppBar / Header ───────────────────────────────────────
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },

    // ── Divider ───────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: ({ theme }) => ({ borderColor: theme.palette.divider }),
      },
    },

    // ── Dialogs ───────────────────────────────────────────────
    MuiDialog: {
      defaultProps: { PaperProps: { elevation: 0 } },
      styleOverrides: {
        paper: ({ theme }) => ({
          borderRadius: 16,
          border: `1px solid ${theme.palette.divider}`,
          backgroundImage: "none",
          boxShadow:
            theme.palette.mode === "light"
              ? "0 24px 48px -12px rgba(0,0,0,0.18)"
              : "0 24px 48px -12px rgba(0,0,0,0.6)",
        }),
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: "1.05rem", paddingBottom: 8 },
      },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingTop: "8px !important" } },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: "12px 24px 20px",
          gap: 8,
          borderTop: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    // ── Backdrop ──────────────────────────────────────────────
    MuiBackdrop: {
      styleOverrides: {
        root: ({ ownerState }) =>
          !ownerState.invisible && {
            backdropFilter: "blur(4px)",
            backgroundColor: "rgba(0,0,0,0.45)",
          },
      },
    },

    // ── Select ────────────────────────────────────────────────
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },

    // ── InputLabel ────────────────────────────────────────────
    MuiInputLabel: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },

    // ── FormControlLabel ──────────────────────────────────────
    MuiFormControlLabel: {
      styleOverrides: {
        label: { fontSize: "0.875rem", fontWeight: 500 },
      },
    },

    // ── Switch ────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 6 },
        track: { borderRadius: 8 },
        thumb: { boxShadow: "0 1px 4px rgba(0,0,0,0.25)" },
      },
    },

    // ── Alert ─────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontWeight: 500 },
        standardError: { border: "1px solid rgba(220,38,38,0.25)" },
        standardSuccess: { border: "1px solid rgba(22,163,74,0.25)" },
        standardWarning: { border: "1px solid rgba(217,119,6,0.25)" },
        standardInfo: { border: "1px solid rgba(37,99,235,0.25)" },
      },
    },

    // ── Scrollbar + Global Keyframes ──────────────────────────
    MuiCssBaseline: {
      styleOverrides: (theme) => `
        *, *::before, *::after { box-sizing: border-box; }
        html { font-family: ${FONT_FAMILY}; -webkit-font-smoothing: antialiased; scrollbar-gutter: stable; }
        body { background-color: ${theme.palette.mode === "light" ? "#f8fafc" : "#0b1120"}; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.25); }
          50%       { box-shadow: 0 0 0 6px rgba(37,99,235,0); }
        }

        .animate-fade-in-up   { animation: fadeInUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-fade-in      { animation: fadeIn 0.35s ease both; }
        .animate-slide-in     { animation: slideInLeft 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        .animate-scale-in     { animation: scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }

        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.10s; }
        .delay-3 { animation-delay: 0.15s; }
        .delay-4 { animation-delay: 0.20s; }
        .delay-5 { animation-delay: 0.25s; }
        .delay-6 { animation-delay: 0.30s; }
        .delay-7 { animation-delay: 0.35s; }
        .delay-8 { animation-delay: 0.40s; }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb {
          background: ${theme.palette.mode === "light" ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)"};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${theme.palette.mode === "light" ? "rgba(0,0,0,0.30)" : "rgba(255,255,255,0.30)"};
        }

      `,
    },
  },
});
