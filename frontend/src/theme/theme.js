// theme/theme.ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,

  colorSchemeSelector: "data-mui-color-scheme",

  colorSchemes: {
    light: {
      palette: {
        mode: "light",
      },
    },
    dark: {
      palette: {
        mode: "dark",
      },
    },
  },

  typography: {
    fontSize: 13,
    h4: {
      fontWeight: 600,
    },
  },

  components: {
    MuiButton: {
      defaultProps: {
        variant: "contained",
      },
    },
  },
});
