import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Flame,
  Droplets,
  Apple,
  Gauge,
  Thermometer,
  Radio,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight
} from 'lucide-react';
import { MISSION_ASSUMPTIONS } from '../config/assumptions';
import { RingGauge } from '../components/ui/RingGauge';
import { StatCard } from '../components/ui/StatCard';
import { Checklist } from '../components/ui/Checklist';
import { ProvenanceBadge } from '../components/ui/ProvenanceBadge';
import { Button } from '../components/ui/Button';
import { estimateSurfaceTemperature } from '../core/temperature';
import { calculateMarsSky } from '../core/sky/mars24';

export const SurvivalPage: React.FC = () => {
  const navigate = useNavigate();

  // Crew & Mission parameters
  const [crewSize, setCrewSize] = useState<number>(4);
  const [missionSols, setMissionSols] = useState<number>(14);
  const [currentSol, setCurrentSol] = useState<number>(3);
  const [reservePct, setReservePct] = useState<number>(20);

  // Contingency simulation toggles
  const [eclssFailure, setEclssFailure] = useState<boolean>(false);
  const [dustStormActive, setDustStormActive] = useState<boolean>(false);

  // Compute modeled temperature & ephemeris
  const now = useMemo(() => new Date(), []);
  const skySnapshot = useMemo(() => calculateMarsSky(now, 18.4447, 77.4508), [now]);
  const tempEstimate = useMemo(() => estimateSurfaceTemperature(18.4447, -2500, skySnapshot.lsDeg), [skySnapshot.lsDeg]);

  // Consumables calculation with contingencies
  const metrics = useMemo(() => {
    const o2Rate = Number(MISSION_ASSUMPTIONS.o2_rate_kg_person_sol?.value ?? 0.84);
    const h2oRate = Number(MISSION_ASSUMPTIONS.water_rate_kg_person_sol?.value ?? 2.5);
    const calRate = Number(MISSION_ASSUMPTIONS.food_rate_kg_person_sol?.value ?? 0.82);

    // ECLSS recycling
    const eclssH2oRecovery = eclssFailure ? 0.30 : (Number(MISSION_ASSUMPTIONS.water_recycling_efficiency?.value ?? 0.85));
    const netWaterPerSol = h2oRate * (1 - eclssH2oRecovery) * crewSize;
    const netO2PerSol = o2Rate * crewSize;
    const netFoodPerSol = calRate * crewSize;

    const totalDays = missionSols;
    const totalWaterInitial = netWaterPerSol * totalDays * (1 + reservePct / 100);
    const totalO2Initial = netO2PerSol * totalDays * (1 + reservePct / 100);
    const totalFoodInitial = netFoodPerSol * totalDays * (1 + reservePct / 100);

    const elapsedDays = Math.min(totalDays, currentSol);
    const remainingDays = Math.max(0, totalDays - elapsedDays);

    const waterConsumed = netWaterPerSol * elapsedDays;
    const o2Consumed = netO2PerSol * elapsedDays;
    const foodConsumed = netFoodPerSol * elapsedDays;

    const waterRemaining = Math.max(0, totalWaterInitial - waterConsumed);
    const o2Remaining = Math.max(0, totalO2Initial - o2Consumed);
    const foodRemaining = Math.max(0, totalFoodInitial - foodConsumed);

    const waterPct = Math.round((waterRemaining / totalWaterInitial) * 100);
    const o2Pct = Math.round((o2Remaining / totalO2Initial) * 100);
    const foodPct = Math.round((foodRemaining / totalFoodInitial) * 100);

    const waterDaysLeft = netWaterPerSol > 0 ? waterRemaining / netWaterPerSol : 999;
    const o2DaysLeft = netO2PerSol > 0 ? o2Remaining / netO2PerSol : 999;
    const foodDaysLeft = netFoodPerSol > 0 ? foodRemaining / netFoodPerSol : 999;

    // Overall status verdict
    const isCritical = o2DaysLeft < remainingDays || waterDaysLeft < remainingDays || eclssFailure;
    const isWarning = dustStormActive || o2Pct < 40 || waterPct < 40;

    const statusRisk = isCritical ? 'HIGH' : isWarning ? 'MODERATE' : 'LOW';
    const statusText = isCritical
      ? 'Life support reserves depleted below mission buffer'
      : isWarning
      ? 'ECLSS under stress — monitor active reserves'
      : 'Conditions are stable';

    return {
      waterPct,
      waterDaysLeft: Math.round(waterDaysLeft * 10) / 10,
      o2Pct,
      o2DaysLeft: Math.round(o2DaysLeft * 10) / 10,
      foodPct,
      foodDaysLeft: Math.round(foodDaysLeft * 10) / 10,
      statusRisk,
      statusText
    };
  }, [crewSize, missionSols, currentSol, reservePct, eclssFailure, dustStormActive]);

  // Daily checklist items from concept Panel 03
  const dailyChecklistItems = [
    { id: 'chk-o2', label: 'Check oxygen levels', defaultChecked: true },
    { id: 'chk-water', label: 'Check water supply', defaultChecked: true },
    { id: 'chk-food', label: 'Check food reserves', defaultChecked: false },
    { id: 'chk-press', label: 'Inspect habitat pressure', defaultChecked: false },
    { id: 'chk-weather', label: 'Review weather forecast', defaultChecked: false },
    { id: 'chk-plan', label: 'Plan next exploration', defaultChecked: false }
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 text-[#E7E1D8]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(231,225,216,0.10)] pb-6">
        <div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl uppercase tracking-wider text-white">
            SURVIVAL DASHBOARD
          </h1>
          <p className="font-sans text-sm text-[#A0A0A0] mt-1">
            Monitor your life support and environment
          </p>
        </div>

        {/* Top-Right Status Pill */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-lg ${
              metrics.statusRisk === 'LOW'
                ? 'bg-[#4ADE80]/15 border-[#4ADE80]/40 text-[#4ADE80]'
                : metrics.statusRisk === 'MODERATE'
                ? 'bg-[#F5B544]/15 border-[#F5B544]/40 text-[#F5B544]'
                : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                metrics.statusRisk === 'LOW'
                  ? 'bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.8)]'
                  : metrics.statusRisk === 'MODERATE'
                  ? 'bg-[#F5B544] shadow-[0_0_8px_rgba(245,181,68,0.8)]'
                  : 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]'
              }`}
            />
            <span className="font-mono font-bold text-xs">{metrics.statusRisk}</span>
            <span className="text-xs font-sans text-[#E7E1D8] hidden sm:inline">
              {metrics.statusText}
            </span>
          </div>
          <ProvenanceBadge type="SIMULATED" source="NASA BVAD Standards" showIcon={false} />
        </div>
      </div>

      {/* Main Grid: 12 Columns matching concept board */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: Gauges & Telemetry Cards */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Row 1: Three RingGauge Cards (Oxygen, Water, Food) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RingGauge
              label="OXYGEN"
              percentage={metrics.o2Pct}
              remainingText={`${metrics.o2DaysLeft} days remaining`}
              icon={<Flame className="w-4 h-4 text-[#4ADE80]" />}
              strokeColor="#4ADE80"
              statusText={metrics.o2Pct > 50 ? 'Nominal' : 'Low'}
              statusLevel={metrics.o2Pct > 50 ? 'ok' : metrics.o2Pct > 20 ? 'warn' : 'danger'}
              provenance="SIMULATED"
            />
            <RingGauge
              label="WATER"
              percentage={metrics.waterPct}
              remainingText={`${metrics.waterDaysLeft} days remaining`}
              icon={<Droplets className="w-4 h-4 text-[#56D9E8]" />}
              strokeColor="#56D9E8"
              statusText={eclssFailure ? 'Degraded' : 'Recycling'}
              statusLevel={eclssFailure ? 'danger' : 'ok'}
              provenance="SIMULATED"
            />
            <RingGauge
              label="FOOD"
              percentage={metrics.foodPct}
              remainingText={`${metrics.foodDaysLeft} days remaining`}
              icon={<Apple className="w-4 h-4 text-[#4ADE80]" />}
              strokeColor="#4ADE80"
              statusText="Rations Ok"
              statusLevel="ok"
              provenance="SIMULATED"
            />
          </div>

          {/* Row 2: Three StatCards (Habitat Pressure, Temperature, Radiation) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<Gauge className="w-4 h-4" />}
              label="HABITAT PRESSURE"
              value="101.3"
              unit="kPa"
              statusText="Normal"
              statusLevel="ok"
              provenance="SIMULATED"
              source="ISS Atmospheric Equivalent"
            />
            <StatCard
              icon={<Thermometer className="w-4 h-4" />}
              label="TEMPERATURE"
              value={`${Math.round(tempEstimate.meanC)}`}
              unit="°C"
              statusText="Normal"
              statusLevel="ok"
              provenance="MODELED"
              source="MOLA / MEDA Thermal Engine"
              subline={`±15K uncert. (${tempEstimate.minC}° to ${tempEstimate.maxC}°)`}
            />
            <StatCard
              icon={<Radio className="w-4 h-4" />}
              label="RADIATION"
              value="0.24"
              unit="mSv/sol"
              statusText="Low"
              statusLevel="ok"
              provenance="MEASURED"
              source="Curiosity RAD Surface In-Situ"
              url="https://www.nasa.gov/mission_pages/msl/news/msl20121115.html"
            />
          </div>

          {/* Contingency Simulation Bar */}
          <div className="p-4 rounded-2xl bg-[#15181D]/70 border border-[rgba(231,225,216,0.08)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold uppercase text-[#A0A0A0]">
                SIMULATION SCENARIOS:
              </span>
              <button
                type="button"
                onClick={() => setEclssFailure(!eclssFailure)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  eclssFailure
                    ? 'bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444]'
                    : 'bg-[#101114] border border-[rgba(231,225,216,0.12)] text-[#A0A0A0] hover:text-white'
                }`}
              >
                ECLSS Failure: {eclssFailure ? 'ACTIVE' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => setDustStormActive(!dustStormActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                  dustStormActive
                    ? 'bg-[#F5B544]/20 border border-[#F5B544] text-[#F5B544]'
                    : 'bg-[#101114] border border-[rgba(231,225,216,0.12)] text-[#A0A0A0] hover:text-white'
                }`}
              >
                Dust Storm: {dustStormActive ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#A0A0A0]">Crew:</span>
              <select
                value={crewSize}
                onChange={(e) => setCrewSize(Number(e.target.value))}
                className="bg-[#101114] border border-[rgba(231,225,216,0.15)] rounded-lg px-2 py-1 text-xs font-mono text-[#E7E1D8] focus:outline-none"
              >
                <option value={2}>2 Astronauts</option>
                <option value={4}>4 Astronauts</option>
                <option value={6}>6 Astronauts</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Daily Checklist */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Checklist
            title="DAILY CHECKLIST"
            items={dailyChecklistItems}
            storageKey="mars_survival_checklist"
            className="h-full"
          />
        </div>
      </div>

      {/* Bottom: Martian Briefing Banner */}
      <div className="rounded-2xl bg-[#15181D]/90 border border-[rgba(231,225,216,0.12)] p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5 shadow-xl">
        <div className="w-full sm:w-48 h-20 rounded-xl overflow-hidden shrink-0 border border-[rgba(231,225,216,0.10)] relative">
          <img
            src={`${import.meta.env.BASE_URL}brand/hero.jpg`}
            alt="Martian surface panoramic horizon"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80]" />
            <span className="text-xs font-display font-bold uppercase tracking-wider text-[#FF7043]">
              MARTIAN BRIEFING
            </span>
            <span className="text-[10px] font-mono text-[#A0A0A0]">SOL {Math.floor(skySnapshot.msd % 1000)}</span>
          </div>
          <p className="text-sm font-sans text-[#E7E1D8] leading-relaxed">
            {dustStormActive
              ? 'Warning: Regional dust storm active. Atmospheric optical depth tau increased to 1.8. Solar array output reduced by 70%. Limit EVA operations.'
              : `Today's dust levels are nominal for solar longitude Ls ${skySnapshot.lsDeg.toFixed(0)}°. Good operational conditions for surface exploration with ${skySnapshot.daylightHours.toFixed(1)} daylight hours.`}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/weather')}
          className="shrink-0 text-xs"
        >
          View Telemetry
        </Button>
      </div>
    </div>
  );
};
