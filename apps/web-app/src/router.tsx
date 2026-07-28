import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ExercisesPage from './pages/ExercisesPage';
import WorkoutsPage from './pages/WorkoutsPage';
import ProgressPage from './pages/ProgressPage';
import SessionPage from './pages/workouts/SessionPage';
import HistoryPage from './pages/workouts/HistoryPage';
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
        children: [
          { path: 'dashboard', Component: DashboardPage },
          {
            Component: AppLayout,
            children: [
              { path: 'exercises', Component: ExercisesPage },
              { path: 'workouts', Component: WorkoutsPage },
              { path: 'workouts/history', Component: HistoryPage },
              { path: 'workouts/:sessionId', Component: SessionPage },
              { path: 'progress', Component: ProgressPage },
            ],
          },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
