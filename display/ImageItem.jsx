import React, { useState, useRef } from "react";
import "./DisplayTab.css";

const RESIZE_HANDLE_SIZE = 12;
const MIN_SIZE = 50;

export default function ImageItem({
  item,
  selected,
  onMouseDown,
  onUpdate,
  onDelete,
  snapToGrid,
  showGrid,
}) {
  const [resizing, setResizing] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const itemRef = useRef(null);

  const handleResizeStart = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(corner);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: item.width,
      height: item.height,
      x: item.x,
      y: item.y,
    });
  };

  const handleResizeMove = (e) => {
    if (!resizing || !resizeStart) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newX = resizeStart.x;
    let newY = resizeStart.y;

    // Calculate new dimensions based on which corner is being dragged
    if (resizing.includes('se')) {
      newWidth = Math.max(MIN_SIZE, resizeStart.width + deltaX);
      newHeight = Math.max(MIN_SIZE, resizeStart.height + deltaY);
    } else if (resizing.includes('sw')) {
      newWidth = Math.max(MIN_SIZE, resizeStart.width - deltaX);
      newHeight = Math.max(MIN_SIZE, resizeStart.height + deltaY);
      newX = resizeStart.x + deltaX;
    } else if (resizing.includes('ne')) {
      newWidth = Math.max(MIN_SIZE, resizeStart.width + deltaX);
      newHeight = Math.max(MIN_SIZE, resizeStart.height - deltaY);
      newY = resizeStart.y + deltaY;
    } else if (resizing.includes('nw')) {
      newWidth = Math.max(MIN_SIZE, resizeStart.width - deltaX);
      newHeight = Math.max(MIN_SIZE, resizeStart.height - deltaY);
      newX = resizeStart.x + deltaX;
      newY = resizeStart.y + deltaY;
    }

    if (showGrid) {
      newX = snapToGrid(newX);
      newY = snapToGrid(newY);
      newWidth = snapToGrid(newWidth);
      newHeight = snapToGrid(newHeight);
    }

    onUpdate({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setResizing(null);
    setResizeStart(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      onDelete();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onUpdate({ y: item.y - 10 });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onUpdate({ y: item.y + 10 });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onUpdate({ x: item.x - 10 });
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onUpdate({ x: item.x + 10 });
    }
  };

  React.useEffect(() => {
    if (selected) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [selected, resizing, resizeStart, item]);

  return (
    <div
      ref={itemRef}
      className={`image-item ${selected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        zIndex: item.z || 1,
        transformOrigin: 'center',
        transform: `rotate(${item.rotation || 0}deg)`,
      }}
      onMouseDown={onMouseDown}
    >
      <img
        src={item.src}
        alt="collage item"
        className="image-item-img"
        draggable={false}
      />

      {selected && (
        <>
          <div className="image-controls">
            <button
              className="control-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete (Delete key)"
            >
              ✕
            </button>
            <button
              className="control-btn rotate-btn"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ rotation: (item.rotation || 0) + 15 });
              }}
              title="Rotate 15°"
            >
              ⟳
            </button>
          </div>

          {/* Resize handles */}
          {['nw', 'ne', 'sw', 'se'].map(corner => (
            <div
              key={corner}
              className={`resize-handle ${corner}`}
              onMouseDown={(e) => handleResizeStart(e, corner)}
              title={`Resize from ${corner}`}
            />
          ))}
        </>
      )}
    </div>
  );
}
