import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import type { ExerciseCategory } from '@instigi/types';
import { metricCatalog } from '@instigi/utils/client';
import {
  useListExercisesQuery,
  type ListExercisesParams,
} from '../../features/exercises/exercisesApi';
import { useAddSessionExerciseMutation } from '../../features/sessions/sessionsApi';
import ExercisesToolbar from '../exercises/ExercisesToolbar';

export interface AddExerciseDialogProps {
  sessionId: string;
  open: boolean;
  onClose: () => void;
}

export default function AddExerciseDialog({
  sessionId,
  open,
  onClose,
}: AddExerciseDialogProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<'all' | ExerciseCategory>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryArgs = useMemo<ListExercisesParams>(() => {
    const args: ListExercisesParams = {};
    if (debouncedSearch) args.search = debouncedSearch;
    if (category !== 'all') args.category = category;
    return args;
  }, [debouncedSearch, category]);

  const { data, isLoading, isError, refetch } =
    useListExercisesQuery(queryArgs);
  const [addExercise] = useAddSessionExerciseMutation();

  const exercises = data ?? [];

  const handleAdd = async (exerciseDefinitionId: string) => {
    setPendingId(exerciseDefinitionId);
    try {
      await addExercise({ sessionId, exerciseDefinitionId }).unwrap();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        Add exercise
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <ExercisesToolbar
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
        />

        {isLoading ? (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : isError ? (
          <Stack spacing={1.5} sx={{ alignItems: 'center', py: 6 }}>
            <ErrorOutlineIcon color="error" sx={{ fontSize: 40 }} />
            <Typography variant="body1">Couldn&apos;t load exercises</Typography>
            <Button variant="outlined" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : exercises.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No exercises found.
            </Typography>
          </Box>
        ) : (
          <List>
            {exercises.map((exercise) => (
              <ListItem
                key={exercise.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={pendingId === exercise.id}
                    onClick={() => void handleAdd(exercise.id)}
                  >
                    Add
                  </Button>
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
                        label={
                          exercise.category.charAt(0).toUpperCase() +
                          exercise.category.slice(1)
                        }
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  }
                  secondary={exercise.metrics
                    .map(
                      (metric) =>
                        metricCatalog[metric.key]?.label ?? metric.key
                    )
                    .join(', ')}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
