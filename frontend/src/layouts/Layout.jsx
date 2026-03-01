import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import UserMenu from "../components/UserMenu";
import Header from "../components/Header";
import Copyright from "../components/Copyright";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <UserMenu />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Header />
        <Box sx={{ flexGrow: 1, px: { md: 0.75 }, pt: 0.5, pb: 2 }}>
          <Outlet />
        </Box>
        <Copyright sx={{ mt: 2, mb: 2 }} />
      </Box>
    </Box>
  );
}
