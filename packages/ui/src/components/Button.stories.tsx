import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Button',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Contained: Story = {
  args: {
    variant: 'contained',
    children: 'Contained',
  },
};

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: 'Outlined',
  },
};

export const Text: Story = {
  args: {
    variant: 'text',
    children: 'Text',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    variant: 'contained',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    variant: 'contained',
    children: 'Disabled',
  },
};

export const Secondary: Story = {
  args: {
    color: 'secondary',
    variant: 'contained',
    children: 'Secondary',
  },
};

export const Error: Story = {
  args: {
    color: 'error',
    variant: 'contained',
    children: 'Error',
  },
};
