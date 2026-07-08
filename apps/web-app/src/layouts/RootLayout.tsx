import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import {
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Stack,
} from '@mui/material';
import { theme } from '@instigi/ui';
import { useAppDispatch, useAppSelector } from '../hooks';
import {
  loggedOut,
  selectCurrentUser,
  selectIsAuthenticated,
} from '../features/auth/authSlice';

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  const handleSignOut = () => {
    dispatch(loggedOut());
    navigate('/auth', { replace: true });
  };

  const hideChrome = location.pathname === '/auth';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {!hideChrome && (
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                Instigi
              </Link>
            </Typography>
            {isAuthenticated ? (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  {user?.name ?? user?.email}
                </Typography>
                <Button onClick={handleSignOut}>Sign Out</Button>
              </Stack>
            ) : (
              <Button component={Link} to="/auth">
                Sign In / Sign Up
              </Button>
            )}
          </Toolbar>
        </AppBar>
      )}
      <Outlet />
    </ThemeProvider>
  );
}
