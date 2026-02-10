import React from "react";
import "./DisplayTab.css";

// Legacy component - use GalleryPanel instead
export default function GalleryModal({ onClose, onSelectImage, alwaysOpen }) {
  const galleryImages = [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=150&h=150&fit=crop",
  ];

  if (alwaysOpen) {
    return (
      <div className="gallery-panel-content">
        <h3 style={{ margin: "16px 0 8px 16px" }}>Gallery</h3>
        <div className="gallery-grid" style={{ padding: "0 16px 16px 16px" }}>
          {galleryImages.map(src => (
            <img
              key={src}
              src={src}
              alt=""
              onClick={() => onSelectImage(src)}
              className="gallery-thumb"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-modal">
      <div className="gallery-modal-content">
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
        <div className="gallery-grid">
          {galleryImages.map(src => (
            <img
              key={src}
              src={src}
              alt=""
              onClick={() => onSelectImage(src)}
              className="gallery-thumb"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
