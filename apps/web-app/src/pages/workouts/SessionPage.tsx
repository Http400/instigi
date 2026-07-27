import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import { useNavigate, useParams } from 'react-router';
import type { SessionExercise } from '@instigi/types';
import { metricCatalog } from '@instigi/utils/client';
import {
  useFinishSessionMutation,
  useGetSessionQuery,
  useRemoveSessionExerciseMutation,
  useUpdateSessionMutation,
} from '../../features/sessions/sessionsApi';
import AddExerciseDialog from './AddExerciseDialog';
import ExerciseSetList from './ExerciseSetList';

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
  const navigate = useNavigate();
  const id = sessionId ?? '';
  const { data: session, isLoading, isError, refetch } = useGetSessionQuery(id, {
    skip: !id,
  });
  const [updateSession] = useUpdateSessionMutation();
  const [removeExercise] = useRemoveSessionExerciseMutation();
  const [finishSession, { isLoading: isFinishing }] = useFinishSessionMutation();

  const [title, setTitle] = useState('');
  const [syncedTitle, setSyncedTitle] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

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

  const readOnly = session.endedAt !== null;
  const totalSets = session.exercises.reduce(
    (sum, exercise) => sum + exercise.entries.length,
    0
  );

  const handleFinish = () => {
    setFinishError(null);
    void finishSession({ id })
      .unwrap()
      .then(() => {
        setConfirmOpen(false);
        void navigate('/workouts');
      })
      .catch(() => {
        setConfirmOpen(false);
        setFinishError('Could not finish this workout. Please try again.');
      });
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <TextField
        variant="standard"
        fullWidth
        value={title}
        disabled={readOnly}
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

      {readOnly && (
        <Alert severity="success" sx={{ mb: 2 }}>
          This workout is finished and saved.
        </Alert>
      )}

      {finishError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFinishError(null)}>
          {finishError}
        </Alert>
      )}

      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
      >
        <Typography variant="h6">Exercises</Typography>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add exercise
          </Button>
        )}
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
                alignItems="flex-start"
                secondaryAction={
                  readOnly ? undefined : (
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
                  )
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
                  secondary={
                    <>
                      {metricLabels(exercise)}
                      <ExerciseSetList
                        exercise={exercise}
                        sessionId={id}
                        readOnly={readOnly}
                      />
                    </>
                  }
                  slotProps={{ secondary: { component: 'div' } }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {!readOnly && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            color="success"
            disabled={totalSets === 0 || isFinishing}
            onClick={() => setConfirmOpen(true)}
          >
            Finish workout
          </Button>
        </Stack>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Finish workout?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This saves the workout and closes the session. You won&apos;t be able
            to change it afterwards.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={isFinishing}
            onClick={handleFinish}
          >
            Finish
          </Button>
        </DialogActions>
      </Dialog>

      <AddExerciseDialog
        sessionId={id}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}
