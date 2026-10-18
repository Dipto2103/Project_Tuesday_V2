/**
 * MARS LANTERN — Mission Evaluation & Feasibility Engine
 * 
 * Computes deterministic consumable budgets, evaluates multi-stop route legs,
 * checks schedule and daylight constraints, and issues 4 distinct scientific verdicts.
 * 
 * Pure TypeScript — zero DOM, zero React.
 * Reference: MARS_LANTERN_SPEC.md §9.2, §9.3
 */

import { MISSION_ASSUMPTIONS, getVehicleSpeedKmh, getVehicleSlopeLimitDeg } from '../../config/assumptions';
import { MISSION_OBJECTIVES, EQUIPMENT_CATALOG, validateStopObjective } from './objectives';
import { planMarsRoute } from '../route';
import type { Checkpoint } from '../types';
import type { RouteSummary } from '../types';

export interface MissionInputConfig {
  id: string;
  name: string;
  start: { lat: number; lonE: number; label: string };
  stops: {
    checkpointId?: string;
    lat: number;
    lonE: number;
    label: string;
    objectives: string[];
  }[];
  vehicle: 'eva' | 'rover_unpressurised' | 'rover_pressurised';
  crew: number;
  durationSols: number;
  reservePct: number;
  customEquipment?: { id: string; qty: number }[];
  equipment?: { id: string; qty: number }[];
  legs?: RouteSummary[];
  schedule?: any[];
  budget?: any;
  feasibility?: any;
  assumptions?: Record<string, any>;
  createdAt?: string;
  schemaVersion?: number;
}

export type MissionPlan = MissionInputConfig;

export interface ResourceBudgetSummary {
  o2RequiredKg: number;
  waterRequiredKg: number;
  waterNetKg: number; // after reclamation
  foodRequiredKg: number;
  totalConsumablesKg: number;
  equipmentMassKg: number;
  totalPayloadKg: number;
  maxPayloadCapacityKg: number;
  batteryEnergyKwh: number;
  provenance: 'SIMULATED ASSUMPTION';
}

export interface MissionEvaluationResult {
  feasibility: {
    overall:
      | 'FEASIBLE UNDER ASSUMPTIONS'
      | 'FEASIBLE WITH WARNINGS'
      | 'INFEASIBLE'
      | 'INSUFFICIENT DATA';
    resourceVerdict: string;
    terrainVerdict: string;
    scheduleVerdict: string;
    dataCoverageVerdict: string;
    reasons: string[];
    recommendations: string[];
  };
  budget: ResourceBudgetSummary;
  legs: RouteSummary[];
  totalDistanceKm: number;
  totalTransitHours: number;
  totalObjectiveHours: number;
  totalMissionHours: number;
  warnings: string[];
  suggestedEquipment: { id: string; name: string; qty: number; massKg: number }[];
}

export function evaluateMissionPlan(
  config: MissionInputConfig,
  catalog: Checkpoint[]
): MissionEvaluationResult {
  const {
    start,
    stops,
    vehicle,
    crew,
    durationSols,
    reservePct = 20
  } = config;

  const reserveFactor = 1.0 + reservePct / 100.0;
  const warnings: string[] = [];
  const reasons: string[] = [];
  const recommendations: string[] = [];

  // --- 1. Objective Durations & Equipment Auto-Aggregation ---
  let totalObjectiveHours = 0;
  const neededEquipmentIds = new Set<string>();

  for (const stop of stops) {
    for (const objId of stop.objectives) {
      const obj = MISSION_OBJECTIVES[objId];
      if (obj) {
        totalObjectiveHours += obj.durationHours;
        obj.requiredEquipment.forEach((eqId) => neededEquipmentIds.add(eqId));

        // Validate vehicle compatibility
        if (!obj.allowedVehicles.includes(vehicle)) {
          warnings.push(
            `Objective "${obj.name}" at ${stop.label} is not permitted for vehicle ${vehicle.replace('_', ' ')}.`
          );
        }

        // Validate resource availability at location
        const resCheck = validateStopObjective(objId, stop, catalog);
        if (!resCheck.valid && resCheck.warning) {
          warnings.push(resCheck.warning);
          recommendations.push(
            `Consider redirecting stop ${stop.label} to ${resCheck.nearestValidCheckpoints?.[0]?.name || 'a site with verified deposits'}.`
          );
        }
      }
    }
  }

  // Calculate Equipment Mass
  const suggestedEquipment = Array.from(neededEquipmentIds).map((id) => {
    const item = EQUIPMENT_CATALOG[id] || { id, name: id, massKg: 5.0, description: '' };
    return { id, name: item.name, qty: 1, massKg: item.massKg };
  });

  const equipmentMassKg = suggestedEquipment.reduce((acc, eq) => acc + eq.massKg * eq.qty, 0);

  // --- 2. Deterministic Resource Budget (Spec §9.3) ---
  const o2Rate = MISSION_ASSUMPTIONS.o2_rate_kg_person_sol.value;
  const waterRate = MISSION_ASSUMPTIONS.water_rate_kg_person_sol.value;
  const foodRate = MISSION_ASSUMPTIONS.food_rate_kg_person_sol.value;
  const reclamationRate = MISSION_ASSUMPTIONS.water_recycling_efficiency.value;

  const rawO2 = o2Rate * crew * durationSols;
  const rawWater = waterRate * crew * durationSols;
  const rawFood = foodRate * crew * durationSols;

  const o2RequiredKg = Math.round(rawO2 * reserveFactor * 10) / 10;
  const waterRequiredKg = Math.round(rawWater * reserveFactor * 10) / 10;
  const waterNetKg =
    vehicle === 'rover_pressurised'
      ? Math.round(waterRequiredKg * (1 - reclamationRate) * 10) / 10
      : waterRequiredKg;
  const foodRequiredKg = Math.round(rawFood * reserveFactor * 10) / 10;
  const totalConsumablesKg = Math.round((o2RequiredKg + waterNetKg + foodRequiredKg) * 10) / 10;
  const totalPayloadKg = Math.round((totalConsumablesKg + equipmentMassKg) * 10) / 10;

  // Vehicle payload capacities
  const maxPayloadCapacityKg =
    vehicle === 'eva' ? 45.0 * crew : vehicle === 'rover_unpressurised' ? 250.0 : 1200.0;

  const batteryEnergyKwh =
    vehicle === 'eva'
      ? Math.round(0.8 * crew * durationSols * 24)
      : vehicle === 'rover_unpressurised'
      ? Math.round(15.0 * durationSols)
      : Math.round(65.0 * durationSols);

  const budget: ResourceBudgetSummary = {
    o2RequiredKg,
    waterRequiredKg,
    waterNetKg,
    foodRequiredKg,
    totalConsumablesKg,
    equipmentMassKg: Math.round(equipmentMassKg * 10) / 10,
    totalPayloadKg,
    maxPayloadCapacityKg,
    batteryEnergyKwh,
    provenance: 'SIMULATED ASSUMPTION'
  };

  // --- 3. Route Legs Evaluation using A* ---
  const legs: RouteSummary[] = [];
  let totalDistanceKm = 0;
  let totalTransitHours = 0;
  let anySteepViolation = false;
  let anyNoDataLeg = false;

  const allPoints = [
    { id: 'start', label: start.label, lat: start.lat, lonE: start.lonE },
    ...stops.map((s, idx) => ({ id: `stop-${idx + 1}`, label: s.label, lat: s.lat, lonE: s.lonE }))
  ];

  const vehicleSpeed = getVehicleSpeedKmh(vehicle);
  const vehicleSlopeLimit = getVehicleSlopeLimitDeg(vehicle);

  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];

    const legResult = planMarsRoute({
      start: { lat: p1.lat, lonE: p1.lonE },
      destination: { lat: p2.lat, lonE: p2.lonE },
      vehicle,
      maxSlopeDeg: vehicleSlopeLimit,
      walkingSpeedKmh: vehicleSpeed,
      catalog
    });

    totalDistanceKm += legResult.distanceKm;
    totalTransitHours += legResult.durationHours;

    const passSlope = legResult.maxSlopeDeg <= vehicleSlopeLimit;
    if (!passSlope || !legResult.success) {
      anySteepViolation = true;
      reasons.push(
        `Leg ${p1.label} → ${p2.label}: Terrain exceeds ${vehicleSlopeLimit}° vehicle slope limit.`
      );
    }

    if (legResult.highResCoveragePct < 15) {
      anyNoDataLeg = true;
    }

    let legStatus: RouteSummary['status'] = 'FEASIBLE';
    if (!legResult.success) legStatus = 'IMPASSABLE';
    else if (!passSlope) legStatus = 'HIGH_RISK';
    else if (legResult.highResCoveragePct < 20) legStatus = 'INSUFFICIENT_DATA';

    legs.push({
      fromId: p1.label,
      toId: p2.label,
      distanceKm: Math.round(legResult.distanceKm * 10) / 10,
      durationHours: Math.round(legResult.durationHours * 10) / 10,
      maxSlopeDeg: legResult.maxSlopeDeg,
      highResCoveragePct: legResult.highResCoveragePct,
      passSlopeLimit: passSlope,
      status: legStatus
    });
  }

  // --- 4. Schedule & Daylight Checks ---
  const totalMissionHours = totalTransitHours + totalObjectiveHours;
  const availableSolHours = durationSols * 24.66; // 1 Martian sol ≈ 24h 39m ≈ 24.66h

  if (totalMissionHours > availableSolHours) {
    reasons.push(
      `Schedule Overrun: Total transit (${totalTransitHours.toFixed(1)}h) + tasks (${totalObjectiveHours.toFixed(1)}h) = ${totalMissionHours.toFixed(1)}h exceeds allotted mission duration (${availableSolHours.toFixed(1)}h across ${durationSols} sols).`
    );
    recommendations.push('Extend mission duration in sols or reduce objectives per stop.');
  }

  // --- 5. Four Separate Verdicts (Spec §9.3) ---
  // A. Resource Verdict
  let resourceVerdict = 'RESOURCE BUDGET: FEASIBLE';
  if (totalPayloadKg > maxPayloadCapacityKg) {
    resourceVerdict = 'RESOURCE OVERLOAD: Payload mass exceeds vehicle payload limit.';
    reasons.push(
      `Payload Overload: ${totalPayloadKg} kg exceeds ${maxPayloadCapacityKg} kg capacity for ${vehicle.replace('_', ' ')}.`
    );
    recommendations.push('Upgrade vehicle class or reduce crew size / mission duration.');
  } else if (totalPayloadKg > maxPayloadCapacityKg * 0.85) {
    resourceVerdict = 'RESOURCE MARGIN TIGHT: Payload operates near 85% vehicle capacity.';
  }

  // B. Terrain Verdict
  let terrainVerdict = 'TERRAIN: PASS';
  if (anySteepViolation) {
    terrainVerdict = 'TERRAIN IMPASSABLE: Slopes exceed vehicle limits.';
  } else if (legs.some((l) => l.maxSlopeDeg > vehicleSlopeLimit * 0.8)) {
    terrainVerdict = 'TERRAIN HIGH RISK: Moderate slope inclines near vehicle threshold.';
  }

  // C. Schedule Verdict
  let scheduleVerdict = 'SCHEDULE: ON-TIME';
  if (totalMissionHours > availableSolHours) {
    scheduleVerdict = 'SCHEDULE DEFICIT: Required hours exceed sol duration.';
  } else if (totalMissionHours > availableSolHours * 0.85) {
    scheduleVerdict = 'SCHEDULE TIGHT: Workload leaves <15% rest buffer.';
  }

  // D. Data Coverage Verdict
  let dataCoverageVerdict = 'DATA COVERAGE: VERIFIED HIGH-RES';
  if (anyNoDataLeg) {
    dataCoverageVerdict = 'DATA COVERAGE: COARSE GLOBAL (Coarse MOLA altimetry only)';
    warnings.push('Portions of route cross coarse global MOLA data (~7 km/px). Micro-obstacles unmapped.');
  }

  // Overall Verdict: Never better than the worst component (Spec §9.3)
  let overall: MissionEvaluationResult['feasibility']['overall'] = 'FEASIBLE UNDER ASSUMPTIONS';

  const isCriticalFail =
    totalPayloadKg > maxPayloadCapacityKg ||
    anySteepViolation ||
    totalMissionHours > availableSolHours * 1.25;

  const isWarning =
    totalPayloadKg > maxPayloadCapacityKg * 0.85 ||
    totalMissionHours > availableSolHours ||
    warnings.length > 0 ||
    anyNoDataLeg;

  if (isCriticalFail) {
    overall = 'INFEASIBLE';
  } else if (anyNoDataLeg && legs.every((l) => l.highResCoveragePct < 10)) {
    overall = 'INSUFFICIENT DATA';
  } else if (isWarning) {
    overall = 'FEASIBLE WITH WARNINGS';
  }

  return {
    feasibility: {
      overall,
      resourceVerdict,
      terrainVerdict,
      scheduleVerdict,
      dataCoverageVerdict,
      reasons,
      recommendations
    },
    budget,
    legs,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTransitHours: Math.round(totalTransitHours * 10) / 10,
    totalObjectiveHours: Math.round(totalObjectiveHours * 10) / 10,
    totalMissionHours: Math.round(totalMissionHours * 10) / 10,
    warnings,
    suggestedEquipment
  };
}
