import { createBrowserRouter } from 'react-router';
import RootLayout from './layouts/RootLayout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: 'auth', Component: AuthPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);
