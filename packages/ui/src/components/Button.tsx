import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';

export interface ButtonProps extends MuiButtonProps {
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ loading, disabled, children, ...props }) => {
  return (
    <MuiButton disabled={loading || disabled} {...props}>
      {loading ? 'Loading...' : children}
    </MuiButton>
  );
};
