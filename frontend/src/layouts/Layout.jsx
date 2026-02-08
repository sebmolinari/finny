import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import SideMenu from "../components/SideMenu";
import Header from "../components/Header";
import Copyright from "../components/Copyright";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <SideMenu />
      <Box
        component="main"
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}
      >
        <Header />
        <Box sx={{ flexGrow: 1, p: 1 }}>
          <Outlet />
        </Box>
        <Copyright sx={{ my: 2 }} />
      </Box>
    </Box>
  );
}
