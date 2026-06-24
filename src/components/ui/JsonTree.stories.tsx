import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { JsonTree } from './JsonTree';

const meta: Meta<typeof JsonTree> = {
  title: 'UI/JsonTree',
  component: JsonTree,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof JsonTree>;

const sampleData = {
  name: 'test',
  count: 42,
  active: true,
  tags: ['a', 'b', 'c'],
  metadata: {
    created: '2024-01-01',
    nested: { value: null },
  },
};

export const Default: Story = {
  args: { data: sampleData, rawText: JSON.stringify(sampleData, null, 2) },
};

export const WithFilter: Story = {
  args: { data: sampleData, rawText: JSON.stringify(sampleData, null, 2), query: 'name' },
};
