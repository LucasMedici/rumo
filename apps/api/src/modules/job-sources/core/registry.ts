import { NotFoundError } from '../../../shared/errors.js'
import type { JobSourceAdapter } from './adapter.js'

export type SourceRegistry = {
  get(key: string): JobSourceAdapter
  keys(): string[]
}

/** Holds the available adapters by key. Registering a source = adding it to the list. */
export function createSourceRegistry(adapters: JobSourceAdapter[]): SourceRegistry {
  const byKey = new Map<string, JobSourceAdapter>()
  for (const adapter of adapters) {
    if (byKey.has(adapter.key)) throw new Error(`Duplicate job source adapter: ${adapter.key}`)
    byKey.set(adapter.key, adapter)
  }

  return {
    get(key) {
      const adapter = byKey.get(key)
      if (!adapter) throw new NotFoundError(`Job source "${key}"`)
      return adapter
    },
    keys: () => [...byKey.keys()],
  }
}
