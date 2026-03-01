import { styled } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import Breadcrumbs, { breadcrumbsClasses } from "@mui/material/Breadcrumbs";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import { Link, useLocation } from "react-router-dom";

const StyledBreadcrumbs = styled(Breadcrumbs)(({ theme }) => ({
  margin: theme.spacing(1, 0),
  [`& .${breadcrumbsClasses.separator}`]: {
    color: (theme.vars || theme).palette.action.disabled,
    margin: 1,
  },
  [`& .${breadcrumbsClasses.ol}`]: {
    alignItems: "center",
  },
}));

const BreadcrumbLink = styled(Link)(({ theme }) => ({
  color: (theme.vars || theme).palette.text.secondary,
  textDecoration: "none",
  "&:hover": {
    textDecoration: "underline",
  },
}));

// Helper function to format path segments into readable titles
const formatPathSegment = (segment) => {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function NavbarBreadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // If we're at the root, show "Dashboard"
  if (pathnames.length === 0) {
    return (
      <StyledBreadcrumbs
        aria-label="breadcrumb"
        separator={<NavigateNextRoundedIcon fontSize="small" />}
      >
        <Typography
          variant="body1"
          sx={{ color: "text.primary", fontWeight: 600 }}
        >
          Dashboard
        </Typography>
      </StyledBreadcrumbs>
    );
  }

  return (
    <StyledBreadcrumbs
      aria-label="breadcrumb"
      separator={<NavigateNextRoundedIcon fontSize="small" />}
    >
      <BreadcrumbLink to="/">
        <Typography variant="body1">Home</Typography>
      </BreadcrumbLink>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;
        const label = formatPathSegment(value);

        return isLast ? (
          <Typography
            key={to}
            variant="body1"
            sx={{ color: "text.primary", fontWeight: 600 }}
          >
            {label}
          </Typography>
        ) : (
          <BreadcrumbLink key={to} to={to}>
            <Typography variant="body1">{label}</Typography>
          </BreadcrumbLink>
        );
      })}
    </StyledBreadcrumbs>
  );
}
