declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    connect(): Promise<any>;
    query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }>;
    end(): Promise<void>;
  }
}


