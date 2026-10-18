import { useState, useCallback, useMemo } from 'react';
import type { MarsMapLayer } from '../types/map';
import { MARS_LAYERS } from '../data/marsLayers';

export function useMarsLayers() {
  const [layers, setLayers] = useState<MarsMapLayer[]>(MARS_LAYERS);

  const toggleLayer = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id === layerId) {
          return { ...l, active: !l.active };
        }
        // If selecting a base layer, deactivate other base layers
        if (l.category === 'base') {
          const target = prev.find((x) => x.id === layerId);
          if (target?.category === 'base') {
            return { ...l, active: l.id === layerId };
          }
        }
        return l;
      })
    );
  }, []);

  const setActiveBaseLayer = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.category === 'base') {
          return { ...l, active: l.id === layerId };
        }
        return l;
      })
    );
  }, []);

  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l))
    );
  }, []);

  const activeBaseLayer = useMemo(
    () => layers.find((l) => l.category === 'base' && l.active) || layers[0],
    [layers]
  );
  const activeOverlays = useMemo(
    () => layers.filter((l) => l.category !== 'base' && l.active),
    [layers]
  );

  return {
    layers,
    activeBaseLayer,
    activeOverlays,
    toggleLayer,
    setActiveBaseLayer,
    setLayerOpacity
  };
}
