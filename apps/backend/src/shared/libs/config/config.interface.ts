export interface Config<T extends Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K];
}
