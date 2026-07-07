import React from 'react';
import { Box, Typography, BoxProps } from '@mui/material';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import { LogoIcon } from './LogoIcon';

export interface LogoProps extends Omit<BoxProps, 'color'> {
  /** Layout of icon relative to the wordmark. */
  orientation?: 'vertical' | 'horizontal';
  /** Height of the icon in pixels. The wordmark scales relative to this. */
  size?: number;
  /** Color applied to both the icon and the wordmark (any CSS color). */
  color?: string;
  /** Overrides `color` for the icon only. */
  iconColor?: string;
  /** Overrides `color` for the wordmark only. */
  textColor?: string;
  /** Whether to render the INSTIGI wordmark. */
  showWordmark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  orientation = 'vertical',
  size = 96,
  color = 'currentColor',
  iconColor,
  textColor,
  showWordmark = true,
  sx,
  ...props
}) => {
  const isVertical = orientation === 'vertical';
  const iconWidth = (size * 584) / 410;
  const wordmarkSize = size * (isVertical ? 0.34 : 0.42);
  const resolvedIconColor = iconColor ?? color;
  const resolvedTextColor = textColor ?? color;

  return (
    <Box
      sx={[
        {
          display: 'inline-flex',
          flexDirection: isVertical ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isVertical ? size * 0.16 + 'px' : size * 0.28 + 'px',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      <LogoIcon
        sx={{ width: iconWidth, height: size, color: resolvedIconColor }}
      />
      {showWordmark && (
        <Typography
          component="span"
          sx={{
            fontFamily: '"Montserrat", sans-serif',
            fontWeight: 600,
            fontSize: wordmarkSize,
            letterSpacing: '0.3em',
            lineHeight: 1,
            textTransform: 'uppercase',
            color: resolvedTextColor,
            // compensate for trailing letter-spacing to keep the wordmark centered
            pl: '0.3em',
          }}
        >
          Instigi
        </Typography>
      )}
    </Box>
  );
};
