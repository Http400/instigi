import { Box, Typography } from '@mui/material';
import type { WorkoutSession } from '@instigi/types';

function formatFinishedAt(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

function formatSessionDuration(startedIso: string, endedIso: string): string {
  const startedMs = new Date(startedIso).getTime();
  const endedMs = new Date(endedIso).getTime();
  const totalMinutes = Math.floor(Math.max(0, endedMs - startedMs) / 60000);

  if (totalMinutes < 1) {
    return '<1m';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export default function WorkoutSummary({
  session,
}: {
  session: WorkoutSession;
}) {
  if (session.endedAt === null) {
    return null;
  }

  const totalExercises = session.exercises.length;
  const totalSets = session.exercises.reduce(
    (sum, exercise) => sum + exercise.entries.length,
    0
  );
  const duration = formatSessionDuration(session.startedAt, session.endedAt);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Finished {formatFinishedAt(session.endedAt)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {pluralize(totalExercises, 'exercise')} ·{' '}
        {pluralize(totalSets, 'set')} · {duration}
      </Typography>
    </Box>
  );
}
