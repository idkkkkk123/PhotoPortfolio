import React from "react";
import "./DisplayTab.css";

export default function PropertiesPanel({
  selectedItem,
  onUpdate,
  onDelete,
  onBringForward,
  onSendBackward,
}) {
  if (!selectedItem) {
    return (
      <div className="properties-panel">
        <h3>Properties</h3>
        <p className="no-selection">Select an image to edit properties</p>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <h3>Properties</h3>

      <div className="property-group">
        <label>Position</label>
        <div className="property-row">
          <label className="small">X:</label>
          <input
            type="number"
            value={Math.round(selectedItem.x)}
            onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
            className="property-input"
          />
        </div>
        <div className="property-row">
          <label className="small">Y:</label>
          <input
            type="number"
            value={Math.round(selectedItem.y)}
            onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
            className="property-input"
          />
        </div>
      </div>

      <div className="property-group">
        <label>Size</label>
        <div className="property-row">
          <label className="small">W:</label>
          <input
            type="number"
            value={Math.round(selectedItem.width)}
            onChange={(e) => onUpdate({ width: Math.max(50, parseInt(e.target.value) || 50) })}
            className="property-input"
          />
        </div>
        <div className="property-row">
          <label className="small">H:</label>
          <input
            type="number"
            value={Math.round(selectedItem.height)}
            onChange={(e) => onUpdate({ height: Math.max(50, parseInt(e.target.value) || 50) })}
            className="property-input"
          />
        </div>
      </div>

      <div className="property-group">
        <label>Rotation</label>
        <input
          type="range"
          min="0"
          max="360"
          value={selectedItem.rotation || 0}
          onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
          className="property-slider"
        />
        <span className="property-value">{selectedItem.rotation || 0}°</span>
      </div>

      <div className="property-group">
        <label>Layering</label>
        <div className="layer-buttons">
          <button
            className="layer-btn"
            onClick={() => onBringForward(selectedItem.id)}
            title="Bring forward"
          >
            ↑ Forward
          </button>
          <button
            className="layer-btn"
            onClick={() => onSendBackward(selectedItem.id)}
            title="Send backward"
          >
            ↓ Backward
          </button>
        </div>
      </div>

      <div className="property-group">
        <label>Actions</label>
        <button
          className="delete-action-btn"
          onClick={() => onDelete(selectedItem.id)}
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}
