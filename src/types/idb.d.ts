declare module 'idb' {
  export interface IDBPDatabase<T> {
    transaction(
      storeNames: string[],
      mode?: 'readonly' | 'readwrite'
    ): {
      objectStore(name: string): {
        put(item: any): Promise<any>;
        get(key: string): Promise<any>;
        getAll(): Promise<any[]>;
        delete(key: string): Promise<void>;
        clear(): Promise<void>;
      };
      done: Promise<void>;
    };
    
    get(storeName: string, key: string): Promise<any>;
    getAll(storeName: string): Promise<any[]>;
    put(storeName: string, value: any): Promise<any>;
    delete(storeName: string, key: string): Promise<void>;
  }
  
  export function openDB<T>(
    name: string,
    version: number,
    options?: {
      upgrade(db: any): void;
    }
  ): Promise<IDBPDatabase<T>>;
} 