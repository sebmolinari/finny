import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ColorModeIconDropdown from "./ColorModeIconDropdown";
import NavbarBreadcrumbs from "./NavbarBreadcrumbs";
import MenuButton from "./MenuButton";
import Today from "./Today";

export default function Header() {
  return (
    <Stack
      direction="row"
      sx={{
        display: { xs: "none", md: "flex" },
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: { sm: "100%", md: "1700px" },
        px: 2,
        py: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <NavbarBreadcrumbs />
      <Stack direction="row" sx={{ gap: 0.5, alignItems: "center" }}>
        <Today />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.75, my: 0.5 }} />
        <MenuButton aria-label="Open notifications">
          <NotificationsRoundedIcon fontSize="small" />
        </MenuButton>
        <ColorModeIconDropdown />
      </Stack>
    </Stack>
  );
}
