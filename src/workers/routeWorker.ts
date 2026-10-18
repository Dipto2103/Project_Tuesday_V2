/**
 * MARS LANTERN — Routing Background Web Worker
 * 
 * Runs intensive 8-connected A* search in a background thread to prevent
 * any UI stuttering or map frame drops.
 * 
 * Reference: MARS_LANTERN_SPEC.md §9.4
 */

import { planMarsRoute, type RoutePlanRequest, type MarsRouteResult } from '../core/route';

export interface RouteWorkerMessageIn {
  id: string;
  type: 'PLAN_ROUTE';
  payload: RoutePlanRequest;
}

export interface RouteWorkerMessageOut {
  id: string;
  type: 'ROUTE_RESULT';
  primary: MarsRouteResult;
  alternative?: MarsRouteResult;
}

self.onmessage = (e: MessageEvent<RouteWorkerMessageIn>) => {
  const { id, type, payload } = e.data;

  if (type === 'PLAN_ROUTE') {
    // 1. Calculate primary terrain-aware route
    const primary = planMarsRoute({
      ...payload,
      mode: 'shortest'
    });

    // 2. Calculate alternative conservative route (lowest risk)
    const alternative = planMarsRoute({
      ...payload,
      mode: 'safest'
    });

    const response: RouteWorkerMessageOut = {
      id,
      type: 'ROUTE_RESULT',
      primary,
      alternative
    };

    self.postMessage(response);
  }
};
