import React, { useState, useEffect } from "react";
import "./DisplayTab.css";

export default function GalleryPanel({ onSelectImage }) {
  const [galleryImages, setGalleryImages] = useState([
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1469022563149-aa64dbd37dae?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1552168515-bc4f2fdb6e76?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1493514789560-586cfe1a86d5?w=150&h=150&fit=crop",
    "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=150&h=150&fit=crop",
  ]);

  return (
    <div className="gallery-panel">
      <h3 className="gallery-title">Gallery</h3>
      <div className="gallery-grid">
        {galleryImages.map((src, idx) => (
          <div
            key={idx}
            className="gallery-item"
            onClick={() => onSelectImage(src)}
            title="Click to add to canvas"
          >
            <img src={src} alt="Gallery item" />
          </div>
        ))}
      </div>
    </div>
  );
}
