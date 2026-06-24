import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CodeView } from './CodeView';

const meta: Meta<typeof CodeView> = {
  title: 'UI/CodeView',
  component: CodeView,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CodeView>;

const sampleCode = `function hello() {
  console.log("Hello, world!");
  return 42;
}`;

export const PlainText: Story = {
  args: { text: sampleCode },
};

export const WithHighlighting: Story = {
  args: {
    text: sampleCode,
    html: `<span style="color:#569cd6">function</span> <span style="color:#dcdcaa">hello</span>() {<br/>  <span style="color:#dcdcaa">console</span>.<span style="color:#dcdcaa">log</span>(<span style="color:#ce9178">"Hello, world!"</span>);<br/>  <span style="color:#b5cea8">return</span> <span style="color:#b5cea8">42</span>;<br/>}`,
  },
};

export const Wrapped: Story = {
  args: { text: 'A '.repeat(100), wrap: true },
};
