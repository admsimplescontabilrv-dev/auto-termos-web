import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';

// Escuta mudanças de estado para saber se o usuário já tem sessão salva
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken();
      if (onAuthSuccess) onAuthSuccess({ name: 'Admin' }, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const loginWithPassword = async (password: string): Promise<any> => {
  // O usuário digita só a senha na tela, mas por baixo dos panos usamos um email fixo
  const email = 'admin@simples.com';
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    return { user: { name: 'Admin' }, accessToken: token };
  } catch (error: any) {
    throw new Error('Senha incorreta ou acesso negado.');
  }
};

export const logout = async () => {
  await signOut(auth);
};

export const getAccessToken = async (): Promise<string | null> => {
  return auth.currentUser ? await auth.currentUser.getIdToken() : null;
};
