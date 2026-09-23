import type { Measurement } from '@/core/types';
import type { PluralKey } from '@/i18n';

/**
 * How a measurement reads out loud. An accessible alternative such as minutes
 * in place of steps keeps its own unit rather than being converted.
 */
export function unitLabelKey(measure: Measurement): PluralKey {
  switch (measure) {
    case 'minutes':
      return 'unit.minutes';
    case 'steps':
      return 'unit.steps';
    case 'distance_km':
      return 'unit.kilometres';
    case 'planned_sessions':
    case 'sessions':
    case 'checkoff':
    default:
      return 'unit.sessions';
  }
}

/** The unit as a bare noun, for text that already states the target. */
export type UnitNameKey =
  | 'unit.name.sessions'
  | 'unit.name.minutes'
  | 'unit.name.steps'
  | 'unit.name.kilometres';

export function unitNameKey(measure: Measurement): UnitNameKey {
  switch (measure) {
    case 'minutes':
      return 'unit.name.minutes';
    case 'steps':
      return 'unit.name.steps';
    case 'distance_km':
      return 'unit.name.kilometres';
    default:
      return 'unit.name.sessions';
  }
}
