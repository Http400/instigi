import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'auth', Component: AuthPage },
      {
        Component: ProtectedRoute,
        children: [{ path: 'dashboard', Component: DashboardPage }],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
