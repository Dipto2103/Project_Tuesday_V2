/**
 * MARS LANTERN — Mission Plan Export & URL-Hash State Sharing
 * 
 * Supports URL-hash serialization for zero-backend shareable missions,
 * along with JSON and Markdown export generators.
 * 
 * Reference: MARS_LANTERN_SPEC.md §9.1, §9.7
 */

import type { MissionInputConfig, MissionEvaluationResult } from './evaluation';

/**
 * Encodes a MissionInputConfig into a compact URL-safe hash string.
 */
export function encodeMissionToHash(config: MissionInputConfig): string {
  try {
    const jsonStr = JSON.stringify({
      id: config.id,
      n: config.name,
      s: { lat: config.start.lat, lon: config.start.lonE, l: config.start.label },
      st: config.stops.map((sp) => ({
        id: sp.checkpointId,
        lat: sp.lat,
        lon: sp.lonE,
        l: sp.label,
        o: sp.objectives
      })),
      v: config.vehicle,
      c: config.crew,
      d: config.durationSols,
      r: config.reservePct
    });

    if (typeof window !== 'undefined' && typeof btoa === 'function') {
      return '#mission=' + encodeURIComponent(btoa(jsonStr));
    }
    return '#mission=' + encodeURIComponent(Buffer.from(jsonStr).toString('base64'));
  } catch {
    return '';
  }
}

/**
 * Decodes a MissionInputConfig from a URL hash string.
 */
export function decodeMissionFromHash(hash: string): Partial<MissionInputConfig> | null {
  try {
    const match = hash.match(/#mission=([^&]+)/);
    if (!match) return null;

    let jsonStr = '';
    const b64 = decodeURIComponent(match[1]);
    if (typeof window !== 'undefined' && typeof atob === 'function') {
      jsonStr = atob(b64);
    } else {
      jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
    }

    const d = JSON.parse(jsonStr);
    return {
      id: d.id,
      name: d.n,
      start: { lat: d.s.lat, lonE: d.s.lon, label: d.s.l },
      stops: d.st.map((sp: any) => ({
        checkpointId: sp.id,
        lat: sp.lat,
        lonE: sp.lon,
        label: sp.l,
        objectives: sp.o || []
      })),
      vehicle: d.v,
      crew: d.c,
      durationSols: d.d,
      reservePct: d.r
    };
  } catch {
    return null;
  }
}

/**
 * Generates an executive Markdown mission briefing per Spec §9.1.
 */
export function generateMissionMarkdown(
  config: MissionInputConfig,
  evalResult: MissionEvaluationResult
): string {
  const { feasibility, budget, legs, totalDistanceKm, totalTransitHours, totalObjectiveHours } =
    evalResult;

  return `# MARS LANTERN — FIELD EXPEDITION BRIEFING
**Mission Name:** ${config.name}  
**Mission ID:** ${config.id}  
**Generated At:** ${new Date().toISOString()}  
**Challenge:** NASA Space Apps 2026 — Interplanetary Survival Guide  

---

## 1. Overall Feasibility Verdict
### **${feasibility.overall}**
- **Resource Verdict:** ${feasibility.resourceVerdict}
- **Terrain Verdict:** ${feasibility.terrainVerdict}
- **Schedule Verdict:** ${feasibility.scheduleVerdict}
- **Data Coverage Verdict:** ${feasibility.dataCoverageVerdict}

${
  feasibility.reasons.length > 0
    ? `### Key Constraints & Findings:\n${feasibility.reasons.map((r) => `- ⚠ ${r}`).join('\n')}`
    : ''
}

${
  feasibility.recommendations.length > 0
    ? `### Actionable Recommendations:\n${feasibility.recommendations.map((rec) => `- ✦ ${rec}`).join('\n')}`
    : ''
}

---

## 2. Mission Configuration
- **Vehicle Class:** ${config.vehicle.replace('_', ' ').toUpperCase()}
- **Crew Size:** ${config.crew} Astronaut(s)
- **Planned Duration:** ${config.durationSols} Sol(s) (${(config.durationSols * 24.66).toFixed(1)} Earth hours)
- **Contingency Reserve:** ${config.reservePct}%
- **Total Transit Distance:** ${totalDistanceKm} km
- **Total Transit Time:** ${totalTransitHours.toFixed(1)} hours
- **Total Science Objective Time:** ${totalObjectiveHours.toFixed(1)} hours

---

## 3. Consumable & Resource Budget (SIMULATED ASSUMPTION)
| Consumable | Required Quantity | Unit | Provenance |
|---|---|---|---|
| Oxygen (O₂) | ${budget.o2RequiredKg} | kg | SIMULATED ASSUMPTION |
| Water (Gross) | ${budget.waterRequiredKg} | kg | SIMULATED ASSUMPTION |
| Water (Net after ECLSS) | ${budget.waterNetKg} | kg | SIMULATED ASSUMPTION |
| Dry Rations | ${budget.foodRequiredKg} | kg | SIMULATED ASSUMPTION |
| Total Consumables | ${budget.totalConsumablesKg} | kg | SIMULATED ASSUMPTION |
| Scientific Equipment Mass | ${budget.equipmentMassKg} | kg | SIMULATED ASSUMPTION |
| Total Payload | ${budget.totalPayloadKg} / ${budget.maxPayloadCapacityKg} | kg | SIMULATED ASSUMPTION |
| Battery / Energy Reserve | ${budget.batteryEnergyKwh} | kWh | SIMULATED ASSUMPTION |

---

## 4. Route Legs & Traverse Profile
| Leg | From → To | Distance | Transit Time | Max Slope | High-Res Data | Status |
|---|---|---|---|---|---|---|
${legs
  .map(
    (l) =>
      `| ${l.fromId} → ${l.toId} | ${l.distanceKm} km | ${l.durationHours} h | ${l.maxSlopeDeg}° | ${l.highResCoveragePct}% | ${l.status} |`
  )
  .join('\n')}

---

## 5. Required Equipment Inventory
${evalResult.suggestedEquipment.map((eq) => `- **${eq.name}** (${eq.qty}x, ${eq.massKg} kg)`).join('\n')}

---

*MARS LANTERN Field Atlas — Carry the light. Read the planet.*
`;
}
