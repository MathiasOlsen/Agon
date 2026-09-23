import { AgonStore } from './store';

/**
 * One store for the app. Opening it is synchronous so the first screen can draw
 * immediately from real data instead of an empty placeholder.
 */

let store: AgonStore | null = null;

export function getStore(): AgonStore {
  if (!store) store = AgonStore.open();
  return store;
}
