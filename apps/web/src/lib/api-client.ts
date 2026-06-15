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

        // biome-ignore lint/style/noNonNullAssertion: user is guaranteed after a successful refresh
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

// Orval mutator — exported both as named (for Orval's generated import) and as default
export function customInstance<T>(config: AxiosRequestConfig): Promise<T> {
  return apiClient(config).then((res) => res.data);
}

// biome-ignore lint/style/noDefaultExport: required by Orval mutator convention
export default customInstance;
