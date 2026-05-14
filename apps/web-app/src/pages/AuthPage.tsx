import { useState } from 'react';
import { Container, Box } from '@mui/material';
import { AuthForm, AuthFormData } from '@instigi/ui';

type AuthMode = 'signIn' | 'signUp';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('signIn');

  const handleSubmit = async (data: AuthFormData) => {
    // TODO: wire up authentication / registration API
    console.log(mode === 'signIn' ? 'Sign in' : 'Sign up', data);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8 }}>
        <AuthForm
          mode={mode}
          onSubmit={handleSubmit}
          onModeChange={(newMode) => setMode(newMode)}
        />
      </Box>
    </Container>
  );
}
