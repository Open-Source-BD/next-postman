'use client';

interface PaneResizerProps {
  /** Called with the pointer's clientY on each move while dragging. */
  onDrag: (clientY: number) => void;
}

/** Horizontal divider; drag vertically to resize the panes above/below it. */
export function PaneResizer({ onDrag }: PaneResizerProps) {
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => onDrag(ev.clientY);
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="pane-resizer" onPointerDown={onPointerDown} title="Drag to resize">
      <div className="pane-resizer-grip" />
    </div>
  );
}
