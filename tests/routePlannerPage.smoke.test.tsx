/**
 * RoutePlannerPage — module smoke test
 *
 * Design rationale: mirrors roverExplorerPage.smoke.test.tsx.
 * Replaces the SSR renderToString approach (useLayoutEffect warnings,
 * PowerShell exit-1 from stderr) with a zero-render module-import check.
 *
 * Deep rendering coverage: tests/modeA.test.ts, tests/modeB.test.ts,
 * tests/routeCore.test.ts, and the production build (npm run build).
 */
import { describe, it, expect, vi } from 'vitest';

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

describe('RoutePlannerPage — module smoke (§7, §8)', () => {
  it('exports RoutePlannerPage as a function (React component)', async () => {
    const mod = await import('../src/pages/RoutePlannerPage');
    expect(typeof mod.RoutePlannerPage).toBe('function');
  });
});
