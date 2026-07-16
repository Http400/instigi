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
import type { Exercise, ExerciseCategory } from '@instigi/types';
import { metricCatalog } from '@instigi/utils/client';

const CATEGORY_CHIP_COLOR: Record<ExerciseCategory, ChipProps['color']> = {
  strength: 'primary',
  cardio: 'error',
  mobility: 'success',
  custom: 'secondary',
};

const CATEGORY_ICON: Record<ExerciseCategory, ReactNode> = {
  strength: <FitnessCenterIcon fontSize="small" color="action" />,
  cardio: <DirectionsRunIcon fontSize="small" color="action" />,
  mobility: <SelfImprovementIcon fontSize="small" color="action" />,
  custom: <TuneIcon fontSize="small" color="action" />,
};

function categoryLabel(category: ExerciseCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function leadingIcon(row: Exercise): ReactNode {
  // Swimming folds into cardio in the data model; surface a Pool glyph by name.
  if (/swim/i.test(row.name)) {
    return <PoolIcon fontSize="small" color="action" />;
  }
  return CATEGORY_ICON[row.category];
}

function metricLabels(row: Exercise): string {
  return row.metrics
    .map((metric) => metricCatalog[metric.key]?.label ?? metric.key)
    .join(', ');
}

export interface ExercisesTableProps {
  rows: Exercise[];
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
          <TableRow key={row.id} hover>
            <TableCell>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                {leadingIcon(row)}
                <Typography variant="body2">{row.name}</Typography>
              </Stack>
            </TableCell>
            <TableCell>
              <Chip
                label={categoryLabel(row.category)}
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
                  {metricLabels(row)}
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
