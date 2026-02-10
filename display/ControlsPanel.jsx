import React from "react";
import "./DisplayTab.css";

export default function ControlsPanel({
  selectedItem,
  items,
  selectedId,
  onSelectItem,
  onUpload,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showGrid,
  onToggleGrid,
}) {
  return (
    <div className="controls-panel">
      {/* Add Photo Button */}
      <div className="control-section">
        <button className="control-btn-primary" onClick={onUpload}>
          ➕ Add Photo
        </button>
      </div>

      {/* Undo/Redo */}
      <div className="control-section">
        <label className="section-label">History</label>
        <div className="control-row">
          <button
            className={`control-btn-small ${!canUndo ? 'disabled' : ''}`}
            onClick={onUndo}
            disabled={!canUndo}
          >
            ↶ Undo
          </button>
          <button
            className={`control-btn-small ${!canRedo ? 'disabled' : ''}`}
            onClick={onRedo}
            disabled={!canRedo}
          >
            ↷ Redo
          </button>
        </div>
      </div>

      {/* Grid Toggle */}
      <div className="control-section">
        <label className="section-label">Canvas</label>
        <button
          className={`control-btn-toggle ${showGrid ? 'active' : ''}`}
          onClick={onToggleGrid}
        >
          {showGrid ? '✓' : ' '} Show Grid
        </button>
      </div>

      {/* Layers */}
      <div className="control-section">
        <label className="section-label">Layers ({items.length})</label>
        <div className="layers-list">
          {items.length === 0 ? (
            <p className="empty-message">No items yet</p>
          ) : (
            [...items]
              .reverse()
              .map(item => (
                <div
                  key={item.id}
                  className={`layer-item ${selectedId === item.id ? 'selected' : ''}`}
                  onClick={() => onSelectItem(item.id)}
                >
                  <img src={item.src} alt="layer" className="layer-thumb" />
                  <div className="layer-info">
                    <div className="layer-index">Layer</div>
                    <div className="layer-size">{item.width}x{item.height}</div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Properties */}
      {selectedItem && (
        <div className="control-section">
          <label className="section-label">Properties</label>

          {/* Position */}
          <div className="property-group">
            <label className="prop-label">Position</label>
            <div className="prop-row">
              <label className="mini-label">X:</label>
              <input
                type="number"
                value={Math.round(selectedItem.x)}
                onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
                className="prop-input"
              />
            </div>
            <div className="prop-row">
              <label className="mini-label">Y:</label>
              <input
                type="number"
                value={Math.round(selectedItem.y)}
                onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
                className="prop-input"
              />
            </div>
          </div>

          {/* Size */}
          <div className="property-group">
            <label className="prop-label">Size</label>
            <div className="prop-row">
              <label className="mini-label">W:</label>
              <input
                type="number"
                value={Math.round(selectedItem.width)}
                onChange={(e) =>
                  onUpdate({ width: Math.max(50, parseInt(e.target.value) || 50) })
                }
                className="prop-input"
              />
            </div>
            <div className="prop-row">
              <label className="mini-label">H:</label>
              <input
                type="number"
                value={Math.round(selectedItem.height)}
                onChange={(e) =>
                  onUpdate({ height: Math.max(50, parseInt(e.target.value) || 50) })
                }
                className="prop-input"
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="property-group">
            <label className="prop-label">Rotation</label>
            <div className="prop-slider-row">
              <input
                type="range"
                min="0"
                max="360"
                value={selectedItem.rotation || 0}
                onChange={(e) => onUpdate({ rotation: parseInt(e.target.value) })}
                className="prop-slider"
              />
              <span className="prop-value">{selectedItem.rotation || 0}°</span>
            </div>
          </div>

          {/* Opacity */}
          <div className="property-group">
            <label className="prop-label">Opacity</label>
            <div className="prop-slider-row">
              <input
                type="range"
                min="0"
                max="100"
                value={(selectedItem.opacity || 1) * 100}
                onChange={(e) =>
                  onUpdate({ opacity: parseInt(e.target.value) / 100 })
                }
                className="prop-slider"
              />
              <span className="prop-value">{Math.round((selectedItem.opacity || 1) * 100)}%</span>
            </div>
          </div>

          {/* Layering */}
          <div className="property-group">
            <label className="prop-label">Layering</label>
            <div className="control-row">
              <button
                className="control-btn-small"
                onClick={() => onBringForward(selectedItem.id)}
              >
                ↑ Forward
              </button>
              <button
                className="control-btn-small"
                onClick={() => onSendBackward(selectedItem.id)}
              >
                ↓ Backward
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="property-group">
            <label className="prop-label">Actions</label>
            <div className="control-row">
              <button
                className="control-btn-small"
                onClick={() => onDuplicate(selectedItem.id)}
              >
                📋 Duplicate
              </button>
              <button
                className="control-btn-danger"
                onClick={() => onDelete(selectedItem.id)}
              >
                🗑 Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
