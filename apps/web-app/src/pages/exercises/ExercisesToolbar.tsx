import {
  Box,
  Chip,
  InputAdornment,
  Stack,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import type { ExerciseCategory } from '@instigi/types';

const CATEGORY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Strength', value: 'strength' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Mobility', value: 'mobility' },
  { label: 'Custom', value: 'custom' },
] as const satisfies ReadonlyArray<{
  label: string;
  value: 'all' | ExerciseCategory;
}>;

export interface ExercisesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: 'all' | ExerciseCategory;
  onCategoryChange: (category: 'all' | ExerciseCategory) => void;
}

export default function ExercisesToolbar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
}: ExercisesToolbarProps) {
  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      <TextField
        fullWidth
        placeholder="Search exercises…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          flexWrap: { xs: 'nowrap', md: 'wrap' },
          gap: 1,
          overflowX: { xs: 'auto', md: 'visible' },
          pb: { xs: 0.5, md: 0 },
          // hide the scrollbar on mobile while keeping horizontal scroll
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORY_FILTERS.map(({ label, value }) => {
          const selected = value === category;
          return (
            <Chip
              key={value}
              label={label}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => onCategoryChange(value)}
              sx={{ flexShrink: 0 }}
            />
          );
        })}
      </Box>
    </Stack>
  );
}
