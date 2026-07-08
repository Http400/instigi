import React, { useState } from 'react';
import {
  Box,
  Stack,
  Link,
  Alert,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Button } from './Button';
import { TextField } from './TextField';

export interface AuthFormData {
  email: string;
  password: string;
  name?: string;
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
  name: string,
  isSignUp: boolean
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
  nameError: isSignUp && !name.trim() ? 'Name is required' : '',
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
  const [name, setName] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSignIn = mode === 'signIn';

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (submitted) {
      setNameError(validate(email, password, confirmPassword, value, !isSignIn).nameError);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (submitted) {
      setEmailError(validate(value, password, confirmPassword, name, !isSignIn).emailError);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (submitted) {
      const v = validate(email, value, confirmPassword, name, !isSignIn);
      setPasswordError(v.passwordError);
      setConfirmPasswordError(v.confirmPasswordError);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (submitted) {
      setConfirmPasswordError(validate(email, password, value, name, !isSignIn).confirmPasswordError);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const {
      emailError: eErr,
      passwordError: pErr,
      confirmPasswordError: cErr,
      nameError: nErr,
    } = validate(email, password, confirmPassword, name, !isSignIn);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmPasswordError(cErr);
    setNameError(nErr);
    if (eErr || pErr || cErr || nErr) return;
    onSubmit(isSignIn ? { email, password } : { email, password, name });
  };

  const handleModeToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setNameError('');
    setSubmitted(false);
    setShowPassword(false);
    onModeChange?.(mode === 'signIn' ? 'signUp' : 'signIn');
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}
    >
      {!isSignIn && (
        <TextField
          label="Name"
          type="text"
          value={name}
          onChange={handleNameChange}
          error={Boolean(nameError)}
          helperText={nameError}
          disabled={loading}
          autoComplete="name"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />
      )}

      <TextField
        label="Email address"
        type="email"
        value={email}
        onChange={handleEmailChange}
        error={Boolean(emailError)}
        helperText={emailError}
        disabled={loading}
        autoComplete="email"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={handlePasswordChange}
        error={Boolean(passwordError)}
        helperText={passwordError}
        disabled={loading}
        autoComplete={isSignIn ? 'current-password' : 'new-password'}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  disabled={loading}
                >
                  {showPassword ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 2 }}
      />

      {!isSignIn && (
        <TextField
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          error={Boolean(confirmPasswordError)}
          helperText={confirmPasswordError}
          disabled={loading}
          autoComplete="new-password"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />
      )}

      <Stack
        direction="row"
        sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <FormControlLabel
          control={<Checkbox size="small" disabled={loading} />}
          label="Remember me"
        />
        <Link href="#" underline="hover" color="primary">
          Forgot password?
        </Link>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isSignIn ? (
        <Stack spacing={2}>
          <Button type="submit" variant="contained" fullWidth loading={loading}>
            Log in
          </Button>
          <Button
            type="button"
            variant="outlined"
            fullWidth
            disabled={loading}
            onClick={handleModeToggle}
          >
            Create account
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Button type="submit" variant="contained" fullWidth loading={loading}>
            Create account
          </Button>
          <Button
            type="button"
            variant="outlined"
            fullWidth
            disabled={loading}
            onClick={handleModeToggle}
          >
            Back to log in
          </Button>
        </Stack>
      )}
    </Box>
  );
};
