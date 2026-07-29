import { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { ExerciseEntry, MetricKey, SessionExercise } from '@instigi/types';
import { metricCatalog } from '@instigi/utils/client';
import {
  useDeleteSetMutation,
  useLogSetMutation,
  useUpdateSetMutation,
} from '../../features/sessions/sessionsApi';
import { formatDuration, parseDuration } from '../../features/sessions/duration';

export interface ExerciseSetListProps {
  exercise: SessionExercise;
  sessionId: string;
  readOnly: boolean;
}

function unitLabel(key: MetricKey): string {
  if (key === 'load') return 'kg';
  if (key === 'distance') return 'm';
  return '';
}

function parseMetricInput(key: MetricKey, raw: string): number | null {
  if (key === 'duration') {
    return parseDuration(raw);
  }
  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function formatMetricValue(key: MetricKey, value: number): string {
  if (key === 'duration') {
    return formatDuration(value);
  }
  const unit = unitLabel(key);
  return unit ? `${value} ${unit}` : `${value}`;
}

export default function ExerciseSetList({
  exercise,
  sessionId,
  readOnly,
}: ExerciseSetListProps) {
  const [logSet] = useLogSetMutation();
  const [updateSet] = useUpdateSetMutation();
  const [deleteSet] = useDeleteSetMutation();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const entries = [...exercise.entries].sort((a, b) => a.position - b.position);

  const buildValues = (): Record<MetricKey, number> | null => {
    const values: Partial<Record<MetricKey, number>> = {};
    let valid = true;
    for (const metric of exercise.metrics) {
      const raw = (draft[metric.key] ?? '').trim();
      const required = metric.required !== false;
      if (raw === '') {
        if (required) valid = false;
        continue;
      }
      const parsed = parseMetricInput(metric.key, raw);
      if (parsed === null || (required && parsed <= 0)) {
        valid = false;
        continue;
      }
      values[metric.key] = parsed;
    }
    return valid ? (values as Record<MetricKey, number>) : null;
  };

  const canSubmit = !readOnly && buildValues() !== null;

  const handleSubmit = () => {
    const values = buildValues();
    if (!values) return;
    const action = editingId
      ? updateSet({
          sessionId,
          sessionExerciseId: exercise.id,
          entryId: editingId,
          values,
        })
      : logSet({ sessionId, sessionExerciseId: exercise.id, values });
    void action
      .unwrap()
      .then(() => {
        setDraft({});
        setEditingId(null);
      })
      .catch(() => {});
  };

  const handleEdit = (entry: ExerciseEntry) => {
    const next: Record<string, string> = {};
    for (const metric of exercise.metrics) {
      const value = entry.values[metric.key];
      if (value !== undefined) {
        next[metric.key] =
          metric.key === 'duration' ? formatDuration(value) : String(value);
      }
    }
    setDraft(next);
    setEditingId(entry.id);
  };

  const handleDelete = (entryId: string) => {
    void deleteSet({ sessionId, sessionExerciseId: exercise.id, entryId });
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Stack spacing={0.5}>
        {entries.map((entry, index) => (
          <Stack
            key={entry.id}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Typography variant="body2" sx={{ minWidth: 48 }}>
              Set {index + 1}
            </Typography>
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {exercise.metrics
                .map((metric) => {
                  const value = entry.values[metric.key];
                  if (value === undefined) return null;
                  const label = metricCatalog[metric.key]?.label ?? metric.key;
                  return `${label} ${formatMetricValue(metric.key, value)}`;
                })
                .filter(Boolean)
                .join(' · ')}
            </Typography>
            {!readOnly && (
              <>
                <IconButton
                  size="small"
                  aria-label={`Edit set ${index + 1} of ${exercise.name}`}
                  onClick={() => handleEdit(entry)}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={`Delete set ${index + 1} of ${exercise.name}`}
                  onClick={() => handleDelete(entry.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Stack>
        ))}
      </Stack>

      {!readOnly && (
        <Stack
          direction="row"
          spacing={1}
        >
          {exercise.metrics.map((metric) => {
            const catalogItem = metricCatalog[metric.key];
            const label = catalogItem?.label ?? metric.key;
            const unit = unitLabel(metric.key);
            const isDuration = metric.key === 'duration';
            return (
              <TextField
                key={metric.key}
                size="small"
                label={unit ? `${label} (${unit})` : label}
                placeholder={isDuration ? 'm:ss' : undefined}
                value={draft[metric.key] ?? ''}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    [metric.key]: event.target.value,
                  }))
                }
                slotProps={{
                  htmlInput: {
                    'aria-label': `${label} for ${exercise.name}`,
                    inputMode: isDuration ? 'text' : 'decimal',
                  },
                }}
                sx={{ maxWidth: 120 }}
              />
            );
          })}
          <Button
            variant="outlined"
            size="small"
            startIcon={editingId ? undefined : <AddIcon />}
            disabled={!canSubmit}
            aria-label={
              editingId
                ? `Save set for ${exercise.name}`
                : `Add set to ${exercise.name}`
            }
            onClick={handleSubmit}
          >
            {editingId ? 'Save' : 'Add set'}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
