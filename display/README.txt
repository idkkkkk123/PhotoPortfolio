# Display Tab - Interactive Collage Editor

A modern, feature-rich collage and layout editor component built with React. Perfect for creating photo collages, visual layouts, and design boards.

## Features ✨

✅ **Image Management**
- Upload photos directly from your computer
- Pull images from built-in gallery
- Drag & drop repositioning
- Resize with corner handles
- Rotate images (0-360°)
- Layer management (bring forward/send backward)

✅ **Canvas & Layout**
- Multiple pages/canvases
- Add visual dividers and sections
- Grid-based snapping for alignment
- Smooth animations and transitions
- Clean, modern UI with glassmorphism effects

✅ **Editing**
- Full undo/redo history
- Keyboard shortcuts (arrow keys, delete key)
- Properties panel for precise control
- Real-time position & size editing

✅ **Persistence & Export**
- Save collages to localStorage
- Export functionality (prepare for html2canvas integration)
- Resume and edit previously saved work

## Component Architecture

```
DisplayTab (Main Container)
├── Toolbar (Upload, Undo/Redo, Save, Export)
├── Main Layout (3-column grid)
│   ├── GalleryPanel (Left)
│   ├── Canvas (Center)
│   └── PropertiesPanel (Right)
├── PageManager (Bottom)
└── File Input (Hidden)
```

## Components

**DisplayTab.jsx** - Main container, state management, undo/redo
**Canvas.jsx** - Drawing area with drag & snap functionality
**ImageItem.jsx** - Individual image with resize handles & controls
**SectionDivider.jsx** - Visual sections/frames
**Toolbar.jsx** - Top action buttons
**GalleryPanel.jsx** - Left sidebar with image gallery
**PropertiesPanel.jsx** - Right sidebar with item properties
**PageManager.jsx** - Bottom page/canvas manager

## Installation

```bash
npm install react react-dom uuid
```

## Usage

```jsx
import DisplayTab from './display/DisplayTab';

function App() {
  return <DisplayTab />;
}
```

## Features Detail

### Drag & Drop
- Click and drag images to reposition
- Snap to grid (16px) for alignment
- Smooth transitions

### Resize
- Drag corner handles (NW, NE, SW, SE)
- Maintains aspect ratio options
- Minimum size constraints (50x50px)

### Rotation
- Click rotation button (+15° increments)
- Or use properties slider (0-360°)

### Layering
- Bring Forward / Send Backward buttons
- Z-index management
- Visual stacking display

### Undo/Redo
- Full history management
- Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
- Disabled buttons when not available

### Save & Export
- localStorage integration
- Export to image (html2canvas ready)
- Session persistence

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Delete/Backspace | Delete selected image |
| Arrow Keys | Move selected image (10px) |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

## Customization

### Grid Size
Change `GRID_SIZE` in DisplayTab.jsx (default: 16px)

### Colors & Styling
Edit DisplayTab.css - uses gradient color scheme:
- Primary: #667eea → #764ba2
- Accent: #f093fb → #f5576c

### Gallery Images
Update galleryImages array in GalleryPanel.jsx

## Performance Tips

- Use optimized image sizes
- Limit items on canvas for smooth dragging
- Consider virtualizing for 100+ items

## Future Enhancements

- [ ] Export to high-resolution image (html2canvas)
- [ ] Duplicate items
- [ ] Guides and alignment helpers
- [ ] Image filters & effects
- [ ] Text overlays
- [ ] Batch operations
- [ ] Mobile responsive improvements
- [ ] Bing with backend database

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT
