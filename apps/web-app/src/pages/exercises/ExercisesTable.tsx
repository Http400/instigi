import type { ReactNode } from 'react';
import {
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import PoolIcon from '@mui/icons-material/Pool';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import TuneIcon from '@mui/icons-material/Tune';
import StraightenIcon from '@mui/icons-material/Straighten';
import type {
  ExerciseCategory,
  PlaceholderExercise,
} from './placeholderExercises';

const CATEGORY_CHIP_COLOR: Record<ExerciseCategory, ChipProps['color']> = {
  Strength: 'primary',
  Cardio: 'error',
  Swimming: 'info',
  Mobility: 'success',
  Custom: 'secondary',
};

const EXERCISE_ICON: Record<PlaceholderExercise['icon'], ReactNode> = {
  strength: <FitnessCenterIcon fontSize="small" color="action" />,
  cardio: <DirectionsRunIcon fontSize="small" color="action" />,
  swimming: <PoolIcon fontSize="small" color="action" />,
  mobility: <SelfImprovementIcon fontSize="small" color="action" />,
  custom: <TuneIcon fontSize="small" color="action" />,
};

export interface ExercisesTableProps {
  rows: PlaceholderExercise[];
}

export default function ExercisesTable({ rows }: ExercisesTableProps) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Exercise</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Metrics</TableCell>
          <TableCell align="right">Actions</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name} hover>
            <TableCell>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                {EXERCISE_ICON[row.icon]}
                <Typography variant="body2">{row.name}</Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Chip
                label={row.category}
                size="small"
                color={CATEGORY_CHIP_COLOR[row.category]}
                variant="outlined"
              />
            </TableCell>
            <TableCell>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <StraightenIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                  {row.metrics.join(', ')}
                </Typography>
              </Stack>
            </TableCell>
            <TableCell align="right">
              <IconButton aria-label={`Actions for ${row.name}`} size="small">
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
