import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { Button } from '@instigi/ui';

export default function App() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Instigi Web App
        </Typography>
        <Button variant="contained" color="primary">
          Get Started
        </Button>
      </Box>
    </Container>
  );
}
