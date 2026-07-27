import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { useParams } from 'react-router';
import type { SessionExercise } from '@instigi/types';
import { metricCatalog } from '@instigi/utils/client';
import {
  useGetSessionQuery,
  useRemoveSessionExerciseMutation,
  useUpdateSessionMutation,
} from '../../features/sessions/sessionsApi';
import AddExerciseDialog from './AddExerciseDialog';

function metricLabels(exercise: SessionExercise): string {
  return exercise.metrics
    .map((metric) => metricCatalog[metric.key]?.label ?? metric.key)
    .join(', ');
}

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function SessionPage() {
  const { sessionId } = useParams();
  const id = sessionId ?? '';
  const { data: session, isLoading, isError, refetch } = useGetSessionQuery(id, {
    skip: !id,
  });
  const [updateSession] = useUpdateSessionMutation();
  const [removeExercise] = useRemoveSessionExerciseMutation();

  const [title, setTitle] = useState('');
  const [syncedTitle, setSyncedTitle] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (session && session.title !== syncedTitle) {
    setSyncedTitle(session.title);
    setTitle(session.title);
  }

  const commitTitle = () => {
    const trimmed = title.trim();
    if (session && trimmed && trimmed !== session.title) {
      void updateSession({ id, title: trimmed });
    } else if (session) {
      setTitle(session.title);
    }
  };

  if (isLoading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (isError || !session) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: 'center', py: 8 }}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
        <Typography variant="h6">Couldn&apos;t load this session</Typography>
        <Button variant="outlined" onClick={() => refetch()} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Stack>
    );
  }

  const exercises = [...session.exercises].sort(
    (a, b) => a.position - b.position
  );

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <TextField
        variant="standard"
        fullWidth
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={commitTitle}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            (event.target as HTMLInputElement).blur();
          }
        }}
        slotProps={{
          htmlInput: {
            'aria-label': 'Session title',
            style: { fontSize: '1.75rem' },
          },
        }}
        sx={{ mb: 3 }}
      />

      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
      >
        <Typography variant="h6">Exercises</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Add exercise
        </Button>
      </Stack>

      <Paper variant="outlined">
        {exercises.length === 0 ? (
          <Stack spacing={1} sx={{ alignItems: 'center', py: 6 }}>
            <Typography variant="body1">No exercises yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Add an exercise from your library to get started.
            </Typography>
          </Stack>
        ) : (
          <List>
            {exercises.map((exercise) => (
              <ListItem
                key={exercise.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={`Remove ${exercise.name}`}
                    onClick={() =>
                      void removeExercise({
                        sessionId: id,
                        sessionExerciseId: exercise.id,
                      })
                    }
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Typography variant="body1">{exercise.name}</Typography>
                      <Chip
                        label={categoryLabel(exercise.category)}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  }
                  secondary={metricLabels(exercise)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <AddExerciseDialog
        sessionId={id}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}
