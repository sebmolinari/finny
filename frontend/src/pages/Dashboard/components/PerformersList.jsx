import { Box, Typography, CardContent, Grid } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  EmojiEvents as EmojiEventsIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";
import { StyledCard } from "../../../components/StyledCard";
import { formatCurrency } from "../../../utils/formatNumber";

function PerformerRow({ holding, color, theme }) {
  return (
    <Box
      key={`${holding.asset_id}-${holding.broker_id}`}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        py: 0.75,
        borderBottom: `1px solid ${theme.palette.divider}`,
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Box>
        <Typography variant="body2" fontWeight={600}>
          {holding.symbol}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {holding.broker_name || "—"}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right" }}>
        <Typography variant="body2" fontWeight={600} color={color}>
          {holding.unrealized_gain_percent >= 0 ? "+" : ""}
          {holding.unrealized_gain_percent.toFixed(2)}%
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatCurrency(holding.unrealized_gain, 0)}
        </Typography>
      </Box>
    </Box>
  );
}

export function PerformersList({ bestPerformers, worstPerformers }) {
  const theme = useTheme();

  return (
    <>
      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard animIndex={9}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <EmojiEventsIcon fontSize="small" sx={{ color: theme.palette.success.main }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Best Performers
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (vs. cost basis)
              </Typography>
            </Box>
            {bestPerformers.map((h) => (
              <PerformerRow
                key={`best-${h.asset_id}-${h.broker_id}`}
                holding={h}
                color={theme.palette.success.main}
                theme={theme}
              />
            ))}
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard animIndex={10}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <TrendingDownIcon fontSize="small" sx={{ color: theme.palette.error.main }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Worst Performers
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (vs. cost basis)
              </Typography>
            </Box>
            {worstPerformers.map((h) => (
              <PerformerRow
                key={`worst-${h.asset_id}-${h.broker_id}`}
                holding={h}
                color={
                  h.unrealized_gain_percent < 0
                    ? theme.palette.error.main
                    : theme.palette.success.main
                }
                theme={theme}
              />
            ))}
          </CardContent>
        </StyledCard>
      </Grid>
    </>
  );
}
