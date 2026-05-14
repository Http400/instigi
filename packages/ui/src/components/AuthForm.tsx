import React, { useState } from 'react';
import { Box, Typography, Link, Alert } from '@mui/material';
import { Button } from './Button';
import { TextField } from './TextField';

export interface AuthFormData {
  email: string;
  password: string;
}

export interface AuthFormProps {
  mode: 'signIn' | 'signUp';
  onSubmit: (data: AuthFormData) => void | Promise<void>;
  onModeChange?: (newMode: 'signIn' | 'signUp') => void;
  loading?: boolean;
  error?: string;
}

const validate = (
  email: string,
  password: string,
  confirmPassword: string,
  isSignUp: boolean,
) => ({
  emailError: !email
    ? 'Email is required'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? 'Enter a valid email address'
      : '',
  passwordError: !password ? 'Password is required' : '',
  confirmPasswordError: isSignUp
    ? !confirmPassword
      ? 'Please confirm your password'
      : confirmPassword !== password
        ? 'Passwords do not match'
        : ''
    : '',
});

export const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  onSubmit,
  onModeChange,
  loading = false,
  error,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isSignIn = mode === 'signIn';

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (submitted) {
      setEmailError(validate(value, password, confirmPassword, !isSignIn).emailError);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (submitted) {
      const v = validate(email, value, confirmPassword, !isSignIn);
      setPasswordError(v.passwordError);
      setConfirmPasswordError(v.confirmPasswordError);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (submitted) {
      setConfirmPasswordError(validate(email, password, value, !isSignIn).confirmPasswordError);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const { emailError: eErr, passwordError: pErr, confirmPasswordError: cErr } =
      validate(email, password, confirmPassword, !isSignIn);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmPasswordError(cErr);
    if (eErr || pErr || cErr) return;
    onSubmit({ email, password });
  };

  const handleModeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setSubmitted(false);
    onModeChange?.(mode === 'signIn' ? 'signUp' : 'signIn');
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}
    >
      <Typography variant="h5" sx={{ textAlign: 'center', mb: 3 }}>
        {isSignIn ? 'Sign In' : 'Sign Up'}
      </Typography>

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={handleEmailChange}
        error={Boolean(emailError)}
        helperText={emailError}
        disabled={loading}
        autoComplete="email"
        sx={{ mb: 2 }}
      />

      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={handlePasswordChange}
        error={Boolean(passwordError)}
        helperText={passwordError}
        disabled={loading}
        autoComplete={isSignIn ? 'current-password' : 'new-password'}
        sx={{ mb: isSignIn ? 3 : 2 }}
      />

      {!isSignIn && (
        <TextField
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          error={Boolean(confirmPasswordError)}
          helperText={confirmPasswordError}
          disabled={loading}
          autoComplete="new-password"
          sx={{ mb: 3 }}
        />
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        loading={loading}
        sx={{ mb: 2 }}
      >
        {isSignIn ? 'Sign In' : 'Sign Up'}
      </Button>

      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        {isSignIn ? "Don't have an account? " : 'Already have an account? '}
        <Link href="#" onClick={handleModeToggle} underline="hover">
          {isSignIn ? 'Sign up' : 'Sign in'}
        </Link>
      </Typography>
    </Box>
  );
};
