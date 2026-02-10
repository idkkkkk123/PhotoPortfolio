import React, { useState, useRef, useCallback } from "react";
import ImageItem from "./ImageItem";
import SectionDivider from "./SectionDivider";
import "./DisplayTab.css";

const SNAP_THRESHOLD = 10;
const GUIDES = ['left', 'center', 'right', 'top', 'middle', 'bottom'];

export default function Canvas({
  items,
  sections,
  selectedId,
  onSelectItem,
  onUpdateItem,
  onDeleteItem,
  showGrid,
  gridSize,
  snapThreshold,
}) {
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const snapToGrid = useCallback((value) => {
    return Math.round(value / gridSize) * gridSize;
  }, [gridSize]);

  const handleMouseDown = (e, itemId) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onSelectItem(itemId);
    setDragging(itemId);
    setDragOffset({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !canvasRef.current) return;

    const item = items.find(i => i.id === dragging);
    if (!item) return;

    const deltaX = e.clientX - dragOffset.x;
    const deltaY = e.clientY - dragOffset.y;

    let newX = item.x + deltaX;
    let newY = item.y + deltaY;

    // Snap to grid
    if (showGrid) {
      newX = snapToGrid(newX);
      newY = snapToGrid(newY);
    }

    // Keep within bounds
    newX = Math.max(0, newX);
    newY = Math.max(0, newY);

    onUpdateItem(dragging, { x: newX, y: newY });

    setDragOffset({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleCanvasClick = () => {
    onSelectItem(null);
  };

  return (
    <div
      ref={canvasRef}
      className="canvas"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onClick={handleCanvasClick}
    >
      {showGrid && (
        <div className="grid-background" style={{
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }} />
      )}

      {sections.map(section => (
        <SectionDivider key={section.id} section={section} />
      ))}

      {items.map(item => (
        <ImageItem
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          onMouseDown={(e) => handleMouseDown(e, item.id)}
          onUpdate={(updates) => onUpdateItem(item.id, updates)}
          onDelete={() => onDeleteItem(item.id)}
          snapToGrid={snapToGrid}
          showGrid={showGrid}
        />
      ))}
    </div>
  );
}
