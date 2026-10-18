import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Flame,
  Heart,
  BatteryCharging,
  Gauge,
  Thermometer,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Clock,
  Compass,
  Zap,
  Activity
} from 'lucide-react';
import { MISSION_ASSUMPTIONS } from '../../config/assumptions';
import { SourceBadge } from '../common/SourceBadge';
import type { MissionPlan } from '../../core/mission/evaluation';

interface SurvivalDashboardProps {
  activePlan?: MissionPlan | null;
  onNavigateToPlanner?: () => void;
}

export const SurvivalDashboard: React.FC<SurvivalDashboardProps> = ({
  activePlan,
  onNavigateToPlanner
}) => {
  // Mission parameters from activePlan or defaults
  const crewSize = activePlan?.crew ?? 4;
  const durationSols = activePlan?.durationSols ?? 14;
  const vehicle = activePlan?.vehicle ?? 'rover_pressurised';
  const reservePct = activePlan?.reservePct ?? 20;

  // Contingency simulation toggles
  const [eclssFailure, setEclssFailure] = useState<boolean>(false);
  const [dustStormActive, setDustStormActive] = useState<boolean>(false);
  const [drivetrainDegraded, setDrivetrainDegraded] = useState<boolean>(false);

  // Sol simulation scrubber (day of mission)
  const [currentMissionSol, setCurrentMissionSol] = useState<number>(3);

  // Consumables calculation with contingencies
  const metrics = useMemo(() => {
    const o2Rate = Number(MISSION_ASSUMPTIONS.o2_rate_kg_person_sol?.value ?? 0.84);
    const h2oRate = Number(MISSION_ASSUMPTIONS.water_rate_kg_person_sol?.value ?? 2.5);
    const calRate = Number(MISSION_ASSUMPTIONS.food_rate_kcal_person_sol?.value ?? 2800);

    // Base ECLSS recycling
    const eclssH2oRecovery = eclssFailure ? 0.30 : (Number(MISSION_ASSUMPTIONS.eclss_water_recovery_pct?.value ?? 85) / 100);
    const netWaterPerSol = h2oRate * (1 - eclssH2oRecovery) * crewSize;
    const netO2PerSol = o2Rate * crewSize;
    const netFoodPerSol = calRate * crewSize;

    const totalDays = durationSols;
    const totalWaterInitial = netWaterPerSol * totalDays * (1 + reservePct / 100);
    const totalO2Initial = netO2PerSol * totalDays * (1 + reservePct / 100);
    const totalFoodInitial = netFoodPerSol * totalDays * (1 + reservePct / 100);

    const elapsedDays = Math.min(totalDays, currentMissionSol);
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    const waterConsumed = netWaterPerSol * elapsedDays;
    const o2Consumed = netO2PerSol * elapsedDays;
    const foodConsumed = netFoodPerSol * elapsedDays;

    const waterRemaining = Math.max(0, totalWaterInitial - waterConsumed);
    const o2Remaining = Math.max(0, totalO2Initial - o2Consumed);
    const foodRemaining = Math.max(0, totalFoodInitial - foodConsumed);

    // Days until depletion at current rate
    const waterDaysLeft = netWaterPerSol > 0 ? waterRemaining / netWaterPerSol : 999;
    const o2DaysLeft = netO2PerSol > 0 ? o2Remaining / netO2PerSol : 999;
    const foodDaysLeft = netFoodPerSol > 0 ? foodRemaining / netFoodPerSol : 999;

    // Power & battery state
    const batteryCapacityKwh = vehicle === 'rover_pressurised' ? 120 : vehicle === 'rover_unpressurised' ? 40 : 5;
    const baseSolarOutputKw = dustStormActive ? 0.2 : 4.5;
    const dailyPowerUsageKwh = crewSize * 8 + (vehicle === 'rover_pressurised' ? 24 : 8);

    // Return to base abort margin
    // Max vehicle speed
    const baseSpeed = vehicle === 'rover_pressurised' ? 14 : vehicle === 'rover_unpressurised' ? 8 : 0.8;
    const effectiveSpeed = drivetrainDegraded ? baseSpeed * 0.5 : baseSpeed;
    const maxSafeRangeKm = effectiveSpeed * 8 * Math.min(waterDaysLeft, o2DaysLeft);

    const isAbortTriggered = waterDaysLeft < remainingDays || o2DaysLeft < remainingDays || dustStormActive;

    return {
      totalWaterInitial,
      waterRemaining,
      waterPct: Math.round((waterRemaining / totalWaterInitial) * 100),
      waterDaysLeft: Math.round(waterDaysLeft * 10) / 10,

      totalO2Initial,
      o2Remaining,
      o2Pct: Math.round((o2Remaining / totalO2Initial) * 100),
      o2DaysLeft: Math.round(o2DaysLeft * 10) / 10,

      totalFoodInitial,
      foodRemaining,
      foodPct: Math.round((foodRemaining / totalFoodInitial) * 100),
      foodDaysLeft: Math.round(foodDaysLeft * 10) / 10,

      batteryCapacityKwh,
      baseSolarOutputKw,
      dailyPowerUsageKwh,

      effectiveSpeed,
      maxSafeRangeKm: Math.round(maxSafeRangeKm),
      isAbortTriggered,
      remainingDays
    };
  }, [crewSize, durationSols, vehicle, reservePct, eclssFailure, dustStormActive, drivetrainDegraded, currentMissionSol]);

  return (
    <div className="space-y-6 text-mars-text">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mars-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white">
              Life Support & Survival Center
            </h2>
          </div>
          <p className="text-xs text-mars-muted font-mono mt-0.5">
            Active Mission Telemetry · Crew of {crewSize} · {vehicle.replace('_', ' ').toUpperCase()} · Mission Sol {currentMissionSol} of {durationSols}
          </p>
        </div>

        {/* Abort Status Badge */}
        <div className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 font-bold ${
          metrics.isAbortTriggered
            ? 'bg-rose-950/70 border-rose-600 text-rose-300 animate-pulse'
            : 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{metrics.isAbortTriggered ? 'CONTINGENCY: ABORT CRITERIA ACTIVE' : 'NOMINAL LIFE SUPPORT ENVELOPE'}</span>
        </div>
      </div>

      {/* Contingency Simulation Injector */}
      <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-mars-orange" />
            Contingency & Malfunction Injection
          </span>
          <span className="text-[10px] bg-amber-950/60 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800/40">
            SIMULATION MODE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* ECLSS Failure */}
          <button
            onClick={() => setEclssFailure(!eclssFailure)}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              eclssFailure
                ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                : 'bg-mars-dark border-mars-border text-mars-muted hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>ECLSS Recycling Fault</span>
              <span className={`text-[10px] ${eclssFailure ? 'text-rose-400' : 'text-mars-muted'}`}>
                {eclssFailure ? '85% → 30%' : '85% Nominal'}
              </span>
            </div>
            <div className="text-[10px] text-mars-muted/80 mt-1">Water loop membrane degraded</div>
          </button>

          {/* Dust Storm */}
          <button
            onClick={() => setDustStormActive(!dustStormActive)}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              dustStormActive
                ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                : 'bg-mars-dark border-mars-border text-mars-muted hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>Global Dust Storm</span>
              <span className={`text-[10px] ${dustStormActive ? 'text-amber-400' : 'text-mars-muted'}`}>
                {dustStormActive ? 'tau = 3.2' : 'tau = 0.5'}
              </span>
            </div>
            <div className="text-[10px] text-mars-muted/80 mt-1">Solar array obscured (-95%)</div>
          </button>

          {/* Drivetrain Fault */}
          <button
            onClick={() => setDrivetrainDegraded(!drivetrainDegraded)}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              drivetrainDegraded
                ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                : 'bg-mars-dark border-mars-border text-mars-muted hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>Drivetrain Motor Fault</span>
              <span className={`text-[10px] ${drivetrainDegraded ? 'text-amber-400' : 'text-mars-muted'}`}>
                {drivetrainDegraded ? 'Speed Halved' : 'Full Speed'}
              </span>
            </div>
            <div className="text-[10px] text-mars-muted/80 mt-1">Right rocker bogie actuator hot</div>
          </button>
        </div>

        {/* Mission Timeline Scrubber */}
        <div className="pt-2 border-t border-mars-border/50 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-mars-muted flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-mars-sand" />
              Simulated Elapsed Mission Sol:
            </span>
            <span className="text-mars-sand font-bold">
              Sol {currentMissionSol} of {durationSols} ({metrics.remainingDays} Sols Remaining)
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={durationSols}
            step="1"
            value={currentMissionSol}
            onChange={(e) => setCurrentMissionSol(parseInt(e.target.value, 10))}
            className="w-full accent-mars-orange h-1.5 bg-mars-dark rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Consumables Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
        {/* Oxygen */}
        <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-2">
          <div className="flex items-center justify-between text-mars-muted text-[11px]">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-400" />
              OXYGEN (O₂) RESERVES
            </span>
            <span className="font-bold text-white">{metrics.o2Pct}%</span>
          </div>

          <div className="w-full bg-mars-dark rounded-full h-2 overflow-hidden border border-mars-border">
            <div
              className={`h-full transition-all ${metrics.o2DaysLeft < metrics.remainingDays ? 'bg-rose-500' : 'bg-sky-500'}`}
              style={{ width: `${metrics.o2Pct}%` }}
            />
          </div>

          <div className="text-[11px] flex justify-between pt-1">
            <span className="text-white font-bold">{metrics.o2Remaining.toFixed(1)} kg left</span>
            <span className={metrics.o2DaysLeft < metrics.remainingDays ? 'text-rose-400 font-bold' : 'text-mars-muted'}>
              {metrics.o2DaysLeft} sols margin
            </span>
          </div>
        </div>

        {/* Water */}
        <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-2">
          <div className="flex items-center justify-between text-mars-muted text-[11px]">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-mars-cyan" />
              WATER (H₂O) RESERVES
            </span>
            <span className="font-bold text-white">{metrics.waterPct}%</span>
          </div>

          <div className="w-full bg-mars-dark rounded-full h-2 overflow-hidden border border-mars-border">
            <div
              className={`h-full transition-all ${metrics.waterDaysLeft < metrics.remainingDays ? 'bg-rose-500' : 'bg-mars-cyan'}`}
              style={{ width: `${metrics.waterPct}%` }}
            />
          </div>

          <div className="text-[11px] flex justify-between pt-1">
            <span className="text-white font-bold">{metrics.waterRemaining.toFixed(1)} L left</span>
            <span className={metrics.waterDaysLeft < metrics.remainingDays ? 'text-rose-400 font-bold' : 'text-mars-muted'}>
              {metrics.waterDaysLeft} sols margin
            </span>
          </div>
        </div>

        {/* Food */}
        <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-2">
          <div className="flex items-center justify-between text-mars-muted text-[11px]">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              NUTRITIONAL RATIONS
            </span>
            <span className="font-bold text-white">{metrics.foodPct}%</span>
          </div>

          <div className="w-full bg-mars-dark rounded-full h-2 overflow-hidden border border-mars-border">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${metrics.foodPct}%` }}
            />
          </div>

          <div className="text-[11px] flex justify-between pt-1">
            <span className="text-white font-bold">{Math.round(metrics.foodRemaining / 1000)}k kcal</span>
            <span className="text-mars-muted">{metrics.foodDaysLeft} sols margin</span>
          </div>
        </div>
      </div>

      {/* Point of No Return & Abort Envelope */}
      <div className="p-4 rounded-xl bg-mars-surface border border-mars-border space-y-3 font-mono text-xs">
        <h3 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Compass className="w-4 h-4 text-mars-orange" />
          Point of No Return & Return-to-Base (RTB) Envelope
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-mars-dark border border-mars-border space-y-1">
            <div className="text-[10px] text-mars-muted">EFFECTIVE RETURN SPEED</div>
            <div className="text-base font-bold text-white">{metrics.effectiveSpeed} km/h</div>
            <div className="text-[10px] text-mars-muted">Nominal vehicle traverse rate</div>
          </div>

          <div className="p-3 rounded-lg bg-mars-dark border border-mars-border space-y-1">
            <div className="text-[10px] text-mars-muted">MAX SAFE SORTIE RADIUS</div>
            <div className="text-base font-bold text-mars-sand">{metrics.maxSafeRangeKm} km</div>
            <div className="text-[10px] text-mars-muted">Constrained by lowest consumable</div>
          </div>

          <div className="p-3 rounded-lg bg-mars-dark border border-mars-border space-y-1">
            <div className="text-[10px] text-mars-muted">SOLAR POWER GENERATION</div>
            <div className={`text-base font-bold ${dustStormActive ? 'text-rose-400' : 'text-emerald-400'}`}>
              {metrics.baseSolarOutputKw} kW
            </div>
            <div className="text-[10px] text-mars-muted">Usage: {metrics.dailyPowerUsageKwh} kWh/sol</div>
          </div>
        </div>
      </div>
    </div>
  );
};
