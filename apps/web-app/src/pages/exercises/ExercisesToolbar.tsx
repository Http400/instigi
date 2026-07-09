import {
  Box,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

const CATEGORY_FILTERS = [
  'All',
  'Strength',
  'Cardio',
  'Swimming',
  'Mobility',
  'Custom',
] as const;

export default function ExercisesToolbar() {
  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      <TextField
        fullWidth
        placeholder="Search exercises…"
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

      <Stack
        direction="row"
        spacing={2}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: { xs: 'nowrap', md: 'wrap' },
          rowGap: 1,
        }}
      >
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
          {CATEGORY_FILTERS.map((label) => {
            const selected = label === 'All';
            return (
              <Chip
                key={label}
                label={label}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                sx={{ flexShrink: 0 }}
              />
            );
          })}
        </Box>

        <FormControl
          size="small"
          sx={{ minWidth: 140, display: { xs: 'none', md: 'flex' } }}
        >
          <Select defaultValue="all">
            <MenuItem value="all">All status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );
}
