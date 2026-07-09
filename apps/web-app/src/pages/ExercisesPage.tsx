import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExercisesToolbar from './exercises/ExercisesToolbar';
import ExercisesTable from './exercises/ExercisesTable';
import { PLACEHOLDER_EXERCISES } from './exercises/placeholderExercises';

export default function ExercisesPage() {
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

      <ExercisesToolbar />

      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <ExercisesTable rows={PLACEHOLDER_EXERCISES} />
      </Paper>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', mt: 2 }}
      >
        {`${PLACEHOLDER_EXERCISES.length} exercises`}
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
