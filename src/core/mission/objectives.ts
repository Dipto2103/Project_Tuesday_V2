/**
 * MARS LANTERN — Mission Objectives & Equipment Catalog
 * 
 * Defines mission objectives, equipment inventory, vehicle constraints,
 * and resource prerequisites according to Spec §9.1 and §9.2.
 * 
 * Pure TypeScript — zero DOM, zero React.
 */

import type { ResourceType, Checkpoint } from '../types';
import { haversineKm } from '../geo';

export interface MissionObjectiveDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  durationHours: number;
  payloadKg: number;
  powerWh: number;
  requiredEquipment: string[];
  allowedVehicles: ('eva' | 'rover_unpressurised' | 'rover_pressurised')[];
  daylightRequired: boolean;
  resourceTypeRequired?: ResourceType;
}

export interface EquipmentItem {
  id: string;
  name: string;
  category: 'science' | 'isru' | 'power' | 'maintenance' | 'storage';
  massKg: number;
  description: string;
}

export const EQUIPMENT_CATALOG: Record<string, EquipmentItem> = {
  core_drill: {
    id: 'core_drill',
    name: 'Subsurface Core Drill (1m)',
    category: 'science',
    massKg: 12.0,
    description: 'Rotary-percussive drill capable of extracting intact cryogenic water-ice and rock cores.'
  },
  cryo_container: {
    id: 'cryo_container',
    name: 'Cryogenic Sample Vault',
    category: 'science',
    massKg: 8.5,
    description: 'Vacuum-insulated Dewar container maintaining samples below -80 °C sublimation temperature.'
  },
  raman_spectrometer: {
    id: 'raman_spectrometer',
    name: 'Miniature Raman Spectrometer',
    category: 'science',
    massKg: 4.2,
    description: 'In-situ laser mineral identification for phyllosilicates, carbonates, and sulfates.'
  },
  rock_hammer: {
    id: 'rock_hammer',
    name: 'Titanium Geological Hammer',
    category: 'science',
    massKg: 1.5,
    description: 'Field tool for chipping outcrops and exposing unweathered rock surfaces.'
  },
  regolith_scoop: {
    id: 'regolith_scoop',
    name: 'Pneumatic Regolith Scoop',
    category: 'isru',
    massKg: 5.0,
    description: 'Bulk soil extraction tool for ISRU feedstock collection.'
  },
  sieve_kit: {
    id: 'sieve_kit',
    name: 'Vibratory Sieve Array',
    category: 'isru',
    massKg: 6.5,
    description: 'Particle size separation kit (250 μm to 2 mm) for grain classification.'
  },
  sample_bags: {
    id: 'sample_bags',
    name: 'Sterile Sample Bags (Set of 20)',
    category: 'science',
    massKg: 1.0,
    description: 'Tear-resistant clean bags for dry surface regolith and rock chips.'
  },
  hand_lens: {
    id: 'hand_lens',
    name: 'Macro Hand Lens (10x-30x)',
    category: 'science',
    massKg: 0.3,
    description: 'High-resolution optical magnifier for crystallographic examination.'
  },
  sensor_package: {
    id: 'sensor_package',
    name: 'Autonomous Weather/Seismic Station',
    category: 'power',
    massKg: 18.0,
    description: 'Surface package with anemometer, barometric sensor, thermopile, and 3-axis seismometer.'
  },
  solar_mast: {
    id: 'solar_mast',
    name: 'Telescopic Solar Mast (300W)',
    category: 'power',
    massKg: 14.0,
    description: 'Deployable triple-junction solar panel with dust-repellent coating.'
  },
  tool_suite: {
    id: 'tool_suite',
    name: 'Habitat Maintenance Tool Suite',
    category: 'maintenance',
    massKg: 15.0,
    description: 'Torque wrenches, sealant dispensers, and diagnostic electrical meters.'
  },
  power_umbilical: {
    id: 'power_umbilical',
    name: 'High-Voltage Power Umbilical (50m)',
    category: 'power',
    massKg: 9.0,
    description: 'Ruggedized cold-resistant cable for linking vehicle power to deployable assets.'
  },
  camera_suite: {
    id: 'camera_suite',
    name: 'Multispectral Scientific Camera',
    category: 'science',
    massKg: 3.5,
    description: 'Calibrated imager with 8 bandpass filters from UV to near-infrared.'
  },
  cargo_canisters: {
    id: 'cargo_canisters',
    name: 'Pressurized Cargo Canisters (Set of 2)',
    category: 'storage',
    massKg: 16.0,
    description: 'Weatherproof survival cache canisters with thermal blanket liners.'
  }
};

export const MISSION_OBJECTIVES: Record<string, MissionObjectiveDef> = {
  water_ice_sample: {
    id: 'water_ice_sample',
    name: 'Collect Water-Ice Core Sample',
    description: 'Extract subsurface cryogenic ice core for isotopic and astrobiological analysis.',
    icon: '❄',
    durationHours: 3.5,
    payloadKg: 20.5,
    powerWh: 450,
    requiredEquipment: ['core_drill', 'cryo_container'],
    allowedVehicles: ['eva', 'rover_unpressurised', 'rover_pressurised'],
    daylightRequired: true,
    resourceTypeRequired: 'water_ice'
  },
  mineral_survey: {
    id: 'mineral_survey',
    name: 'Survey Clay & Sulfate Minerals',
    description: 'Perform spectroscopic survey and outcrop sampling of hydrous phyllosilicates.',
    icon: '💎',
    durationHours: 2.5,
    payloadKg: 5.7,
    powerWh: 180,
    requiredEquipment: ['raman_spectrometer', 'rock_hammer', 'sample_bags'],
    allowedVehicles: ['eva', 'rover_unpressurised', 'rover_pressurised'],
    daylightRequired: true,
    resourceTypeRequired: 'clay_minerals'
  },
  isru_regolith: {
    id: 'isru_regolith',
    name: 'Collect Regolith for ISRU',
    description: 'Excavate and sieve fine-grained basaltic regolith for oxygen extraction or 3D sintering.',
    icon: '⛏',
    durationHours: 4.0,
    payloadKg: 11.5,
    powerWh: 300,
    requiredEquipment: ['regolith_scoop', 'sieve_kit'],
    allowedVehicles: ['rover_unpressurised', 'rover_pressurised'],
    daylightRequired: false,
    resourceTypeRequired: 'basaltic_regolith'
  },
  geology_traverse: {
    id: 'geology_traverse',
    name: 'Field Geology Traverse',
    description: 'Document sedimentary structures, crater ejecta, and cross-bedding formations.',
    icon: '🥾',
    durationHours: 3.0,
    payloadKg: 2.8,
    powerWh: 50,
    requiredEquipment: ['rock_hammer', 'hand_lens', 'sample_bags'],
    allowedVehicles: ['eva', 'rover_unpressurised', 'rover_pressurised'],
    daylightRequired: true
  },
  deploy_sensor: {
    id: 'deploy_sensor',
    name: 'Deploy Weather/Seismic Station',
    description: 'Install and level an autonomous surface station for long-term MEDA/InSight cross-calibration.',
    icon: '📡',
    durationHours: 2.0,
    payloadKg: 32.0,
    powerWh: 200,
    requiredEquipment: ['sensor_package', 'solar_mast'],
    allowedVehicles: ['rover_unpressurised', 'rover_pressurised'],
    daylightRequired: true
  },
  habitat_install: {
    id: 'habitat_install',
    name: 'Install Habitat / Power Umbilical',
    description: 'Perform exterior maintenance, cable routing, and radiator inspection on base infrastructure.',
    icon: '⚡',
    durationHours: 4.5,
    payloadKg: 24.0,
    powerWh: 600,
    requiredEquipment: ['tool_suite', 'power_umbilical'],
    allowedVehicles: ['eva', 'rover_pressurised'],
    daylightRequired: false
  },
  sky_observation: {
    id: 'sky_observation',
    name: 'Atmospheric & Sky Observation',
    description: 'Measure aerosol optical depth (tau), dust devil frequency, and Phobos/Deimos transits.',
    icon: '🔭',
    durationHours: 1.5,
    payloadKg: 3.5,
    powerWh: 80,
    requiredEquipment: ['camera_suite'],
    allowedVehicles: ['eva', 'rover_unpressurised', 'rover_pressurised'],
    daylightRequired: false
  },
  photography: {
    id: 'photography',
    name: 'Multispectral Site Imaging',
    description: 'Capture 360° high-dynamic-range panoramic imaging of terrain and horizon features.',
    icon: '📷',
    durationHours: 1.0,
    payloadKg: 3.5,
    powerWh: 60,
    requiredEquipment: ['camera_suite'],
    allowedVehicles: ['eva', 'rover_unpressurised', 'rover_pressurised'],
    daylightRequired: true
  },
  resupply_cache: {
    id: 'resupply_cache',
    name: 'Deploy Survival Resupply Cache',
    description: 'Deposit sealed survival canisters containing emergency rations, O2 tanks, and first aid.',
    icon: '📦',
    durationHours: 2.0,
    payloadKg: 16.0,
    powerWh: 100,
    requiredEquipment: ['cargo_canisters'],
    allowedVehicles: ['rover_unpressurised', 'rover_pressurised'],
    daylightRequired: false
  }
};

/**
 * Checks whether a given checkpoint or coordinates can satisfy an objective's resource requirement.
 * If not, returns nearest valid checkpoints.
 */
export function validateStopObjective(
  objectiveId: string,
  stop: { lat: number; lonE: number; checkpointId?: string },
  catalog: Checkpoint[]
): {
  valid: boolean;
  warning?: string;
  nearestValidCheckpoints?: { name: string; distanceKm: number }[];
} {
  const obj = MISSION_OBJECTIVES[objectiveId];
  if (!obj || !obj.resourceTypeRequired) {
    return { valid: true };
  }

  // Find checkpoint if attached
  const cp = stop.checkpointId ? catalog.find((c) => c.id === stop.checkpointId) : null;

  // Check if checkpoint contains required resource
  const hasResource =
    cp && cp.resources && cp.resources.some((r) => r.type === obj.resourceTypeRequired);

  if (hasResource) {
    return { valid: true };
  }

  // Find nearest checkpoints that do offer this resource
  const candidates = catalog.filter(
    (c) => c.resources && c.resources.some((r) => r.type === obj.resourceTypeRequired)
  );

  const nearest = candidates
    .map((c) => ({
      name: c.name,
      distanceKm: Math.round(haversineKm(stop.lat, stop.lonE, c.lat, c.lonE) * 10) / 10
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  const reqName = obj.resourceTypeRequired.replace('_', ' ').toUpperCase();
  return {
    valid: false,
    warning: `Stop location lacks ${reqName} deposits required by "${obj.name}". Nearest valid deposit is at ${nearest[0]?.name || 'unknown'} (~${nearest[0]?.distanceKm || '?'} km away).`,
    nearestValidCheckpoints: nearest
  };
}
