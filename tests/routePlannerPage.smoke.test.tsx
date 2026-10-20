import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { RoutePlannerPage } from '../src/pages/RoutePlannerPage';

// Mock MarsMap to avoid Leaflet DOM rendering in node/SSR
vi.mock('../src/components/map/MarsMap', () => ({
  MarsMap: () => <div data-testid="mock-mars-map">Mock Mars Map</div>
}));

// Mock useMarsLayers
vi.mock('../src/hooks/useMarsLayers', () => ({
  useMarsLayers: () => ({
    activeBaseLayer: {
      id: 'mola-color',
      name: 'MOLA Elevation',
      type: 'elevation',
      url: '',
      provenance: 'NASA-DERIVED',
      coverage: 'Global',
      resolution: '463m'
    },
    activeOverlays: []
  })
}));

describe('RoutePlannerPage Smoke Test (Addendum §7, §8)', () => {
  it('renders route planner controls, mode buttons and mocked map canvas', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/planner/route']}>
        <RoutePlannerPage />
      </MemoryRouter>
    );

    // Verify main headings and buttons are rendered into HTML
    expect(html).toContain('ROUTE PLANNER');
    expect(html).toContain('Mode A: Direct');
    expect(html).toContain('Mode B: A*');
    expect(html).toContain('Mode C: Rover');
    expect(html).toContain('Calculate Route');
    expect(html).toContain('Mock Mars Map');
  });
});
