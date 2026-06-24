import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { KvEditor } from './KvEditor';

interface Item {
  id: string;
  key: string;
  value: string;
  type?: 'text' | 'file';
  file?: File | null;
}

const meta: Meta<typeof KvEditor> = {
  title: 'UI/KvEditor',
  component: KvEditor,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof KvEditor>;

export const Empty: Story = {
  args: { items: [], onChange: () => {} },
};

export const WithItems: Story = {
  render: () => {
    const [items, setItems] = useState<Item[]>([
      { id: '1', key: 'Content-Type', value: 'application/json' },
      { id: '2', key: 'Accept', value: '*/*' },
    ]);
    return <KvEditor items={items} onChange={(next) => setItems(next as Item[])} />;
  },
};

export const WithFileSupport: Story = {
  render: () => {
    const [items, setItems] = useState<Item[]>([{ id: '1', key: 'file', value: '', type: 'file' }]);
    return <KvEditor items={items} onChange={(next) => setItems(next as Item[])} allowFile />;
  },
};
