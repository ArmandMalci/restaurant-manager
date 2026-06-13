import axios from 'axios'
import { enqueueRequest } from './offline-queue'

export function setupAxiosOfflineInterceptor(): void {
  axios.interceptors.response.use(
    response => response,
    error => {
      // Only queue when offline (not for auth/server errors)
      if (
        !navigator.onLine &&
        error.config &&
        error.config.method &&
        error.config.method.toLowerCase() !== 'get'
      ) {
        enqueueRequest(
          error.config.method.toUpperCase(),
          error.config.url as string,
          error.config.data ? JSON.parse(error.config.data as string) : undefined,
        )
      }
      return Promise.reject(error)
    },
  )
}
