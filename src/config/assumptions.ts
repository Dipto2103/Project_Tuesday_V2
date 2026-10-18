/**
 * MARS LANTERN — Simulation Assumptions & Scientific Constants
 * 
 * Central registry of all physiological, vehicle mobility, consumable rate,
 * and terrain scoring constants used in Route Planning and Mission Building.
 * 
 * SCIENTIFIC PROVENANCE:
 * Every constant carries source: 'SIMULATED ASSUMPTION' or 'NASA-DERIVED'.
 * Reference: MARS_LANTERN_SPEC.md §8.5, §9.3
 */

export interface AssumptionConstant<T = number> {
  id: string;
  label: string;
  value: T;
  unit: string;
  category: 'life_support' | 'mobility' | 'power' | 'terrain' | 'reserve';
  source: 'SIMULATED ASSUMPTION' | 'NASA-DERIVED' | 'MEASURED';
  description: string;
}

export const MISSION_ASSUMPTIONS: Record<string, AssumptionConstant> = {
  // --- Life Support & Physiological Rates ---
  o2_rate_kg_person_sol: {
    id: 'o2_rate_kg_person_sol',
    label: 'Oxygen Consumption Rate',
    value: 0.84,
    unit: 'kg/person/sol',
    category: 'life_support',
    source: 'SIMULATED ASSUMPTION',
    description: 'Nominal metabolic oxygen demand for active astronaut during Martian surface operations (NASA BVAD standard).'
  },
  water_rate_kg_person_sol: {
    id: 'water_rate_kg_person_sol',
    label: 'Water Consumption Rate',
    value: 2.5,
    unit: 'kg/person/sol',
    category: 'life_support',
    source: 'SIMULATED ASSUMPTION',
    description: 'Drinking and food rehydration water requirement per astronaut sol.'
  },
  water_recycling_efficiency: {
    id: 'water_recycling_efficiency',
    label: 'Habitat Water Reclamation Efficiency',
    value: 0.85,
    unit: 'ratio',
    category: 'life_support',
    source: 'SIMULATED ASSUMPTION',
    description: 'Percentage of gray/black water recovered through ECLSS vapor compression distillation.'
  },
  food_rate_kg_person_sol: {
    id: 'food_rate_kg_person_sol',
    label: 'Dry Food Consumption Rate',
    value: 0.82,
    unit: 'kg/person/sol',
    category: 'life_support',
    source: 'SIMULATED ASSUMPTION',
    description: 'Calorically dense dehydrated food rations providing ~3,000 kcal/sol.'
  },
  co2_production_kg_person_sol: {
    id: 'co2_production_kg_person_sol',
    label: 'Carbon Dioxide Production',
    value: 1.0,
    unit: 'kg/person/sol',
    category: 'life_support',
    source: 'SIMULATED ASSUMPTION',
    description: 'Metabolic CO2 exhalation rate requiring scrubbers or amine beds.'
  },
  max_eva_duration_hours: {
    id: 'max_eva_duration_hours',
    label: 'Maximum Single EVA Duration',
    value: 8.0,
    unit: 'hours',
    category: 'life_support',
    source: 'SIMULATED ASSUMPTION',
    description: 'Hard safety limit for spacesuit primary life-support system (PLSS) consumables.'
  },

  // --- Vehicle Mobility & Speeds ---
  speed_eva_kmh: {
    id: 'speed_eva_kmh',
    label: 'EVA Foot Traverse Speed',
    value: 0.8,
    unit: 'km/h',
    category: 'mobility',
    source: 'SIMULATED ASSUMPTION',
    description: 'Typical astronaut walking speed in pressurized suit over undulating Martian regolith.'
  },
  speed_rover_unpressurised_kmh: {
    id: 'speed_rover_unpressurised_kmh',
    label: 'Unpressurized Light Rover Speed',
    value: 8.0,
    unit: 'km/h',
    category: 'mobility',
    source: 'SIMULATED ASSUMPTION',
    description: 'Cruising speed for open Apollo-style Lunar Roving Vehicle adapted for Mars.'
  },
  speed_rover_pressurised_kmh: {
    id: 'speed_rover_pressurised_kmh',
    label: 'Pressurized Exploration Rover Speed',
    value: 14.0,
    unit: 'km/h',
    category: 'mobility',
    source: 'SIMULATED ASSUMPTION',
    description: 'Safe cruising speed for multi-wheel pressurized habitat rover (e.g. SEV class).'
  },

  // --- Vehicle Slope Limits ---
  slope_limit_eva_deg: {
    id: 'slope_limit_eva_deg',
    label: 'EVA Maximum Slope Limit',
    value: 15.0,
    unit: 'deg',
    category: 'mobility',
    source: 'SIMULATED ASSUMPTION',
    description: 'Maximum incline negotiable by suited crew before slip and fall risk becomes excessive.'
  },
  slope_limit_unpressurised_deg: {
    id: 'slope_limit_unpressurised_deg',
    label: 'Unpressurized Rover Slope Limit',
    value: 20.0,
    unit: 'deg',
    category: 'mobility',
    source: 'SIMULATED ASSUMPTION',
    description: 'Wheel traction limit on loose sand and scree slopes.'
  },
  slope_limit_pressurised_deg: {
    id: 'slope_limit_pressurised_deg',
    label: 'Pressurized Rover Slope Limit',
    value: 25.0,
    unit: 'deg',
    category: 'mobility',
    source: 'SIMULATED ASSUMPTION',
    description: 'Chassis rollover and suspension threshold on steep crater walls.'
  },

  // --- Terrain Scoring Weights (Spec §8.5) ---
  weight_slope: {
    id: 'weight_slope',
    label: 'Terrain Penalty Slope Weight',
    value: 0.45,
    unit: 'weight',
    category: 'terrain',
    source: 'SIMULATED ASSUMPTION',
    description: 'Weight of local terrain gradient in composite traversability scoring.'
  },
  weight_roughness: {
    id: 'weight_roughness',
    label: 'Terrain Penalty Roughness Weight',
    value: 0.25,
    unit: 'weight',
    category: 'terrain',
    source: 'SIMULATED ASSUMPTION',
    description: 'Weight of surface elevation variance (500m scale) in penalty score.'
  },
  weight_hazard: {
    id: 'weight_hazard',
    label: 'Terrain Penalty Hazard Proximity Weight',
    value: 0.20,
    unit: 'weight',
    category: 'terrain',
    source: 'SIMULATED ASSUMPTION',
    description: 'Weight of mapped cliffs, dune fields, and scarps within 25 km.'
  },
  weight_uncertainty: {
    id: 'weight_uncertainty',
    label: 'Terrain Penalty Data Uncertainty Weight',
    value: 0.10,
    unit: 'weight',
    category: 'terrain',
    source: 'SIMULATED ASSUMPTION',
    description: 'Penalty for unverified or coarse orbital data coverage (unknown ≠ safe).'
  },

  // --- Reserve Margins ---
  default_safety_reserve_pct: {
    id: 'default_safety_reserve_pct',
    label: 'Mission Reserve Margin',
    value: 20.0,
    unit: '%',
    category: 'reserve',
    source: 'SIMULATED ASSUMPTION',
    description: 'Mandatory contingency reserve added on top of all calculated consumable budgets.'
  }
};

/**
 * Returns speed in km/h for a given vehicle type.
 */
export function getVehicleSpeedKmh(vehicle: 'eva' | 'rover_unpressurised' | 'rover_pressurised'): number {
  switch (vehicle) {
    case 'eva':
      return MISSION_ASSUMPTIONS.speed_eva_kmh.value;
    case 'rover_unpressurised':
      return MISSION_ASSUMPTIONS.speed_rover_unpressurised_kmh.value;
    case 'rover_pressurised':
      return MISSION_ASSUMPTIONS.speed_rover_pressurised_kmh.value;
    default:
      return 1.0;
  }
}

/**
 * Returns maximum traversable slope limit in degrees for a given vehicle type.
 */
export function getVehicleSlopeLimitDeg(vehicle: 'eva' | 'rover_unpressurised' | 'rover_pressurised'): number {
  switch (vehicle) {
    case 'eva':
      return MISSION_ASSUMPTIONS.slope_limit_eva_deg.value;
    case 'rover_unpressurised':
      return MISSION_ASSUMPTIONS.slope_limit_unpressurised_deg.value;
    case 'rover_pressurised':
      return MISSION_ASSUMPTIONS.slope_limit_pressurised_deg.value;
    default:
      return 20.0;
  }
}
