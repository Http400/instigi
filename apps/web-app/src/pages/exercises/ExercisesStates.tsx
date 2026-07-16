import {
  Box,
  Button,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';

export function ExercisesEmptyState() {
  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: 'center', justifyContent: 'center', py: 8 }}
    >
      <SearchOffIcon color="disabled" sx={{ fontSize: 48 }} />
      <Typography variant="h6">No exercises found</Typography>
      <Typography variant="body2" color="text.secondary">
        Try adjusting your search or filters.
      </Typography>
    </Stack>
  );
}

export interface ExercisesErrorStateProps {
  onRetry: () => void;
}

export function ExercisesErrorState({ onRetry }: ExercisesErrorStateProps) {
  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: 'center', justifyContent: 'center', py: 8 }}
    >
      <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
      <Typography variant="h6">Couldn&apos;t load exercises</Typography>
      <Typography variant="body2" color="text.secondary">
        Something went wrong while fetching your exercises.
      </Typography>
      <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>
        Retry
      </Button>
    </Stack>
  );
}

export interface ExercisesLoadingProps {
  /** Number of skeleton rows to render. */
  rows?: number;
}

export function ExercisesLoading({ rows = 5 }: ExercisesLoadingProps) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center' }}
              >
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton variant="text" width="40%" />
              </Stack>
            </TableCell>
            <TableCell>
              <Skeleton variant="rounded" width={72} height={24} />
            </TableCell>
            <TableCell>
              <Skeleton variant="text" width="60%" />
            </TableCell>
            <TableCell align="right">
              <Box sx={{ display: 'inline-flex' }}>
                <Skeleton variant="circular" width={24} height={24} />
              </Box>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
