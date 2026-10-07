import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';

// Escuta mudanças de estado para saber se o usuário já tem sessão salva
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  let resolved = false;

  // Timeout de segurança: em iframes ou restrições de cookies do navegador,
  // evita que o app fique congelado na tela de carregamento indefinidamente.
  const timeoutId = setTimeout(() => {
    if (!resolved) {
      resolved = true;
      if (onAuthFailure) onAuthFailure();
    }
  }, 2000);

  try {
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        try {
          if (user) {
            const token = await user.getIdToken();
            if (onAuthSuccess) onAuthSuccess({ name: 'Admin' }, token);
          } else {
            if (onAuthFailure) onAuthFailure();
          }
        } catch (e) {
          console.warn('Erro ao obter token do usuário:', e);
          if (onAuthFailure) onAuthFailure();
        }
      },
      (error) => {
        console.warn('Erro na verificação de autenticação do Firebase:', error);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          if (onAuthFailure) onAuthFailure();
        }
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  } catch (err) {
    console.error('Falha ao iniciar listener do Firebase Auth:', err);
    if (!resolved) {
      resolved = true;
      clearTimeout(timeoutId);
      if (onAuthFailure) onAuthFailure();
    }
    return () => clearTimeout(timeoutId);
  }
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
