import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { RoverExplorerPage } from '../src/pages/RoverExplorerPage';

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

describe('RoverExplorerPage Smoke Test (Addendum §7, §8)', () => {
  it('renders rover explorer switcher, scrubber controls, and mocked map canvas', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/rovers']}>
        <RoverExplorerPage />
      </MemoryRouter>
    );

    // Verify main headings and buttons are rendered into HTML
    expect(html).toContain('ROVER EXPLORER');
    expect(html).toContain('Curiosity (MSL)');
    expect(html).toContain('Perseverance (M2020)');
    expect(html).toContain('TIMELINE SCRUBBER');
    expect(html).toContain('Mock Mars Map');
  });
});
