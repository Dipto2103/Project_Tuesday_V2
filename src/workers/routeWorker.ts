/**
 * MARS LANTERN — Routing Background Web Worker
 * 
 * Runs intensive 8-connected A* search in a background thread to prevent
 * any UI stuttering or map frame drops. Supports cancellation, progress reporting,
 * and shortest + safest multi-route evaluation.
 * 
 * Reference: MARS_LANTERN_ROUTING_ROVER_SPEC.md §8.3, §9.5
 */

import { planMarsRoute, type RoutePlanRequest, type MarsRouteResult } from '../core/route';
import { planMultiModeB } from '../core/route/modeB';
import { planModeA } from '../core/route/modeA';
import type { RouteRequest, RouteResult, RouteError } from '../core/route/types';

export type WorkerIn =
  | { type: 'compute'; id: string; req: RouteRequest }
  | { type: 'cancel'; id: string }
  | { type: 'PLAN_ROUTE'; id: string; payload: RoutePlanRequest }; // Legacy support

export type WorkerOut =
  | {
      type: 'progress';
      id: string;
      pct: number;
      phase: 'loading-dem' | 'building-costs' | 'search' | 'smoothing';
    }
  | {
      type: 'result';
      id: string;
      results: (RouteResult | RouteError)[];
    }
  | {
      type: 'error';
      id: string;
      message: string;
    }
  | {
      type: 'ROUTE_RESULT';
      id: string;
      primary: MarsRouteResult;
      alternative?: MarsRouteResult;
    }; // Legacy support

let activeJobId: string | null = null;
let isCancelled = false;

self.onmessage = (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;

  // Handle cancellation
  if (msg.type === 'cancel') {
    if (activeJobId === msg.id) {
      isCancelled = true;
      activeJobId = null;
    }
    return;
  }

  // Handle new multi-mode compute request
  if (msg.type === 'compute') {
    const { id, req } = msg;
    activeJobId = id;
    isCancelled = false;

    try {
      // 1. Initial progress
      self.postMessage({
        type: 'progress',
        id,
        pct: 10,
        phase: 'loading-dem'
      } as WorkerOut);

      if (isCancelled) return;

      if (req.mode === 'A_DIRECT') {
        const resultA = planModeA(req);
        self.postMessage({
          type: 'result',
          id,
          results: [resultA]
        } as WorkerOut);
        activeJobId = null;
        return;
      }

      // 2. Mode B: compute shortest and safest in parallel
      self.postMessage({
        type: 'progress',
        id,
        pct: 25,
        phase: 'building-costs'
      } as WorkerOut);

      const { shortest, safest } = planMultiModeB(req, {
        onProgress: (pct) => {
          self.postMessage({
            type: 'progress',
            id,
            pct: 25 + Math.round(pct * 0.65),
            phase: 'search'
          } as WorkerOut);
        },
        shouldCancel: () => isCancelled && activeJobId === id
      });

      if (isCancelled) return;

      self.postMessage({
        type: 'progress',
        id,
        pct: 95,
        phase: 'smoothing'
      } as WorkerOut);

      self.postMessage({
        type: 'result',
        id,
        results: [shortest, safest]
      } as WorkerOut);
    } catch (err: any) {
      self.postMessage({
        type: 'error',
        id,
        message: err?.message || 'Route calculation failed'
      } as WorkerOut);
    } finally {
      if (activeJobId === id) activeJobId = null;
    }
    return;
  }

  // Legacy PLAN_ROUTE support for existing page handlers
  if (msg.type === 'PLAN_ROUTE') {
    const { id, payload } = msg;
    const primary = planMarsRoute({ ...payload, mode: 'shortest' });
    const alternative = planMarsRoute({ ...payload, mode: 'safest' });

    self.postMessage({
      id,
      type: 'ROUTE_RESULT',
      primary,
      alternative
    } as WorkerOut);
  }
};
