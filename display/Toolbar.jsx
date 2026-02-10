import React from "react";
import "./DisplayTab.css";

export default function Toolbar({
  onUpload,
  onAddSection,
  onUndo,
  onRedo,
  onSave,
  onExport,
  canUndo,
  canRedo,
  showGrid,
  onToggleGrid,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button className="toolbar-btn" onClick={onUpload} title="Upload a new photo">
          📤 Upload
        </button>
        <button className="toolbar-btn" onClick={onAddSection} title="Add a section/divider">
          ➕ Section
        </button>
      </div>

      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${!canUndo ? 'disabled' : ''}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          className={`toolbar-btn ${!canRedo ? 'disabled' : ''}`}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
      </div>

      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${showGrid ? 'active' : ''}`}
          onClick={onToggleGrid}
          title="Toggle grid/guides"
        >
          ⊞ Grid
        </button>
      </div>

      <div className="toolbar-section">
        <button className="toolbar-btn" onClick={onSave} title="Save this collage">
          💾 Save
        </button>
        <button className="toolbar-btn" onClick={onExport} title="Export as image">
          📥 Export
        </button>
      </div>
    </div>
  );
}
