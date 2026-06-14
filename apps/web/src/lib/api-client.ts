import Axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth.store';

export const apiClient = Axios.create({ baseURL: '/api' });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { data } = await Axios.post('/api/auth/refresh', {}, { withCredentials: true });
        useAuthStore.getState().setAuth(useAuthStore.getState().user!, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Orval mutator — default export called by generated hooks
export default function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  return apiClient(config).then((res) => res.data);
}
