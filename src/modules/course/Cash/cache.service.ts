import { redis } from "../../../config/redis.js";

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);

    if (!data) return null;

    return JSON.parse(data);
  },

  async set(key: string, value: unknown, ttl: number = 60 * 10) {
    await redis.setEx(key, ttl, JSON.stringify(value));
  },

  async del(key: string) {
    await redis.del(key);
  },
};
