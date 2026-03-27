import { useEffect, useState } from "react";
import {
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip,
  Box,
  Alert,
} from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { systemAPI } from "../../api/api";
import { StyledCard } from "./StyledCard";

const SECTIONS = [
  {
    label: "Server",
    keys: ["NODE_ENV", "PORT", "DB_PATH", "DB_VERBOSE", "JWT_EXPIRATION"],
  },
  {
    label: "Security",
    keys: ["DB_KEY", "JWT_SECRET"],
  },
  {
    label: "Rate Limiting",
    keys: ["RATE_LIMIT_WINDOW_MS", "RATE_LIMIT_MAX_REQUESTS"],
  },
  {
    label: "Email",
    keys: [
      "EMAIL_ENABLED",
      "EMAIL_HOST",
      "EMAIL_PORT",
      "EMAIL_SECURE",
      "EMAIL_USER",
      "EMAIL_APP_PASSWORD",
      "EMAIL_FROM_NAME",
      "EMAIL_FROM_ADDRESS",
    ],
  },
  {
    label: "Supabase",
    keys: ["SUPABASE_ENABLED", "SUPABASE_URL", "SUPABASE_API_KEY"],
  },
];

const BoolChip = ({ value }) => {
  const isTrue = value === "true";
  return (
    <Chip
      label={value}
      size="small"
      color={isTrue ? "success" : "default"}
      variant="outlined"
      sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
    />
  );
};

const isBoolLike = (value) => value === "true" || value === "false";

const SystemConfigCard = () => {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    systemAPI
      .getConfig()
      .then((res) => setConfig(res.data))
      .catch(() => setError("Failed to load system configuration"));
  }, []);

  return (
    <StyledCard>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <SettingsRoundedIcon
            sx={{ mr: 1, color: "text.secondary", fontSize: 20 }}
          />
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            System Configuration
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {config &&
          SECTIONS.map((section) => (
            <Box key={section.label} sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.disabled"
                sx={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {section.label}
              </Typography>
              <Table size="small" sx={{ mt: 0.5 }}>
                <TableBody>
                  {section.keys.map((key) => (
                    <TableRow
                      key={key}
                      sx={{ "&:last-child td": { border: 0 } }}
                    >
                      <TableCell
                        sx={{
                          py: 0.5,
                          pl: 0,
                          width: "50%",
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          color: "text.secondary",
                          border: 0,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {key}
                      </TableCell>
                      <TableCell
                        sx={{
                          py: 0.5,
                          pr: 0,
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          border: 0,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {isBoolLike(config[key]) ? (
                          <BoolChip value={config[key]} />
                        ) : (
                          <Typography
                            component="span"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.75rem",
                              color:
                                config[key] === "(not set)"
                                  ? "text.disabled"
                                  : "text.primary",
                            }}
                          >
                            {config[key] ?? "(not set)"}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ))}
      </CardContent>
    </StyledCard>
  );
};

export default SystemConfigCard;
