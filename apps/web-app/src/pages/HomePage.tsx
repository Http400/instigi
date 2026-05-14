import { Link } from 'react-router';
import { Container, Typography, Box, Button } from '@mui/material';

export default function HomePage() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Welcome to Instigi
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button component={Link} to="/auth" variant="contained">Sign In / Sign Up</Button>
        </Box>
      </Box>
    </Container>
  );
}
