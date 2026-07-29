import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

export type LogoIconProps = SvgIconProps;

export const LogoIcon: React.FC<LogoIconProps> = (props) => {
  return (
    <SvgIcon
      viewBox="0 0 584 410"
      role="img"
      aria-label="Instigi icon"
      {...props}
    >
      <rect x="0" y="155" width="62" height="116" rx="20" fill="currentColor" />
      <rect x="120" y="75" width="72" height="260" rx="20" fill="currentColor" />
      <rect x="250" y="0" width="84" height="410" rx="20" fill="currentColor" />
      <rect x="392" y="75" width="72" height="260" rx="20" fill="currentColor" />
      <rect x="522" y="155" width="62" height="116" rx="20" fill="currentColor" />
    </SvgIcon>
  );
};
