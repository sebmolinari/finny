import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeProvider } from "@mui/material";
import { router } from "./router/router";
import { AuthProvider } from "./auth/AuthContext";
import { SettingsProvider } from "./auth/SettingsContext";
import { theme } from "./theme/theme";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme} defaultMode="system">
    <CssBaseline />
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnHover
    />
    <AuthProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </AuthProvider>
  </ThemeProvider>,
);
