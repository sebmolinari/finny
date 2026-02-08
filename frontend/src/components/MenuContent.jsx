import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import InfoRoundedIcon from "@mui/icons-material/InfoRounded";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import { NavLink, useLocation } from "react-router-dom";

const mainListItems = [
  { text: "Dashboard", icon: <HomeRoundedIcon />, path: "/" },
  { text: "Holdings", icon: <AnalyticsRoundedIcon />, path: "/holdings" },
  {
    text: "Market Trends",
    icon: <PeopleRoundedIcon />,
    path: "/market-trends",
  },
  { text: "Blotter", icon: <AssignmentRoundedIcon />, path: "/blotter" },
  { text: "Assets", icon: <SettingsRoundedIcon />, path: "/assets" },
  { text: "Brokers", icon: <InfoRoundedIcon />, path: "/brokers" },
  {
    text: "Asset Allocation",
    icon: <HelpRoundedIcon />,
    path: "/asset-allocation",
  },
  {
    text: "Return Details",
    icon: <HelpRoundedIcon />,
    path: "/return-details",
  },
  { text: "Cash Details", icon: <HelpRoundedIcon />, path: "/cash-details" },
  { text: "Tax Report", icon: <HelpRoundedIcon />, path: "/tax-report" },
  { text: "Users", icon: <HelpRoundedIcon />, path: "/users" },
  { text: "Audit Logs", icon: <HelpRoundedIcon />, path: "/audit" },
  { text: "Host Metrics", icon: <HelpRoundedIcon />, path: "/host-metrics" },
  { text: "Changelog", icon: <HelpRoundedIcon />, path: "/changelog" },
];

export default function MenuContent() {
  const location = useLocation();
  return (
    <Stack sx={{ flexGrow: 1, p: 1, justifyContent: "space-between" }}>
      <List dense>
        {mainListItems.map((item, index) => (
          <ListItem key={index} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}
