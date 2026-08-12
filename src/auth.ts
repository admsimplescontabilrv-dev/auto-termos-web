export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  const token = localStorage.getItem('app_token');
  if (token) {
    if (onAuthSuccess) onAuthSuccess({ name: 'Admin' }, token);
  } else {
    if (onAuthFailure) onAuthFailure();
  }
  return () => {}; // return empty unsubscribe function
};

export const loginWithPassword = async (password: string): Promise<any> => {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const data = await res.json();
  if (res.ok && data.token) {
    localStorage.setItem('app_token', data.token);
    return { user: { name: 'Admin' }, accessToken: data.token };
  } else {
    throw new Error(data.error || 'Erro ao fazer login');
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return localStorage.getItem('app_token');
};

export const getFirebaseIdToken = async (): Promise<string | null> => {
  return localStorage.getItem('app_token');
};

export const logout = async () => {
  localStorage.removeItem('app_token');
};
