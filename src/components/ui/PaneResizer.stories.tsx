import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PaneResizer } from './PaneResizer';

const meta: Meta<typeof PaneResizer> = {
  title: 'UI/PaneResizer',
  component: PaneResizer,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof PaneResizer>;

export const Default: Story = {
  args: { onDrag: (y: number) => console.log('drag', y) },
  render: (args) => (
    <div style={{ height: 200, display: 'flex', flexDirection: 'column', width: 400 }}>
      <div style={{ flex: 1, background: '#f0f0f0' }} />
      <PaneResizer {...args} />
      <div style={{ flex: 1, background: '#e0e0e0' }} />
    </div>
  ),
};
