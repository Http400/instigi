import { Link } from 'react-router';
import { Container, Typography, Box, Button } from '@mui/material';

export default function NotFoundPage() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          404 — Page Not Found
        </Typography>
        <Button component={Link} to="/" variant="contained">
          Go Home
        </Button>
      </Box>
    </Container>
  );
}
