import React from "react";
import "./DisplayTab.css";

export default function PageManager({
  pages,
  currentPage,
  onSelectPage,
  onAddPage,
  onDeletePage,
}) {
  return (
    <div className="page-manager">
      <div className="page-buttons">
        {pages.map((page, idx) => (
          <div key={page.id} className="page-button-group">
            <button
              className={`page-btn ${idx === currentPage ? "active" : ""}`}
              onClick={() => onSelectPage(idx)}
            >
              Page {idx + 1}
            </button>
            {pages.length > 1 && (
              <button
                className="page-delete-btn"
                onClick={() => onDeletePage(idx)}
                title="Delete this page"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button className="page-add-btn" onClick={onAddPage} title="Add a new page">
          + Add Page
        </button>
      </div>
    </div>
  );
}
