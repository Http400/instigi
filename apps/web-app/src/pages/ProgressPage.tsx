import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { useNavigate } from 'react-router';
import type { SessionSummary } from '@instigi/types';
import { useGetHistoryQuery } from '../features/sessions/sessionsApi';
import { computeProgressStats } from '../features/sessions/progressStats';

function formatFinishedAt(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function exerciseCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'exercise' : 'exercises'}`;
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Card variant="outlined" sx={{ flexGrow: 1, minWidth: 0 }}>
      <CardContent>
        <Typography variant="h3" component="p">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const { data: history, isLoading, isError, refetch } = useGetHistoryQuery();

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Progress
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your training at a glance.
      </Typography>

      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : isError ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
          <Typography variant="h6">Couldn&apos;t load your progress</Typography>
          <Typography variant="body2" color="text.secondary">
            Something went wrong while loading your workout stats.
          </Typography>
          <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 1 }}>
            Retry
          </Button>
        </Stack>
      ) : !history || history.length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: 'center', py: 8 }}>
          <Typography variant="h6">No workouts yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Finish your first workout to start tracking your progress.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/workouts')}
            sx={{ mt: 1 }}
          >
            Start a workout
          </Button>
        </Stack>
      ) : (
        <ProgressContent history={history} navigate={navigate} />
      )}
    </Box>
  );
}

function ProgressContent({
  history,
  navigate,
}: {
  history: SessionSummary[];
  navigate: (to: string) => void;
}) {
  const stats = computeProgressStats(history, new Date());

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <StatCard value={stats.totalWorkouts} label="Total workouts" />
        <StatCard value={stats.last7Days} label="Last 7 days" />
        <StatCard value={stats.totalExercises} label="Total exercises" />
      </Stack>

      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
      >
        <Typography variant="h6">Recent activity</Typography>
        <Button variant="text" onClick={() => navigate('/workouts/history')}>
          View all history
        </Button>
      </Stack>

      <List>
        {stats.recent.map((workout) => (
          <ListItem key={workout.id} disablePadding>
            <ListItemButton onClick={() => navigate(`/workouts/${workout.id}`)}>
              <ListItemText
                primary={workout.title || 'Untitled workout'}
                secondary={`${formatFinishedAt(
                  workout.endedAt
                )} · ${exerciseCountLabel(workout.exerciseCount)}`}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
}
