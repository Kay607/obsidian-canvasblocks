export class TimedCache<K, V> {
    private cache: { [key: string]: { value: V, expiry: number } } = {};
    private defaultTTL: number;

    constructor(defaultTTL = 60000) {
        this.defaultTTL = defaultTTL;
    }

    set(key: K, value: V, ttl: number = this.defaultTTL): void {
        const stringKey = JSON.stringify(key);
        const expiry = Date.now() + ttl;
        this.cache[stringKey] = { value, expiry };

        setTimeout(() => {
            if (this.cache[stringKey] && this.cache[stringKey].expiry <= Date.now()) {
                delete this.cache[stringKey];
            }
        }, ttl);
    }

    get(key: K): V | undefined {
        const stringKey = JSON.stringify(key);
        if (this.cache[stringKey] && this.cache[stringKey].expiry > Date.now()) {
            return this.cache[stringKey].value;
        } else {
            delete this.cache[stringKey];
            return undefined;
        }
    }

    has(key: K): boolean {
        const stringKey = JSON.stringify(key);
        return !!this.cache[stringKey] && this.cache[stringKey].expiry > Date.now();
    }

    delete(key: K): void {
        const stringKey = JSON.stringify(key);
        delete this.cache[stringKey];
    }

    clear(): void {
        this.cache = {};
    }
}
