import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { Button } from '@instigi/ui';

export default function App() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Instigi Admin
        </Typography>
        <Button variant="contained" color="secondary">
          Manage Users
        </Button>
      </Box>
    </Container>
  );
}
