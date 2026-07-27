import {
  Box,
  Button,
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
import { useGetHistoryQuery } from '../../features/sessions/sessionsApi';

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

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data: history, isLoading, isError, refetch } = useGetHistoryQuery();

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        History
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Your finished workouts, most recent first.
      </Typography>

      {isLoading ? (
        <Stack sx={{ alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : isError ? (
        <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
          <Typography variant="h6">Couldn&apos;t load your history</Typography>
          <Typography variant="body2" color="text.secondary">
            Something went wrong while loading your past workouts.
          </Typography>
          <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 1 }}>
            Retry
          </Button>
        </Stack>
      ) : !history || history.length === 0 ? (
        <Stack spacing={1} sx={{ alignItems: 'center', py: 8 }}>
          <Typography variant="h6">No finished workouts yet</Typography>
          <Typography variant="body2" color="text.secondary">
            Finish a workout and it will show up here.
          </Typography>
        </Stack>
      ) : (
        <List>
          {history.map((workout: SessionSummary) => (
            <ListItem key={workout.id} disablePadding>
              <ListItemButton
                onClick={() => navigate(`/workouts/${workout.id}`)}
              >
                <ListItemText
                  primary={workout.title || 'Untitled workout'}
                  secondary={`${formatFinishedAt(workout.endedAt)} · ${exerciseCountLabel(
                    workout.exerciseCount
                  )}`}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
