export interface GenericStringStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem?(key: string): Promise<void> | void;
}

export class GenericStringInMemoryStorage implements GenericStringStorage {
  #map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.#map.has(key) ? (this.#map.get(key) as string) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.#map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.#map.delete(key);
  }
}


