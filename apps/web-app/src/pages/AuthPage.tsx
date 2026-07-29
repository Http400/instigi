import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Divider,
  Button,
  Link as MuiLink,
} from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { AuthForm, type AuthFormData, Logo } from '@instigi/ui';
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
import GoogleIcon from '../components/GoogleIcon';

type AuthMode = 'signIn' | 'signUp';

const FEATURES = [
  {
    icon: ShowChartIcon,
    title: 'Track',
    caption: 'Log workouts with ease',
  },
  {
    icon: DonutLargeIcon,
    title: 'Analyze',
    caption: 'Deep insights into performance',
  },
  {
    icon: TrendingUpIcon,
    title: 'Progress',
    caption: 'Set goals and beat them',
  },
] as const;

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
      navigate('/workouts', { replace: true });
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
      navigate('/workouts', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(undefined);
  };

  const isSignIn = mode === 'signIn';
  const heading = isSignIn ? 'Welcome back' : 'Create your account';
  const subtitle = isSignIn
    ? 'Log in to continue tracking your workouts and progress.'
    : 'Start tracking your workouts and progress.';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.default',
        backgroundImage: (theme) => `
          radial-gradient(circle at 85% 20%, ${theme.palette.primary.main}14, transparent 45%),
          radial-gradient(circle at 15% 90%, ${theme.palette.primary.main}0d, transparent 40%),
          radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: 'auto, auto, 22px 22px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          alignItems: { xs: 'center', md: 'flex-start' },
          justifyContent: 'center',
          gap: { xs: 0, md: 8 },
          px: { xs: 3, sm: 6 },
        }}
      >
        {/* Left branding panel — desktop only.
            Owns its own 100vh-centered box so a taller sign-up form can't
            re-center and move it (decoupled from the form column). */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 6,
            maxWidth: 560,
            minHeight: '100vh',
            py: 4,
          }}
        >
          <Logo orientation="vertical" size={88} color="#FFFFFF" />
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                mb: 2,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                fontSize: { md: '2.25rem', lg: '2.75rem' },
                textAlign: 'center',
              }}
            >
              Track. Analyze. Progress.
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your training. Your data. Your goals. Instigi helps you track
              every rep, analyze your performance, and make progress that lasts.
            </Typography>
          </Box>
          <Stack direction="row" spacing={4}>
            {FEATURES.map(({ icon: Icon, title, caption }) => (
              <Stack
                key={title}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: '50%',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon fontSize="small" color="primary" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {caption}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Right form card — also owns a 100vh-centered box so its content
            stays vertically centered independent of the branding panel. */}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            maxWidth: 460,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '100vh',
            py: 4,
          }}
        >
          {/* Mobile logo */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Logo orientation="vertical" size={72} color="#FFFFFF" />
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 0, md: 4 },
              borderRadius: 3,
              bgcolor: { xs: 'transparent', md: 'background.paper' },
              border: { xs: 'none', md: '1px solid' },
              borderColor: { md: 'rgba(255,255,255,0.08)' },
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {heading}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>

            <AuthForm
              mode={mode}
              onSubmit={handleSubmit}
              onModeChange={handleModeChange}
              loading={isLoggingIn || isRegistering}
              {...(error !== undefined ? { error } : {})}
            />

            <Divider sx={{ my: 3, color: 'text.secondary' }}>or</Divider>

            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              disabled
              startIcon={<GoogleIcon />}
              sx={{ borderColor: 'rgba(255,255,255,0.12)' }}
            >
              Continue with Google
            </Button>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', mt: 3 }}
            >
              By continuing, you agree to our{' '}
              <MuiLink href="#" underline="hover">
                Terms of Service
              </MuiLink>{' '}
              and{' '}
              <MuiLink href="#" underline="hover">
                Privacy Policy
              </MuiLink>
              .
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
