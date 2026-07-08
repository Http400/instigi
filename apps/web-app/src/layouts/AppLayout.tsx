import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import {
  Avatar,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Logo } from '@instigi/ui';
import { useAppDispatch, useAppSelector } from '../hooks';
import { loggedOut, selectCurrentUser } from '../features/auth/authSlice';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  icon: ReactNode;
  to?: string;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Workouts', icon: <FitnessCenterIcon />, disabled: true },
  { label: 'Exercises', icon: <LibraryBooksIcon />, to: '/exercises' },
  { label: 'Progress', icon: <ShowChartIcon />, disabled: true },
  { label: 'Calendar', icon: <CalendarMonthIcon />, disabled: true },
  { label: 'Statistics', icon: <BarChartIcon />, disabled: true },
  { label: 'Settings', icon: <SettingsIcon />, disabled: true },
];

function initialsFor(name?: string | null, email?: string | null): string {
  const source = name?.trim() || email?.trim() || '';
  if (!source) {
    return '?';
  }
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);

  const handleSignOut = () => {
    dispatch(loggedOut());
    navigate('/auth', { replace: true });
  };

  const displayName = user?.name ?? user?.email ?? 'Signed in';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Toolbar sx={{ px: 2, py: 3 }}>
          <Logo orientation="horizontal" size={36} color="primary.main" />
        </Toolbar>

        <List sx={{ px: 1, flexGrow: 1 }}>
          {NAV_ITEMS.map((item) => {
            const selected = item.to != null && location.pathname === item.to;
            const button = (
              <ListItemButton
                selected={selected}
                disabled={item.disabled ?? false}
                onClick={
                  item.to ? () => navigate(item.to!) : undefined
                }
                sx={{ borderRadius: 1, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
            return (
              <ListItem key={item.label} disablePadding>
                {item.disabled ? (
                  <Tooltip title="Coming soon" placement="right">
                    <Box sx={{ width: '100%' }}>{button}</Box>
                  </Tooltip>
                ) : (
                  button
                )}
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ p: 2 }}>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: 'center',
              p: 1.5,
              borderRadius: 1,
              bgcolor: 'background.default',
            }}
          >
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {initialsFor(user?.name, user?.email)}
            </Avatar>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" noWrap>
                {displayName}
              </Typography>
              {user?.email && user.name ? (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
              ) : null}
            </Box>
            <Tooltip title="Sign out">
              <ListItemButton
                onClick={handleSignOut}
                aria-label="Sign out"
                sx={{ flexGrow: 0, borderRadius: 1, width: 'auto' }}
              >
                <LogoutIcon fontSize="small" />
              </ListItemButton>
            </Tooltip>
          </Stack>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 4, minWidth: 0 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
