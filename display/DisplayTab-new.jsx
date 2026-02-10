import React, { useState, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import Toolbar from "./Toolbar";
import Canvas from "./Canvas";
import ControlsPanel from "./ControlsPanel";
import GalleryPanel from "./GalleryPanel";
import "./DisplayTab.css";

const GRID_SIZE = 16;
const SNAP_THRESHOLD = 10;

export default function DisplayTab() {
  // State management
  const [pages, setPages] = useState([{ id: uuidv4(), items: [], sections: [] }]);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([pages]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(GRID_SIZE);
  const fileInputRef = useRef(null);

  const currentPage = pages[currentPageIdx];

  // History management
  const updateHistory = useCallback((newPages) => {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(newPages);
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    setPages(newPages);
  }, [history, historyIdx]);

  const undo = useCallback(() => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setPages(history[historyIdx - 1]);
    }
  }, [historyIdx, history]);

  const redo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setPages(history[historyIdx + 1]);
    }
  }, [historyIdx, history]);

  // Item management
  const updateItem = useCallback((itemId, updates) => {
    const newPages = [...pages];
    newPages[currentPageIdx] = {
      ...currentPage,
      items: currentPage.items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    };
    updateHistory(newPages);
  }, [pages, currentPageIdx, currentPage, updateHistory]);

  const addItem = useCallback((src, x = 100, y = 100) => {
    const newItem = {
      id: uuidv4(),
      src,
      x,
      y,
      width: 200,
      height: 200,
      rotation: 0,
      opacity: 1,
      z: Math.max(...currentPage.items.map(i => i.z || 0), 0) + 1,
    };
    const newPages = [...pages];
    newPages[currentPageIdx] = {
      ...currentPage,
      items: [...currentPage.items, newItem],
    };
    updateHistory(newPages);
    setSelectedId(newItem.id);
  }, [pages, currentPageIdx, currentPage, updateHistory]);

  const deleteItem = useCallback((itemId) => {
    const newPages = [...pages];
    newPages[currentPageIdx] = {
      ...currentPage,
      items: currentPage.items.filter(item => item.id !== itemId),
    };
    updateHistory(newPages);
    setSelectedId(null);
  }, [pages, currentPageIdx, currentPage, updateHistory]);

  const duplicateItem = useCallback((itemId) => {
    const item = currentPage.items.find(i => i.id === itemId);
    if (!item) return;
    const newItem = {
      ...item,
      id: uuidv4(),
      x: item.x + 20,
      y: item.y + 20,
    };
    const newPages = [...pages];
    newPages[currentPageIdx] = {
      ...currentPage,
      items: [...currentPage.items, newItem],
    };
    updateHistory(newPages);
  }, [pages, currentPageIdx, currentPage, updateHistory]);

  const bringForward = useCallback((itemId) => {
    const item = currentPage.items.find(i => i.id === itemId);
    if (!item) return;
    const maxZ = Math.max(...currentPage.items.map(i => i.z || 0));
    updateItem(itemId, { z: maxZ + 1 });
  }, [currentPage, updateItem]);

  const sendBackward = useCallback((itemId) => {
    const item = currentPage.items.find(i => i.id === itemId);
    if (!item) return;
    updateItem(itemId, { z: Math.max(item.z - 1, 0) });
  }, [updateItem]);

  // File upload
  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        addItem(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save functions
  const handleSave = useCallback(() => {
    localStorage.setItem('displayCollages', JSON.stringify(pages));
    alert('Collage saved!');
  }, [pages]);

  const handleSaveToAlbum = useCallback(() => {
    // Generate thumbnail and save to albums
    const thumbnail = {
      id: uuidv4(),
      title: `Collage ${new Date().toLocaleDateString()}`,
      layout: currentPage,
      timestamp: new Date().toISOString(),
    };
    const albums = JSON.parse(localStorage.getItem('albums') || '[]');
    albums.push(thumbnail);
    localStorage.setItem('albums', JSON.stringify(albums));
    alert('Saved to albums!');
  }, [currentPage]);

  const handleExport = useCallback(() => {
    console.log('Export functionality ready (html2canvas integration)');
  }, []);

  const handleNew = useCallback(() => {
    if (window.confirm('Create a new blank canvas?')) {
      const blankPage = { id: uuidv4(), items: [], sections: [] };
      setPages([blankPage]);
      setCurrentPageIdx(0);
      setSelectedId(null);
      setHistory([blankPage]);
      setHistoryIdx(0);
    }
  }, []);

  const handleOpen = useCallback(() => {
    const saved = localStorage.getItem('displayCollages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPages(parsed);
        setCurrentPageIdx(0);
        alert('Opened last saved collage');
      } catch {
        alert('Error loading collage');
      }
    } else {
      alert('No saved collage found');
    }
  }, []);

  const selectedItem = currentPage.items.find(i => i.id === selectedId);
  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < history.length - 1;

  return (
    <div className="display-tab-root">
      <Toolbar
        onNew={handleNew}
        onSave={handleSave}
        onSaveToAlbum={handleSaveToAlbum}
        onOpen={handleOpen}
        onExport={handleExport}
      />

      <div className="display-main-layout">
        {/* LEFT: Control Panel */}
        <div className="display-left-panel">
          <ControlsPanel
            selectedItem={selectedItem}
            items={currentPage.items}
            selectedId={selectedId}
            onSelectItem={setSelectedId}
            onUpload={handleUpload}
            onUpdate={updateItem}
            onDelete={deleteItem}
            onDuplicate={duplicateItem}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid(!showGrid)}
          />
        </div>

        {/* CENTER: Canvas */}
        <div className="display-center-canvas">
          <Canvas
            items={currentPage.items}
            sections={currentPage.sections}
            selectedId={selectedId}
            onSelectItem={setSelectedId}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            showGrid={showGrid}
            gridSize={gridSize}
            snapThreshold={SNAP_THRESHOLD}
          />
        </div>

        {/* RIGHT: Gallery */}
        <div className="display-right-gallery">
          <GalleryPanel onSelectImage={addItem} />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
}
