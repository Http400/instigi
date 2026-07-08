import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AuthForm } from './AuthForm';

const meta = {
  title: 'Components/AuthForm',
  component: AuthForm,
  tags: ['autodocs'],
  args: {
    mode: 'signIn',
    onSubmit: (data) => console.log('Submitted:', data),
  },
} satisfies Meta<typeof AuthForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignIn: Story = {
  args: {
    mode: 'signIn',
  },
};

export const SignUp: Story = {
  args: {
    mode: 'signUp',
  },
};

export const SignInLoading: Story = {
  args: {
    mode: 'signIn',
    loading: true,
  },
};

export const SignUpLoading: Story = {
  args: {
    mode: 'signUp',
    loading: true,
  },
};

export const SignInWithError: Story = {
  args: {
    mode: 'signIn',
    error: 'Invalid email or password.',
  },
};

export const SignUpWithError: Story = {
  args: {
    mode: 'signUp',
    error: 'An account with this email already exists.',
  },
};

export const SignUpWithPasswordMismatch: Story = {
  args: {
    mode: 'signUp',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sign-up mode with the Confirm Password field visible. Fill in mismatched passwords and click "Create account" to see the inline "Passwords do not match" validation error.',
      },
    },
  },
};

export const SignUpNameRequired: Story = {
  args: {
    mode: 'signUp',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Sign-up mode shows the Name field (before Email). Submit with an empty name to see the inline "Name is required" validation error. Toggling to sign-in hides the field.',
      },
    },
  },
};

export const Interactive: Story = {
  render: (args) => {
    const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
    return (
      <AuthForm
        {...args}
        mode={mode}
        onModeChange={setMode}
        onSubmit={(data) => console.log('Submitted:', data)}
      />
    );
  },
  args: {},
};
