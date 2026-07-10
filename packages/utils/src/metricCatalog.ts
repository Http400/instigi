import type { MetricKey } from '@instigi/types';

export type MetricInputType = 'number' | 'duration';

export interface MetricCatalogItem {
  label: string;
  input: MetricInputType;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Application-level metric configuration keyed by MetricKey.
 * Mirrors context/foundation/data-model.md. Base units are internal:
 * load = kilograms, distance = metres, duration = seconds.
 */
export const metricCatalog: Record<MetricKey, MetricCatalogItem> = {
  reps: {
    label: 'Reps',
    input: 'number',
    min: 0,
    step: 1,
  },
  load: {
    label: 'Weight',
    input: 'number',
    min: 0,
    step: 0.5,
  },
  distance: {
    label: 'Distance',
    input: 'number',
    min: 0,
    step: 1,
  },
  duration: {
    label: 'Duration',
    input: 'duration',
    min: 0,
    step: 1,
  },
};
