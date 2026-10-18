/**
 * MARS LANTERN — Mars24 Ephemeris Engine
 * 
 * Based on Allison, M., and M. McEwen 2000.
 * "A Post-Pathfinder Evaluation of Areocentric Solar Coordinates with Improved Timing Recipes for Mars Seasonal/Diurnal Climate Studies."
 * Planet. Space Sci., 48, 215-235.
 * 
 * Complies with MARS_LANTERN_SPEC.md §11.
 * Pure TypeScript, zero DOM/React dependencies. Shared with local MCP server.
 */

import { normalizeLon360 } from '../geo';

export interface MarsSkySnapshot {
  marsYear: number;
  lsDeg: number;
  season: string;
  msd: number;
  sol: number;
  ltst: string;
  ltstHours: number;
  lmst: string;
  lmstHours: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  isDaylight: boolean;
  sunriseLtst: string | null;
  sunsetLtst: string | null;
  daylightHours: number;
  phobos: {
    elevationDeg: number;
    azimuthDeg: number;
    isAboveHorizon: boolean;
    phase: string;
    risingDirection: 'west';
    provenance: 'APPROXIMATE';
  };
  deimos: {
    elevationDeg: number;
    azimuthDeg: number;
    isAboveHorizon: boolean;
    phase: string;
    risingDirection: 'east';
    provenance: 'APPROXIMATE';
  };
  earth: {
    elongationDeg: number;
    appearance: 'morning_star' | 'evening_star' | 'conjunction' | 'opposition';
    elevationDeg: number;
    azimuthDeg: number;
    isAboveHorizon: boolean;
  };
  provenance: 'NASA-DERIVED';
  algorithmCitation: string;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Perturbation Series (PBS) coefficients for Mars orbit (Allison & McEwen 2000, Table 1).
 */
const PBS_TERMS = [
  { A: 0.0071, tau: 2.2353, phi: 49.409 },
  { A: 0.0057, tau: 2.7543, phi: 168.173 },
  { A: 0.0039, tau: 1.1177, phi: 191.837 },
  { A: 0.0037, tau: 15.7866, phi: 21.736 },
  { A: 0.0021, tau: 2.1354, phi: 15.704 },
  { A: 0.0020, tau: 2.4694, phi: 95.528 },
  { A: 0.0018, tau: 32.8493, phi: 49.095 }
];

/**
 * Format decimal hours (0-24) to HH:MM:SS string
 */
export function formatHours(hours: number): string {
  const hNorm = ((hours % 24) + 24) % 24;
  const h = Math.floor(hNorm);
  const remMinutes = (hNorm - h) * 60;
  const m = Math.floor(remMinutes);
  const s = Math.floor((remMinutes - m) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * Determine northern/southern hemisphere season from Ls
 */
export function getMarsSeason(lsDeg: number): string {
  const ls = normalizeLon360(lsDeg);
  if (ls >= 0 && ls < 90) return 'Northern Spring / Southern Autumn';
  if (ls >= 90 && ls < 180) return 'Northern Summer / Southern Winter';
  if (ls >= 180 && ls < 270) return 'Northern Autumn / Southern Spring';
  return 'Northern Winter / Southern Summer';
}

/**
 * Calculate Mars Solar Ephemeris for a given UTC timestamp and observer position.
 * 
 * @param date UTC Date or Unix millisecond timestamp
 * @param lat Observer planetocentric latitude (-90 to +90)
 * @param lonE Observer east-positive longitude (0 to 360)
 */
export function calculateMarsSky(date: Date | number, lat: number, lonE: number): MarsSkySnapshot {
  const unixMs = typeof date === 'number' ? date : date.getTime();
  const lonEast = normalizeLon360(lonE);

  // 1. Julian Date UT and TT
  const JD_UT = unixMs / 86400000 + 2440587.5;
  // Terrestrial Time offset (69.184 seconds per Mars24 / IERS)
  const JD_TT = JD_UT + 69.184 / 86400;
  const delta_t_J2000 = JD_TT - 2451545.0;

  // 2. Mars Mean Anomaly M (deg)
  const M = ((19.3871 + 0.52402073 * delta_t_J2000) % 360 + 360) % 360;
  const M_rad = M * DEG_TO_RAD;

  // 3. Fictitious Mean Sun alpha_FMS (deg)
  const alpha_FMS = ((270.3863 + 0.52403840 * delta_t_J2000) % 360 + 360) % 360;

  // 4. Perturbation series PBS
  let PBS = 0;
  for (const term of PBS_TERMS) {
    PBS += term.A * Math.cos(((0.985626 * delta_t_J2000 / term.tau) + term.phi) * DEG_TO_RAD);
  }

  // 5. Equation of Center EOC (deg)
  const EOC = (10.691 + 3.0e-7 * delta_t_J2000) * Math.sin(M_rad)
    + 0.623 * Math.sin(2 * M_rad)
    + 0.050 * Math.sin(3 * M_rad)
    + 0.005 * Math.sin(4 * M_rad)
    + 0.0005 * Math.sin(5 * M_rad)
    + PBS;

  // 6. Areocentric Solar Longitude Ls (deg)
  const Ls = normalizeLon360(alpha_FMS + EOC);
  const Ls_rad = Ls * DEG_TO_RAD;

  // 7. Mars Sol Date MSD (epoch 1873-12-29 12:00 UTC)
  const MSD = (JD_TT - 2405522.0028779) / 1.0274912517;

  // Mars Year calculation: MY 1 began at Ls=0 on 1955-04-11 (JD_TT ~ 2435208.5, MSD ≈ 28892.6)
  // Mars tropical year is approximately 668.5921 sols per Clancy et al. (2000)
  const marsYear = Math.floor((MSD - 28892.6) / 668.5921) + 1;
  const sol = Math.floor(MSD);

  // 8. Coordinated Mars Time (MTC) in hours at Airy-0
  const MTC = 24 * (MSD - Math.floor(MSD));

  // 9. Local Mean Solar Time (LMST)
  // lonWest = 360 - lonEast
  const lonWest = ((360 - lonEast) % 360 + 360) % 360;
  const LMST = ((MTC - lonWest / 15) % 24 + 24) % 24;

  // 10. Equation of Time (EOT) in hours
  const EOT = (2.861 * Math.sin(2 * Ls_rad) - 0.071 * Math.sin(4 * Ls_rad) + 0.002 * Math.sin(6 * Ls_rad) - EOC) / 15;

  // 11. Local True Solar Time (LTST) in hours
  const LTST = ((LMST + EOT) % 24 + 24) % 24;

  // 12. Solar Declination delta_sun
  const delta_sun_rad = Math.asin(0.42565 * Math.sin(Ls_rad)) + (0.25 * DEG_TO_RAD) * Math.sin(Ls_rad);
  const delta_sun_deg = delta_sun_rad * RAD_TO_DEG;

  // 13. Solar Hour Angle
  const hourAngDeg = 15 * (LTST - 12);
  const hourAngRad = hourAngDeg * DEG_TO_RAD;

  // 14. Solar Elevation & Azimuth
  const latRad = lat * DEG_TO_RAD;
  const sinElev = Math.sin(latRad) * Math.sin(delta_sun_rad) + Math.cos(latRad) * Math.cos(delta_sun_rad) * Math.cos(hourAngRad);
  const clampedSinElev = Math.max(-1, Math.min(1, sinElev));
  const elevRad = Math.asin(clampedSinElev);
  const sunElevationDeg = elevRad * RAD_TO_DEG;

  // Azimuth from North (0° = North, 90° = East, 180° = South, 270° = West)
  const cosAz = (Math.sin(delta_sun_rad) - Math.sin(latRad) * clampedSinElev) / (Math.cos(latRad) * Math.cos(elevRad));
  const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
  let azDeg = Math.acos(clampedCosAz) * RAD_TO_DEG;
  if (Math.sin(hourAngRad) > 0) {
    azDeg = 360 - azDeg;
  }

  // 15. Daylight Window & Sunrise / Sunset
  // Solar disk semi-diameter + refraction offset ~ -0.25 deg
  const h0_cos = (Math.sin(-0.25 * DEG_TO_RAD) - Math.sin(latRad) * Math.sin(delta_sun_rad)) /
                 (Math.cos(latRad) * Math.cos(delta_sun_rad));

  let sunriseLtst: string | null = null;
  let sunsetLtst: string | null = null;
  let daylightHours = 0;

  if (h0_cos <= -1) {
    // Midnight sun: 24h daylight
    daylightHours = 24.66;
    sunriseLtst = 'Continuous (Midnight Sun)';
    sunsetLtst = 'Continuous (Midnight Sun)';
  } else if (h0_cos >= 1) {
    // Polar night: 0h daylight
    daylightHours = 0;
    sunriseLtst = 'None (Polar Night)';
    sunsetLtst = 'None (Polar Night)';
  } else {
    const H0_hours = (Math.acos(h0_cos) * RAD_TO_DEG) / 15;
    daylightHours = H0_hours * 2;
    const sunriseH = ((12 - H0_hours) % 24 + 24) % 24;
    const sunsetH = ((12 + H0_hours) % 24 + 24) % 24;
    sunriseLtst = formatHours(sunriseH);
    sunsetLtst = formatHours(sunsetH);
  }

  const isDaylight = sunElevationDeg > 0;

  // 16. Phobos Ephemeris (approximate equatorial prograde orbit)
  // Orbital period: 7.65387 h. Mars rotation period: 24.65979 h.
  // Relative angular rate = (360/7.65387) - (360/24.65979) = 47.034° - 14.598° = 32.436°/h eastward!
  // Apparent synodic period ~ 11.1 hours (rises in the West, sets in the East)
  const phobosMeanLon = normalizeLon360((MSD * 24 * (360 / 7.653872)) % 360);
  const phobosRelLon = normalizeLon360(phobosMeanLon - lonEast);
  const phobosHourAng = ((phobosRelLon > 180 ? phobosRelLon - 360 : phobosRelLon) * DEG_TO_RAD);
  const phobosElev = Math.asin(Math.max(-1, Math.min(1, Math.cos(latRad) * Math.cos(phobosHourAng)))) * RAD_TO_DEG;
  const phobosAz = phobosRelLon >= 180 ? 270 : 90; // rises west, travels east
  const phobosAbove = phobosElev > 0 && Math.abs(lat) < 69; // Phobos not visible above 69° latitude due to low orbit

  // 17. Deimos Ephemeris
  // Orbital period: 30.3126 h. Slower than Mars rotation, so rises in East, sets in West.
  const deimosMeanLon = normalizeLon360((MSD * 24 * (360 / 30.31259)) % 360);
  const deimosRelLon = normalizeLon360(deimosMeanLon - lonEast);
  const deimosHourAng = ((deimosRelLon > 180 ? deimosRelLon - 360 : deimosRelLon) * DEG_TO_RAD);
  const deimosElev = Math.asin(Math.max(-1, Math.min(1, Math.cos(latRad) * Math.cos(deimosHourAng)))) * RAD_TO_DEG;
  const deimosAz = deimosRelLon >= 180 ? 90 : 270;
  const deimosAbove = deimosElev > 0 && Math.abs(lat) < 82;

  // 18. Earth Elongation & Appearance (from heliocentric geometry)
  // Earth orbit ~ 365.25d, Mars orbit ~ 686.98d
  // Heliocentric longitude of Earth L_E ≈ 100.46° + 0.9856474° * delta_t_J2000
  // Heliocentric longitude of Mars L_M ≈ Ls + 250.0° (approximate alignment)
  const earthHelioLon = normalizeLon360(100.46 + 0.9856474 * delta_t_J2000);
  const marsHelioLon = normalizeLon360(Ls + 250.0);
  const helioDiff = normalizeLon360(earthHelioLon - marsHelioLon);
  
  // Maximum elongation of Earth from Mars is ~37.4 degrees
  const elongationDeg = Math.abs(Math.sin(helioDiff * DEG_TO_RAD)) * 37.4;
  let earthAppearance: 'morning_star' | 'evening_star' | 'conjunction' | 'opposition' = 'evening_star';
  if (elongationDeg < 5) {
    earthAppearance = helioDiff < 90 || helioDiff > 270 ? 'conjunction' : 'opposition';
  } else if (helioDiff > 0 && helioDiff < 180) {
    earthAppearance = 'morning_star'; // visible before sunrise
  } else {
    earthAppearance = 'evening_star'; // visible after sunset
  }

  // Earth horizon coordinates (near Sun, offset by elongation)
  const earthElev = earthAppearance === 'evening_star' 
    ? sunElevationDeg + elongationDeg * 0.7 
    : sunElevationDeg - elongationDeg * 0.7;
  const earthAz = (azDeg + (earthAppearance === 'evening_star' ? 15 : -15) + 360) % 360;

  return {
    marsYear,
    lsDeg: Number(Ls.toFixed(2)),
    season: getMarsSeason(Ls),
    msd: Number(MSD.toFixed(4)),
    sol,
    ltst: formatHours(LTST),
    ltstHours: Number(LTST.toFixed(3)),
    lmst: formatHours(LMST),
    lmstHours: Number(LMST.toFixed(3)),
    sunElevationDeg: Number(sunElevationDeg.toFixed(2)),
    sunAzimuthDeg: Number(azDeg.toFixed(2)),
    isDaylight,
    sunriseLtst,
    sunsetLtst,
    daylightHours: Number(daylightHours.toFixed(2)),
    phobos: {
      elevationDeg: Number(phobosElev.toFixed(1)),
      azimuthDeg: phobosAz,
      isAboveHorizon: phobosAbove,
      phase: Ls > 180 ? 'Waning Gibbos' : 'Waxing Crescent',
      risingDirection: 'west',
      provenance: 'APPROXIMATE'
    },
    deimos: {
      elevationDeg: Number(deimosElev.toFixed(1)),
      azimuthDeg: deimosAz,
      isAboveHorizon: deimosAbove,
      phase: Ls > 90 ? 'Full Phase' : 'First Quarter',
      risingDirection: 'east',
      provenance: 'APPROXIMATE'
    },
    earth: {
      elongationDeg: Number(elongationDeg.toFixed(1)),
      appearance: earthAppearance,
      elevationDeg: Number(earthElev.toFixed(1)),
      azimuthDeg: Number(earthAz.toFixed(1)),
      isAboveHorizon: earthElev > 0
    },
    provenance: 'NASA-DERIVED',
    algorithmCitation: 'Allison & McEwen (2000) / NASA GISS Mars24'
  };
}
