/// OAuth callback handler — waits for Supabase to process the token from URL hash,
/// then redirects to the app. Prevents AuthGuard from redirecting prematurely.
import { Spin } from 'antd';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // supabase-js automatically exchanges the code/token in the URL hash.
    // Listen for the session to be set, then redirect to the app.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe();
        navigate('/', { replace: true });
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    // Fallback: if no auth event in 5s, go to login
    const timeout = setTimeout(() => navigate('/login', { replace: true }), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Spin size="large" tip="Signing in..." />
    </div>
  );
}
