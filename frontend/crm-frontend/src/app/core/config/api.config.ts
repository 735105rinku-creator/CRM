declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
      ENABLE_DEMO_LOGIN?: boolean;
    };
  }
}

const normalizeBaseUrl = (value?: string): string => String(value || '').replace(/\/+$/, '');

// export const API_BASE_URL = normalizeBaseUrl(window.__APP_CONFIG__?.API_BASE_URL) || 'https://api.opasbizz.co.in';
export const API_BASE_URL = normalizeBaseUrl(window.__APP_CONFIG__?.API_BASE_URL) || 'http://localhost:8080';
export const ENABLE_DEMO_LOGIN = Boolean(window.__APP_CONFIG__?.ENABLE_DEMO_LOGIN);

export function apiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return `${API_BASE_URL}${path}`;
}