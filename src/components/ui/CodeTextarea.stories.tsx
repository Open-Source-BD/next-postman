import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CodeTextarea } from './CodeTextarea';

const meta: Meta<typeof CodeTextarea> = {
  title: 'UI/CodeTextarea',
  component: CodeTextarea,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof CodeTextarea>;

export const JavaScript: Story = {
  render: () => {
    const [value, setValue] = useState('function greet(name) {\n  return `Hello, ${name}!`;\n}');
    return <CodeTextarea value={value} onChange={setValue} language="js" rows={8} style={{ width: '100%' }} />;
  },
};

export const JSON: Story = {
  render: () => {
    const [value, setValue] = useState('{\n  "name": "test",\n  "value": 42\n}');
    return <CodeTextarea value={value} onChange={setValue} language="json" rows={8} style={{ width: '100%' }} />;
  },
};

export const Empty: Story = {
  args: { value: '', onChange: () => {}, placeholder: 'Type something...', rows: 4 },
};
