import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { ExerciseCategory } from '@instigi/types';
import {
  useListExercisesQuery,
  type ListExercisesParams,
} from '../features/exercises/exercisesApi';
import ExercisesToolbar from './exercises/ExercisesToolbar';
import ExercisesTable from './exercises/ExercisesTable';
import {
  ExercisesEmptyState,
  ExercisesErrorState,
  ExercisesLoading,
} from './exercises/ExercisesStates';

export default function ExercisesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<'all' | ExerciseCategory>('all');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const queryArgs = useMemo<ListExercisesParams>(() => {
    const args: ListExercisesParams = {};
    if (debouncedSearch) args.search = debouncedSearch;
    if (category !== 'all') args.category = category;
    return args;
  }, [debouncedSearch, category]);

  const { data, isLoading, isError, refetch } =
    useListExercisesQuery(queryArgs);

  const exercises = data ?? [];

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Exercises
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your exercise definitions and metrics.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled
          sx={{ display: { xs: 'none', md: 'inline-flex' }, flexShrink: 0 }}
        >
          New exercise
        </Button>
      </Stack>

      <ExercisesToolbar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
      />

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {isLoading ? (
          <ExercisesLoading />
        ) : isError ? (
          <ExercisesErrorState onRetry={refetch} />
        ) : exercises.length === 0 ? (
          <ExercisesEmptyState />
        ) : (
          <ExercisesTable rows={exercises} />
        )}
      </Paper>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', mt: 2 }}
      >
        {`${exercises.length} exercises`}
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        disabled
        fullWidth
        sx={{ display: { xs: 'flex', md: 'none' }, mt: 2 }}
      >
        New exercise
      </Button>
    </Box>
  );
}
