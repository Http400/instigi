import { useEffect, useState } from 'react';
import { Container, Box } from '@mui/material';
import { AuthForm, type AuthFormData } from '@instigi/ui';
import { useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '../hooks';
import {
  useLoginMutation,
  useRegisterMutation,
} from '../features/auth/authApi';
import {
  credentialsReceived,
  selectIsAuthenticated,
} from '../features/auth/authSlice';
import { authErrorMessage } from '../features/auth/authErrors';

type AuthMode = 'signIn' | 'signUp';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [error, setError] = useState<string | undefined>(undefined);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (data: AuthFormData) => {
    setError(undefined);
    try {
      const result =
        mode === 'signIn'
          ? await login({
              email: data.email,
              password: data.password,
            }).unwrap()
          : await register({
              email: data.email,
              password: data.password,
              name: data.name ?? '',
            }).unwrap();
      dispatch(
        credentialsReceived({ user: result.user, tokens: result.tokens })
      );
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(undefined);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8 }}>
        <AuthForm
          mode={mode}
          onSubmit={handleSubmit}
          onModeChange={handleModeChange}
          loading={isLoggingIn || isRegistering}
          {...(error !== undefined ? { error } : {})}
        />
      </Box>
    </Container>
  );
}
