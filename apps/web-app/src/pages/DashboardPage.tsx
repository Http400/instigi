import { Container, Box, Typography } from '@mui/material';

export default function DashboardPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You&apos;re signed in. This is a placeholder protected page.
        </Typography>
      </Box>
    </Container>
  );
}
