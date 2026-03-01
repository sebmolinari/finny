/**
 * Animation utility — maps className helpers defined in theme/MuiCssBaseline keyframes.
 *
 * Usage:
 *   import { fadeInUp, stagger } from "../utils/animations";
 *   <Box className={`${fadeInUp} ${stagger(2)}`}>…</Box>
 *
 *   // or apply via sx:
 *   <Box sx={fadeInUpSx(1)}>…</Box>  // index = stagger slot (1-8)
 */

// ── Class name helpers (rely on global @keyframes in theme CssBaseline) ────
export const fadeInUp = "animate-fade-in-up";
export const fadeIn = "animate-fade-in";
export const slideIn = "animate-slide-in";
export const scaleIn = "animate-scale-in";

/** Returns the stagger delay class for slot n (1–8) */
export const stagger = (n) => `delay-${Math.min(n, 8)}`;

// ── sx-prop helpers ─────────────────────────────────────────────────────────
/**
 * Inline fadeInUp sx object with optional stagger delay index (1-based).
 * @param {number} [index=0]  stagger slot; pass 0 for no delay.
 */
export const fadeInUpSx = (index = 0) => ({
  opacity: 0,
  animation: "fadeInUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards",
  animationDelay: index > 0 ? `${(index - 1) * 0.07}s` : "0s",
});

/**
 * Inline scaleIn sx for dialog / panel entries.
 */
export const scaleInSx = (index = 0) => ({
  opacity: 0,
  animation: "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
  animationDelay: index > 0 ? `${(index - 1) * 0.06}s` : "0s",
});
