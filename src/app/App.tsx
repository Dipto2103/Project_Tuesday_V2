import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { PageSkeleton } from '../components/ui/PageSkeleton';

// Lazy-loaded pages for fast code-splitting and performance
const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const MapPage = lazy(() => import('../pages/MapPage').then((m) => ({ default: m.MapPage })));
const SatellitePage = lazy(() => import('../pages/SatellitePage').then((m) => ({ default: m.SatellitePage })));
const SkyPage = lazy(() => import('../pages/SkyPage').then((m) => ({ default: m.SkyPage })));

const PlannerPage = lazy(() => import('../pages/PlannerPage').then((m) => ({ default: m.PlannerPage })));
const RoutePlannerPage = lazy(() => import('../pages/RoutePlannerPage').then((m) => ({ default: m.RoutePlannerPage })));
const CompareRoutesPage = lazy(() => import('../pages/CompareRoutesPage').then((m) => ({ default: m.CompareRoutesPage })));
const BriefingPage = lazy(() => import('../pages/BriefingPage').then((m) => ({ default: m.BriefingPage })));
const RoverExplorerPage = lazy(() => import('../pages/RoverExplorerPage').then((m) => ({ default: m.RoverExplorerPage })));

const SurvivalPage = lazy(() => import('../pages/SurvivalPage').then((m) => ({ default: m.SurvivalPage })));
const FieldManualPage = lazy(() => import('../pages/FieldManualPage').then((m) => ({ default: m.FieldManualPage })));
const TerrainPage = lazy(() => import('../pages/TerrainPage').then((m) => ({ default: m.TerrainPage })));
const HazardPage = lazy(() => import('../pages/HazardPage').then((m) => ({ default: m.HazardPage })));
const SciencePage = lazy(() => import('../pages/SciencePage').then((m) => ({ default: m.SciencePage })));
const WeatherPage = lazy(() => import('../pages/WeatherPage').then((m) => ({ default: m.WeatherPage })));
const AboutPage = lazy(() => import('../pages/AboutPage').then((m) => ({ default: m.AboutPage })));

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Core Concept Board Pages */}
        <Route
          path="/"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <LandingPage />
            </Suspense>
          }
        />
        <Route
          path="/map"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <MapPage />
            </Suspense>
          }
        />
        <Route
          path="/satellite"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <SatellitePage />
            </Suspense>
          }
        />
        <Route
          path="/sky"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <SkyPage />
            </Suspense>
          }
        />

        {/* Mission Planning Group */}
        <Route
          path="/planner"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <PlannerPage />
            </Suspense>
          }
        />
        <Route
          path="/planner/route"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <RoutePlannerPage />
            </Suspense>
          }
        />
        <Route
          path="/planner/compare"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <CompareRoutesPage />
            </Suspense>
          }
        />
        <Route
          path="/planner/briefing"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <BriefingPage />
            </Suspense>
          }
        />
        <Route
          path="/rovers"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <RoverExplorerPage />
            </Suspense>
          }
        />

        {/* Survival & Field Manual Group */}
        <Route
          path="/survival"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <SurvivalPage />
            </Suspense>
          }
        />
        <Route
          path="/manual"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <FieldManualPage />
            </Suspense>
          }
        />
        <Route
          path="/terrain"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <TerrainPage />
            </Suspense>
          }
        />
        <Route
          path="/hazards"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <HazardPage />
            </Suspense>
          }
        />
        <Route
          path="/science"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <SciencePage />
            </Suspense>
          }
        />
        <Route
          path="/weather"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <WeatherPage />
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={<PageSkeleton />}>
              <AboutPage />
            </Suspense>
          }
        />

        {/* Legacy Route Aliases for Seamless Backward Compatibility */}
        <Route path="/route-plan" element={<Navigate to="/planner/route" replace />} />
        <Route path="/mission-builder" element={<Navigate to="/planner" replace />} />
        <Route path="/route-compare" element={<Navigate to="/planner/compare" replace />} />
        <Route path="/mission-brief" element={<Navigate to="/planner/briefing" replace />} />
        <Route path="/rover-explorer" element={<Navigate to="/rovers" replace />} />
        <Route path="/layers" element={<Navigate to="/map" replace />} />
        <Route path="/environment" element={<Navigate to="/weather" replace />} />

        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
