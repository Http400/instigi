import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mui/material';
import { Logo } from './Logo';

const meta = {
  title: 'Components/Logo',
  component: Logo,
  tags: ['autodocs'],
  args: {
    orientation: 'vertical',
    size: 96,
    showWordmark: true,
  },
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['vertical', 'horizontal'],
    },
    size: { control: { type: 'range', min: 24, max: 240, step: 4 } },
    color: { control: 'color' },
    iconColor: { control: 'color' },
    textColor: { control: 'color' },
    showWordmark: { control: 'boolean' },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Matches the reference design: white logo on a dark background. */
export const Default: Story = {
  args: { color: '#ffffff' },
  decorators: [
    (Story) => (
      <Box sx={{ bgcolor: '#0a0a0a', p: 6, display: 'inline-flex' }}>
        <Story />
      </Box>
    ),
  ],
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal', color: '#ffffff' },
  decorators: [
    (Story) => (
      <Box sx={{ bgcolor: '#0a0a0a', p: 6, display: 'inline-flex' }}>
        <Story />
      </Box>
    ),
  ],
};

/** Dark logo on a light background. */
export const OnLight: Story = {
  args: { color: '#121720' },
};

export const IconOnly: Story = {
  args: { showWordmark: false, color: '#121720' },
};

export const Large: Story = {
  args: { size: 200, color: '#121720' },
};

/** Independent colors for the icon and the wordmark. */
export const SplitColors: Story = {
  args: { iconColor: '#4f8cff', textColor: '#ffffff' },
  decorators: [
    (Story) => (
      <Box sx={{ bgcolor: '#0a0a0a', p: 6, display: 'inline-flex' }}>
        <Story />
      </Box>
    ),
  ],
};
