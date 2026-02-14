import type { AxiosError } from 'axios';
import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { z } from 'zod';

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

type AuthMode = 'basic' | 'bearer';

export type AffinityClientConfig = {
  apiKey?: string;
  authMode?: AuthMode;
  baseUrl?: string;
  maxRetries?: number;
};

export class AffinityApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly payload?: unknown,
    readonly requestId?: string
  ) {
    super(message);
    this.name = 'AffinityApiError';
  }
}

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class AffinityClient {
  private readonly axios: AxiosInstance;
  private readonly maxRetries: number;

  constructor(private readonly config: AffinityClientConfig = {}) {
    this.maxRetries = config.maxRetries ?? 3;
    this.axios = axios.create({
      baseURL: config.baseUrl ?? 'https://api.affinity.co',
      timeout: 30_000
    });

    this.axios.interceptors.request.use((request) => {
      const key = config.apiKey ?? process.env.AFFINITY_API_KEY;
      if (!key) {
        throw new Error('Missing AFFINITY_API_KEY or --api-key flag');
      }

      const authMode: AuthMode =
        config.authMode ?? (process.env.AFFINITY_AUTH_MODE as AuthMode | undefined) ?? 'basic';

      request.headers = request.headers ?? {};
      if (authMode === 'bearer') {
        request.headers.Authorization = `Bearer ${key}`;
      } else {
        const encoded = Buffer.from(`:${key}`).toString('base64');
        request.headers.Authorization = `Basic ${encoded}`;
      }
      request.headers.Accept = 'application/json';
      request.headers['Content-Type'] = request.headers['Content-Type'] ?? 'application/json';
      return request;
    });

    this.axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const cfg = (error.config ?? {}) as AxiosRequestConfig & { __retryCount?: number };
        const status = error.response?.status;
        cfg.__retryCount = cfg.__retryCount ?? 0;

        if (status && RETRYABLE_STATUS.has(status) && cfg.__retryCount < this.maxRetries) {
          cfg.__retryCount += 1;
          const backoff = Math.min(5000, 300 * 2 ** cfg.__retryCount);
          const jitter = Math.floor(Math.random() * 250);
          await sleep(backoff + jitter);
          return this.axios(cfg);
        }

        const requestId = error.response?.headers?.['x-request-id'] as string | undefined;
        throw new AffinityApiError(
          `Affinity API request failed${status ? ` (${status})` : ''}`,
          status,
          error.response?.data,
          requestId
        );
      }
    );
  }

  /** Executes a GET request and validates the response when a schema is provided. */
  async get<T>(
    path: string,
    params?: Record<string, unknown>,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const response = await this.axios.get(path, { params });
    return schema ? schema.parse(response.data) : (response.data as T);
  }

  /** Executes a POST request and validates the response when a schema is provided. */
  async post<T>(path: string, data?: unknown, schema?: z.ZodSchema<T>): Promise<T> {
    const response = await this.axios.post(path, data);
    return schema ? schema.parse(response.data) : (response.data as T);
  }

  /** Executes a PUT request and validates the response when a schema is provided. */
  async put<T>(path: string, data?: unknown, schema?: z.ZodSchema<T>): Promise<T> {
    const response = await this.axios.put(path, data);
    return schema ? schema.parse(response.data) : (response.data as T);
  }

  /** Executes a DELETE request and validates the response when a schema is provided. */
  async delete<T>(path: string, schema?: z.ZodSchema<T>): Promise<T> {
    const response = await this.axios.delete(path);
    return schema ? schema.parse(response.data) : (response.data as T);
  }
}
