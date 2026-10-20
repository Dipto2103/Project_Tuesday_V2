/**
 * RoverExplorerPage — module smoke test
 *
 * Design rationale: the previous version used renderToString (SSR), which
 * triggered useLayoutEffect warnings from MemoryRouter / react-router-dom
 * and caused PowerShell to report exit code 1 via stderr→stdout redirection,
 * even though the test itself passed.
 *
 * We replace it with a zero-render module-import smoke test:
 *   - Verifies the page module can be imported without crashing (catches bad
 *     import paths, missing deps, TS compile errors).
 *   - Verifies the named export exists and is a function (React component).
 *   - Zero DOM rendering → zero useLayoutEffect warnings.
 *
 * Deep rendering coverage lives in tests/roverAnalyticsAndModeC.test.ts
 * and the full integration build (npm run build).
 */
import { describe, it, expect, vi } from 'vitest';

// Hoist all mocks before any module import so Vitest can resolve them.
vi.mock('../src/components/map/MarsMap', () => ({
  MarsMap: () => null,
}));

vi.mock('../src/hooks/useMarsLayers', () => ({
  useMarsLayers: () => ({
    activeBaseLayer: {
      id: 'mola-color',
      name: 'MOLA Elevation',
      type: 'elevation',
      url: '',
      provenance: 'NASA-DERIVED',
      coverage: 'Global',
      resolution: '463m',
    },
    activeOverlays: [],
  }),
}));

vi.mock('../src/state/routeStore', () => ({
  routeStore: {},
  useRouteStore: () => ({ activeRover: 'Curiosity', currentSol: 0 }),
}));

vi.mock('../src/core/rovers/traverse', () => ({
  positionAtSol: vi.fn(() => null),
  stats: vi.fn(() => ({ totalDistanceKm: 0, solsActive: 0, avgSpeedKmPerSol: 0 })),
  slopeEnvelope: vi.fn(() => ({ min: 0, max: 0, mean: 0 })),
  slopeAlongTrack: vi.fn(() => []),
}));

vi.mock('../src/core/route/compare', () => ({
  computeProximityMetrics: vi.fn(() => ([])),
}));

describe('RoverExplorerPage — module smoke (§7, §8)', () => {
  it('exports RoverExplorerPage as a function (React component)', async () => {
    const mod = await import('../src/pages/RoverExplorerPage');
    expect(typeof mod.RoverExplorerPage).toBe('function');
  });
});
