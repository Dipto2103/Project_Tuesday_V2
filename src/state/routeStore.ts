/**
 * MARS LANTERN — Central Shared State Store
 * 
 * Implemented via React's native useSyncExternalStore (zero dependencies).
 * Persists calculated routes, active rover sol, and parameters across
 * page navigation (Route Planner -> Compare -> Rover Explorer -> Map).
 * 
 * Rules (Spec v2.1 Addendum §3):
 * - Does NOT trigger computation automatically.
 * - Only the "Calculate" button calls the worker or planning engine.
 * - Navigating away mid-calculation can mark state cancelled.
 * - Rover Explorer's "Use in route" writes From/To into the store and navigates.
 */

import { useSyncExternalStore } from 'react';
import type {
  RouteRequest,
  RouteResult,
  RouteError,
  LatLonE,
  Vehicle,
  RouteMode
} from '../core/route/types';
import type { TrackPoints } from '../core/rovers/types';

export interface RouteStoreState {
  request: RouteRequest;
  results: (RouteResult | RouteError)[];
  stale: boolean;
  selectedRouteIndex: number;
  isCalculating: boolean;
  calculationProgress: { pct: number; phase: string } | null;
  activeRover: 'Curiosity' | 'Perseverance';
  currentSol: number;
  loadedTracks: Record<string, TrackPoints>;
}

// Default initial state
const defaultState: RouteStoreState = {
  request: {
    mode: 'B_TERRAIN_ASTAR',
    from: { lat: 18.4447, lonE: 77.4508 }, // Jezero Crater Western Delta
    to: { lat: 18.38, lonE: 77.58 },        // Jezero Crater Floor
    vehicle: 'eva',
    riskTolerant: false,
    assumptions: {}
  },
  results: [],
  stale: false,
  selectedRouteIndex: 0,
  isCalculating: false,
  calculationProgress: null,
  activeRover: 'Curiosity',
  currentSol: 0,
  loadedTracks: {}
};

let state: RouteStoreState = { ...defaultState };
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const routeStore = {
  getState(): RouteStoreState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setRequest(partial: Partial<RouteRequest>): void {
    state = {
      ...state,
      request: {
        ...state.request,
        ...partial
      },
      stale: state.results.length > 0 // Mark stale if results exist and request changed
    };
    emitChange();
  },

  setFrom(from: LatLonE): void {
    state = {
      ...state,
      request: { ...state.request, from },
      stale: state.results.length > 0
    };
    emitChange();
  },

  setTo(to: LatLonE): void {
    state = {
      ...state,
      request: { ...state.request, to },
      stale: state.results.length > 0
    };
    emitChange();
  },

  setVehicle(vehicle: Vehicle): void {
    state = {
      ...state,
      request: { ...state.request, vehicle },
      stale: state.results.length > 0
    };
    emitChange();
  },

  setMode(mode: RouteMode): void {
    state = {
      ...state,
      request: { ...state.request, mode },
      stale: state.results.length > 0
    };
    emitChange();
  },

  setRiskTolerant(riskTolerant: boolean): void {
    state = {
      ...state,
      request: { ...state.request, riskTolerant },
      stale: state.results.length > 0
    };
    emitChange();
  },

  setResults(results: (RouteResult | RouteError)[]): void {
    state = {
      ...state,
      results,
      stale: false,
      isCalculating: false,
      calculationProgress: null,
      selectedRouteIndex: 0
    };
    emitChange();
  },

  setSelectedRouteIndex(index: number): void {
    state = {
      ...state,
      selectedRouteIndex: index
    };
    emitChange();
  },

  setCalculating(isCalculating: boolean, progress?: { pct: number; phase: string } | null): void {
    state = {
      ...state,
      isCalculating,
      calculationProgress: progress ?? state.calculationProgress
    };
    emitChange();
  },

  cancelCalculation(): void {
    state = {
      ...state,
      isCalculating: false,
      calculationProgress: null
    };
    emitChange();
  },

  clearResults(): void {
    state = {
      ...state,
      results: [],
      stale: false,
      isCalculating: false,
      calculationProgress: null,
      selectedRouteIndex: 0
    };
    emitChange();
  },

  setActiveRover(rover: 'Curiosity' | 'Perseverance'): void {
    state = {
      ...state,
      activeRover: rover
    };
    emitChange();
  },

  setCurrentSol(sol: number): void {
    state = {
      ...state,
      currentSol: sol
    };
    emitChange();
  },

  setLoadedTrack(rover: string, track: TrackPoints): void {
    state = {
      ...state,
      loadedTracks: {
        ...state.loadedTracks,
        [rover.toLowerCase()]: track
      }
    };
    emitChange();
  },

  /**
   * Action from Rover Explorer to populate Route Planner endpoints
   */
  useInRoute(from: LatLonE, to: LatLonE): void {
    state = {
      ...state,
      request: {
        ...state.request,
        from,
        to
      },
      stale: true
    };
    emitChange();
  }
};

/**
 * React hook to subscribe to the routeStore
 */
export function useRouteStore(): RouteStoreState {
  return useSyncExternalStore(routeStore.subscribe, routeStore.getState, routeStore.getState);
}
