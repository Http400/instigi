import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { useNavigate } from 'react-router';
import {
  useCreateSessionMutation,
  useGetActiveSessionQuery,
} from '../features/sessions/sessionsApi';

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const { data: activeSession, isLoading, isError, refetch } =
    useGetActiveSessionQuery();
  const [createSession, { isLoading: isCreating }] = useCreateSessionMutation();

  const handleStart = async () => {
    const session = await createSession({}).unwrap();
    navigate(`/workouts/${session.id}`);
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Workouts
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Start a new workout or continue where you left off.
      </Typography>

      <Stack direction="row" sx={{ mb: 3 }}>
        <Button
          variant="text"
          startIcon={<HistoryIcon />}
          onClick={() => navigate('/workouts/history')}
        >
          View history
        </Button>
      </Stack>

      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : isError ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
          <Typography variant="h6">Couldn&apos;t load your workouts</Typography>
          <Typography variant="body2" color="text.secondary">
            Something went wrong while checking for an active session.
          </Typography>
          <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 1 }}>
            Retry
          </Button>
        </Stack>
      ) : activeSession ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              Active session
            </Typography>
            <Typography variant="h5" gutterBottom>
              {activeSession.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {`${activeSession.exercises.length} ${
                activeSession.exercises.length === 1 ? 'exercise' : 'exercises'
              }`}
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => navigate(`/workouts/${activeSession.id}`)}
            >
              Continue
            </Button>
          </CardActions>
        </Card>
      ) : (
        <Stack spacing={2} sx={{ alignItems: 'center', py: 8 }}>
          <Typography variant="h6">No active workout</Typography>
          <Typography variant="body2" color="text.secondary">
            Start a workout to begin adding exercises.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleStart}
            disabled={isCreating}
          >
            Start workout
          </Button>
        </Stack>
      )}
    </Box>
  );
}
