import { Outlet, Link } from 'react-router';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { theme } from '@instigi/ui';

export default function RootLayout() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              Instigi
            </Link>
          </Typography>
          <Button component={Link} to="/auth">
            Sign In / Sign Up
          </Button>
        </Toolbar>
      </AppBar>
      <Outlet />
    </ThemeProvider>
  );
}
