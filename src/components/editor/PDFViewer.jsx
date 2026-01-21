import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Hand, Grid, Maximize2, MoveVertical, MoveHorizontal, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Eye, EyeOff, Lock, Unlock, Type, Hash, Calendar, CheckSquare, Link2, FileText, User, Mail, Phone, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PDFCanvas from './PDFCanvas';
import ContextMenu from './ContextMenu';
import ZoomSlider from './ZoomSlider';


const getFieldIcon = (type) => {
  const iconMap = {
    'singleLineText': Type,
    'multilineText': FileText,
    'number': Hash,
    'date': Calendar,
    'checkbox': CheckSquare,
    'singleSelect': Type,
    'multipleSelects': Type,
    'url': Link2,
    'email': Mail,
    'phoneNumber': Phone,
    'attachment': Paperclip,
    'formula': Hash,
    'rollup': Hash,
    'count': Hash,
    'lookup': Type,
    'multipleRecordLinks': Link2,
    'singleCollaborator': User,
    'multipleCollaborators': User,
    'barcode': Hash,
    'rating': Hash,
    'duration': Hash,
    'lastModifiedTime': Calendar,
    'createdTime': Calendar,
    'autoNumber': Hash,
    'currency': Hash,
    'percent': Hash
  };
  const Icon = iconMap[type] || Type;
  return Icon;
};

const SNAP_THRESHOLD = 5;

export default function PDFViewer({
  pdfUrl,
  fields = [],
  onFieldUpdate,
  onFieldDelete,
  onFieldAdd,
  onFieldSelect,
  onSelectedFieldsChange,
  selectedFieldId,
  defaultFont = 'Arial',
  defaultFontSize = 12,
  defaultAlignment = 'left',
  defaultBold = false,
  defaultItalic = false,
  defaultUnderline = false,
  guides: initialGuides = { vertical: [], horizontal: [] },
  onGuidesChange,
  onBulkFieldAdd,
  template,
  queryClient,
  templateId,
  updateMutation,
  airtableFields = []
}) {
  const [localFields, setLocalFields] = useState(fields);
  const [localGuides, setLocalGuides] = useState(initialGuides);
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [draggingGuide, setDraggingGuide] = useState(null);
  const [boxSelect, setBoxSelect] = useState(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mode, setMode] = useState('field');
  const [guides, setGuides] = useState(initialGuides);
  const [selectedGuides, setSelectedGuides] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [snapLines, setSnapLines] = useState({ vertical: [], horizontal: [] });
  const [contextMenu, setContextMenu] = useState(null);
  const [cascadeDialog, setCascadeDialog] = useState(null);
  const [clipboard, setClipboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [guidesVisible, setGuidesVisible] = useState(true);
  const [guidesLocked, setGuidesLocked] = useState(false);
  const [splitMode, setSplitMode] = useState(null);
  const [splitPosition, setSplitPosition] = useState(null);
  const containerRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const rafRef = useRef(null);
  const initialFieldPositions = useRef({});
  const initialGuidePositions = useRef({});
  const draggedFieldsCache = useRef({});
  const justFinishedBoxSelect = useRef(false);
  const arrowKeyHoldRef = useRef({ key: null, count: 0, interval: null });
  // Guard against prop syncing interrupting drag
  const isInteractingRef = useRef(false);

  // Save to history
  const saveToHistory = useCallback(() => {
    const snapshot = {
      fields: JSON.parse(JSON.stringify(localFields)),
      guides: JSON.parse(JSON.stringify(localGuides))
    };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      // Keep last 50 states
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [localFields, localGuides, historyIndex]);

  useEffect(() => {
    if (dragging || resizing || isInteractingRef.current) {
      // During drag/resize, don't sync from props
      return;
    }

    // Merge dragged positions with props, clear cache for fields that match
    if (Object.keys(draggedFieldsCache.current).length > 0) {
      console.log('[EFFECT] Merging cached positions with props');
      const newLocalFields = fields.map(f => {
        if (draggedFieldsCache.current[f.id]) {
          const cached = draggedFieldsCache.current[f.id];
          // If props match cache, clear from cache, otherwise keep using cache
          if (Math.abs(f.x - cached.x) < 0.1 && Math.abs(f.y - cached.y) < 0.1) {
            delete draggedFieldsCache.current[f.id];
            return f; // Props are synced, use them
          }
          return { ...f, ...cached }; // Props not synced yet, use cache
        }
        return f;
      });
      setLocalFields(newLocalFields);
    } else {
      console.log('[EFFECT] Syncing fields from props to localFields');
      setLocalFields(fields);
    }
  }, [fields, dragging, resizing]);

  useEffect(() => {
    if (!draggingGuide) {
      setLocalGuides(guides);
    }
  }, [guides, draggingGuide]);

  useEffect(() => {
    if (onGuidesChange) {
      onGuidesChange(guides);
    }
  }, [guides]);

  // Notify parent when selected fields change
  useEffect(() => {
    if (onSelectedFieldsChange) {
      onSelectedFieldsChange(selectedFields);
    }
  }, [selectedFields, onSelectedFieldsChange]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        const pdfWidth = 612;
        setScale(Math.min((width - 40) / pdfWidth, 1.2));
      }
    };

    // Initial size update
    updateSize();

    // Use ResizeObserver for robust size detection
    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce slightly or just call updateSize
      // RequestAnimationFrame avoids loop limit errors
      requestAnimationFrame(() => updateSize());
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Zoom levels for snapping: 25% to 300%
  const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;

  // Ctrl+Mousewheel zoom handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        // Determine zoom direction
        const delta = e.deltaY < 0 ? 0.1 : -0.1;

        setScale(prev => {
          const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));

          // Snap to nearest level if close
          for (const level of ZOOM_LEVELS) {
            if (Math.abs(newScale - level) < 0.05) {
              return level;
            }
          }
          return newScale;
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);


  const snapToGuides = useCallback((value, isVertical) => {
    if (!guidesVisible) return { snapped: value, didSnap: false };
    const guideSet = isVertical ? localGuides.vertical : localGuides.horizontal;
    for (const guide of guideSet) {
      if (Math.abs(value - guide) < SNAP_THRESHOLD / scale) {
        return { snapped: guide, didSnap: true };
      }
    }
    return { snapped: value, didSnap: false };
  }, [localGuides, scale, guidesVisible]);

  const snapToFields = useCallback((field, newX, newY, newWidth, newHeight) => {
    let snappedX = newX;
    let snappedY = newY;
    const snapLinesV = [];
    const snapLinesH = [];

    for (const other of localFields) {
      if (other.id === field.id || (other.page || 1) !== currentPage) continue;

      // Left edge
      if (Math.abs(newX - other.x) < SNAP_THRESHOLD / scale) {
        snappedX = other.x;
        snapLinesV.push(other.x);
      }
      // Right edge
      if (Math.abs(newX + newWidth - (other.x + other.width)) < SNAP_THRESHOLD / scale) {
        snappedX = other.x + other.width - newWidth;
        snapLinesV.push(other.x + other.width);
      }
      // Top edge
      if (Math.abs(newY - other.y) < SNAP_THRESHOLD / scale) {
        snappedY = other.y;
        snapLinesH.push(other.y);
      }
      // Bottom edge
      if (Math.abs(newY + newHeight - (other.y + other.height)) < SNAP_THRESHOLD / scale) {
        snappedY = other.y + other.height - newHeight;
        snapLinesH.push(other.y + other.height);
      }
    }

    // Snap to guides (top and bottom for horizontal guides)
    for (const guide of localGuides.horizontal) {
      if (Math.abs(newY - guide) < SNAP_THRESHOLD / scale) {
        snappedY = guide;
        snapLinesH.push(guide);
      }
      if (Math.abs(newY + newHeight - guide) < SNAP_THRESHOLD / scale) {
        snappedY = guide - newHeight;
        snapLinesH.push(guide);
      }
    }

    setSnapLines({ vertical: snapLinesV, horizontal: snapLinesH });
    return { x: snappedX, y: snappedY };
  }, [localFields, localGuides, currentPage, scale]);

  const handleMouseDown = (e, field, action, corner = null) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent text selection/scroll which can kill drag events
    if (mode !== 'field') return;

    // Track mouse position to detect click vs drag
    const mouseDownPos = { x: e.clientX, y: e.clientY };

    // Handle multi-select first
    const isShiftPressed = e.shiftKey;
    let newSelectedFields = [...selectedFields];

    if (isShiftPressed) {
      // Shift-click: toggle field in selection
      if (selectedFields.includes(field.id)) {
        newSelectedFields = selectedFields.filter(id => id !== field.id);
      } else {
        newSelectedFields = [...selectedFields, field.id];
      }
      setSelectedFields(newSelectedFields);
      if (newSelectedFields.length === 1) {
        onFieldSelect(newSelectedFields[0]);
      }
    } else if (!selectedFields.includes(field.id)) {
      // Click on unselected field: select only this field
      newSelectedFields = [field.id];
      setSelectedFields(newSelectedFields);
      onFieldSelect(field.id);
    }
    // else: clicking on already-selected field, keep current selection (for multi-select drag)
    // Store initial position for click detection
    if (action === 'drag' && selectedFields.length > 1 && selectedFields.includes(field.id)) {
      setDragging(prev => ({ ...prev, mouseDownPos }));
    }

    if (action === 'drag') {
      // Use current selectedFields state for accurate multi-select detection
      const currentSelection = selectedFields.includes(field.id) ? selectedFields : newSelectedFields;
      const isMultiSelect = currentSelection.length > 1;

      // Store initial positions for ALL selected fields (from props.fields for accuracy)
      initialFieldPositions.current = {};
      currentSelection.forEach(id => {
        const f = fields.find(fld => fld.id === id);
        if (f) {
          initialFieldPositions.current[id] = { x: f.x, y: f.y };
        }
      });

      console.log(`[DRAG START] Primary: ${field.id}, Multi: ${isMultiSelect}, All: [${currentSelection.join(', ')}]`);

      setDragging({
        fieldId: field.id,
        startX: e.clientX,
        startY: e.clientY,
        initialX: field.x,
        initialY: field.y,
        constrainX: false,
        constrainY: false,
        constrainOnlyX: false,
        multiSelect: isMultiSelect,
        precisionMode: false,
        precisionStartX: null,
        precisionStartY: null,
        precisionBaseX: null,
        precisionBaseY: null,
        mouseDownPos
      });
      isInteractingRef.current = true;
    } else if (action === 'resize') {
      setResizing({
        fieldId: field.id,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        initialX: field.x,
        initialY: field.y,
        initialWidth: field.width,
        initialHeight: field.height
      });
      isInteractingRef.current = true;
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (rafRef.current) return; // Skip if already processing

    rafRef.current = requestAnimationFrame(() => {
      if (dragging) {
        // Check if Caps Lock is on for precision mode
        const isPrecisionKey = e.getModifierState && e.getModifierState('CapsLock');
        let deltaX, deltaY;

        if (isPrecisionKey && !dragging.precisionMode) {
          // Just started precision mode - switch from current position
          setDragging(prev => ({
            ...prev,
            precisionMode: true,
            precisionStartX: e.clientX,
            precisionStartY: e.clientY,
            precisionBaseX: prev.initialX + ((e.clientX - prev.startX) / scale),
            precisionBaseY: prev.initialY + ((e.clientY - prev.startY) / scale)
          }));
          rafRef.current = null;
          return; // Skip this frame to avoid jump
        } else if (isPrecisionKey && dragging.precisionMode) {
          // Continue precision mode
          deltaX = ((e.clientX - dragging.precisionStartX) / scale) * 0.1;
          deltaY = ((e.clientY - dragging.precisionStartY) / scale) * 0.1;
        } else if (!isPrecisionKey && dragging.precisionMode) {
          // Released precision key - exit precision mode
          setDragging(prev => ({
            ...prev,
            precisionMode: false,
            startX: e.clientX,
            startY: e.clientY,
            initialX: prev.precisionBaseX + ((e.clientX - prev.precisionStartX) / scale) * 0.1,
            initialY: prev.precisionBaseY + ((e.clientY - prev.precisionStartY) / scale) * 0.1
          }));
          rafRef.current = null;
          return;
        } else {
          // Normal dragging
          deltaX = (e.clientX - dragging.startX) / scale;
          deltaY = (e.clientY - dragging.startY) / scale;
        }

        const baseX = dragging.precisionMode ? dragging.precisionBaseX : dragging.initialX;
        const baseY = dragging.precisionMode ? dragging.precisionBaseY : dragging.initialY;

        setLocalFields(prev => {
          if (dragging.multiSelect && selectedFields.length > 1) {
            // Multi-select: apply the same delta to ALL selected fields
            return prev.map(f => {
              if (!selectedFields.includes(f.id)) return f;
              const initial = initialFieldPositions.current[f.id];
              if (!initial) return f;

              return {
                ...f,
                x: initial.x + deltaX,
                y: initial.y + deltaY
              };
            });
          } else {
            // Move single field with snapping
            return prev.map(f => {
              if (f.id !== dragging.fieldId) return f;

              let newX = baseX + (dragging.constrainY ? 0 : deltaX);
              let newY = baseY + (dragging.constrainX ? 0 : deltaY);

              // Only snap if not in precision mode and close enough
              if (!dragging.precisionMode) {
                const snapped = snapToFields(f, newX, newY, f.width, f.height);
                const xSnap = snapToGuides(snapped.x, true);
                const ySnap = snapToGuides(snapped.y, false);

                newX = xSnap.didSnap ? xSnap.snapped : snapped.x;
                newY = ySnap.didSnap ? ySnap.snapped : snapped.y;
              }

              return { ...f, x: newX, y: newY };
            });
          }
        });
      } else if (resizing) {
        const isPrecisionKey = e.getModifierState && e.getModifierState('CapsLock');
        const speedMultiplier = isPrecisionKey ? 0.1 : 1;
        const deltaX = ((e.clientX - resizing.startX) / scale) * speedMultiplier;
        const deltaY = ((e.clientY - resizing.startY) / scale) * speedMultiplier;

        setLocalFields(prev => prev.map(f => {
          if (f.id !== resizing.fieldId) return f;

          let updates = {};
          if (resizing.corner === 'se') {
            let newWidth = Math.max(10, resizing.initialWidth + deltaX);
            let newHeight = Math.max(5, resizing.initialHeight + deltaY);
            let newRight = resizing.initialX + newWidth;
            let newBottom = resizing.initialY + newHeight;

            // Snap right edge to vertical guides
            const xSnap = snapToGuides(newRight, true);
            if (xSnap.didSnap) newWidth = xSnap.snapped - resizing.initialX;

            // Snap bottom edge to horizontal guides
            const ySnap = snapToGuides(newBottom, false);
            if (ySnap.didSnap) newHeight = ySnap.snapped - resizing.initialY;

            // Snap to other fields
            for (const other of localFields) {
              if (other.id === f.id || (other.page || 1) !== currentPage) continue;
              if (Math.abs(newRight - (other.x + other.width)) < SNAP_THRESHOLD / scale) {
                newWidth = (other.x + other.width) - resizing.initialX;
              }
              if (Math.abs(newBottom - (other.y + other.height)) < SNAP_THRESHOLD / scale) {
                newHeight = (other.y + other.height) - resizing.initialY;
              }
            }

            updates = { width: newWidth, height: newHeight };
          } else if (resizing.corner === 'sw') {
            let newX = resizing.initialX + deltaX;
            let newWidth = Math.max(10, resizing.initialWidth - deltaX);
            let newHeight = Math.max(5, resizing.initialHeight + deltaY);
            let newBottom = resizing.initialY + newHeight;

            // Snap left edge to vertical guides
            const xSnap = snapToGuides(newX, true);
            if (xSnap.didSnap) {
              newX = xSnap.snapped;
              newWidth = resizing.initialX + resizing.initialWidth - newX;
            }

            // Snap bottom edge to horizontal guides
            const ySnap = snapToGuides(newBottom, false);
            if (ySnap.didSnap) newHeight = ySnap.snapped - resizing.initialY;

            // Snap to other fields
            for (const other of localFields) {
              if (other.id === f.id || (other.page || 1) !== currentPage) continue;
              if (Math.abs(newX - other.x) < SNAP_THRESHOLD / scale) {
                newX = other.x;
                newWidth = resizing.initialX + resizing.initialWidth - newX;
              }
              if (Math.abs(newBottom - (other.y + other.height)) < SNAP_THRESHOLD / scale) {
                newHeight = (other.y + other.height) - resizing.initialY;
              }
            }

            updates = { x: newX, width: newWidth, height: newHeight };
          } else if (resizing.corner === 'ne') {
            let newY = resizing.initialY + deltaY;
            let newWidth = Math.max(10, resizing.initialWidth + deltaX);
            let newHeight = Math.max(5, resizing.initialHeight - deltaY);
            let newRight = resizing.initialX + newWidth;

            // Snap top edge to horizontal guides
            const ySnap = snapToGuides(newY, false);
            if (ySnap.didSnap) {
              newY = ySnap.snapped;
              newHeight = resizing.initialY + resizing.initialHeight - newY;
            }

            // Snap right edge to vertical guides
            const xSnap = snapToGuides(newRight, true);
            if (xSnap.didSnap) newWidth = xSnap.snapped - resizing.initialX;

            // Snap to other fields
            for (const other of localFields) {
              if (other.id === f.id || (other.page || 1) !== currentPage) continue;
              if (Math.abs(newY - other.y) < SNAP_THRESHOLD / scale) {
                newY = other.y;
                newHeight = resizing.initialY + resizing.initialHeight - newY;
              }
              if (Math.abs(newRight - (other.x + other.width)) < SNAP_THRESHOLD / scale) {
                newWidth = (other.x + other.width) - resizing.initialX;
              }
            }

            updates = { y: newY, width: newWidth, height: newHeight };
          } else if (resizing.corner === 'nw') {
            let newX = resizing.initialX + deltaX;
            let newY = resizing.initialY + deltaY;
            let newWidth = Math.max(10, resizing.initialWidth - deltaX);
            let newHeight = Math.max(5, resizing.initialHeight - deltaY);

            // Snap left edge to vertical guides
            const xSnap = snapToGuides(newX, true);
            if (xSnap.didSnap) {
              newX = xSnap.snapped;
              newWidth = resizing.initialX + resizing.initialWidth - newX;
            }

            // Snap top edge to horizontal guides
            const ySnap = snapToGuides(newY, false);
            if (ySnap.didSnap) {
              newY = ySnap.snapped;
              newHeight = resizing.initialY + resizing.initialHeight - newY;
            }

            // Snap to other fields
            for (const other of localFields) {
              if (other.id === f.id || (other.page || 1) !== currentPage) continue;
              if (Math.abs(newX - other.x) < SNAP_THRESHOLD / scale) {
                newX = other.x;
                newWidth = resizing.initialX + resizing.initialWidth - newX;
              }
              if (Math.abs(newY - other.y) < SNAP_THRESHOLD / scale) {
                newY = other.y;
                newHeight = resizing.initialY + resizing.initialHeight - newY;
              }
            }

            updates = { x: newX, y: newY, width: newWidth, height: newHeight };
          }

          return { ...f, ...updates };
        }));
      } else if (draggingGuide) {
        if (draggingGuide.multiSelect && selectedGuides.length > 1) {
          // Multi-guide drag: apply same delta to all selected guides
          const isPrecisionKey = e.getModifierState && e.getModifierState('CapsLock');
          const speedMultiplier = isPrecisionKey ? 0.1 : 1;
          const deltaX = ((e.clientX - draggingGuide.startX) / scale) * speedMultiplier;
          const deltaY = ((e.clientY - draggingGuide.startY) / scale) * speedMultiplier;

          setLocalGuides(prev => {
            const newGuides = { ...prev };
            selectedGuides.forEach(g => {
              const initial = initialGuidePositions.current[`${g.type}-${g.index}`];
              if (initial !== undefined) {
                if (g.type === 'vertical') {
                  newGuides.vertical[g.index] = Math.max(0, Math.min(612, initial + deltaX));
                } else {
                  newGuides.horizontal[g.index] = Math.max(0, Math.min(792, initial + deltaY));
                }
              }
            });
            return newGuides;
          });
        } else {
          // Single guide drag
          const isPrecisionKey = e.getModifierState && e.getModifierState('CapsLock');

          if (isPrecisionKey) {
            const speedMultiplier = 0.1;
            const deltaX = ((e.clientX - draggingGuide.startX) / scale) * speedMultiplier;
            const deltaY = ((e.clientY - draggingGuide.startY) / scale) * speedMultiplier;

            setLocalGuides(prev => {
              const newGuides = { ...prev };
              // Fetch initial position from cache
              const initialKey = `${draggingGuide.type}-${draggingGuide.index}`;
              // Fallback to current guide position if cache missed (shouldn't happen given onMouseDown logic)
              const initial = initialGuidePositions.current[initialKey] ??
                (draggingGuide.type === 'vertical' ? prev.vertical[draggingGuide.index] : prev.horizontal[draggingGuide.index]);

              if (draggingGuide.type === 'vertical') {
                newGuides.vertical[draggingGuide.index] = Math.max(0, Math.min(612, initial + deltaX));
              } else {
                newGuides.horizontal[draggingGuide.index] = Math.max(0, Math.min(792, initial + deltaY));
              }
              return newGuides;
            });
          } else {
            // Standard absolute tracking
            const rect = pdfContainerRef.current.getBoundingClientRect();
            const pos = draggingGuide.type === 'vertical'
              ? (e.clientX - rect.left) / scale
              : (e.clientY - rect.top) / scale;

            setLocalGuides(prev => {
              const newGuides = { ...prev };
              if (draggingGuide.type === 'vertical') {
                newGuides.vertical[draggingGuide.index] = Math.max(0, Math.min(612, pos));
              } else {
                newGuides.horizontal[draggingGuide.index] = Math.max(0, Math.min(792, pos));
              }
              return newGuides;
            });
          }
        }
      } else if (boxSelect) {
        const rect = pdfContainerRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / scale;
        const currentY = (e.clientY - rect.top) / scale;

        setBoxSelect(prev => ({ ...prev, currentX, currentY }));

        // Select items within box based on mode
        const minX = Math.min(boxSelect.startX, currentX);
        const maxX = Math.max(boxSelect.startX, currentX);
        const minY = Math.min(boxSelect.startY, currentY);
        const maxY = Math.max(boxSelect.startY, currentY);

        if (mode === 'field') {
          const fieldsInBox = localFields
            .filter(f => (f.page || 1) === currentPage)
            .filter(f => {
              const centerX = f.x + f.width / 2;
              const centerY = f.y + f.height / 2;
              return centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY;
            })
            .map(f => f.id);

          setSelectedFields(fieldsInBox);
        } else if (mode === 'guide') {
          const guidesInBox = [];
          localGuides.vertical.forEach((pos, idx) => {
            // Select if guide line crosses the box horizontally
            if (pos >= minX && pos <= maxX && minY <= 792 && maxY >= 0) {
              guidesInBox.push({ type: 'vertical', index: idx, position: pos });
            }
          });
          localGuides.horizontal.forEach((pos, idx) => {
            // Select if guide line crosses the box vertically
            if (pos >= minY && pos <= maxY && minX <= 612 && maxX >= 0) {
              guidesInBox.push({ type: 'horizontal', index: idx, position: pos });
            }
          });
          setSelectedGuides(guidesInBox);
        }
      }

      rafRef.current = null;
    });
  }, [dragging, resizing, draggingGuide, boxSelect, localFields, localGuides, selectedFields, selectedGuides, scale, snapToFields, snapToGuides, currentPage, mode]);

  const handleMouseUp = (e) => {
    let madeChanges = false;

    if (dragging || resizing) {
      setSnapLines({ vertical: [], horizontal: [] });

      // Check if this was a click (no movement) on multi-selected field
      if (dragging?.multiSelect && selectedFields.length > 1 && dragging.mouseDownPos) {
        const deltaX = Math.abs(e.clientX - dragging.mouseDownPos.x);
        const deltaY = Math.abs(e.clientY - dragging.mouseDownPos.y);

        // If movement is less than 3 pixels, treat as click
        if (deltaX < 3 && deltaY < 3) {
          // Select only the clicked field
          const field = localFields.find(f => f.id === dragging.fieldId);
          if (field) {
            setSelectedFields([field.id]);
            onFieldSelect(field.id);
          }
          setDragging(null);
          setResizing(null);
          initialFieldPositions.current = {};
          return; // Don't save changes
        }
      }

      if (dragging?.multiSelect && selectedFields.length > 1) {
        // Cache positions and batch update
        console.log('[DRAG END] Caching multi-select positions');

        selectedFields.forEach(fieldId => {
          const field = localFields.find(f => f.id === fieldId);
          if (field) {
            console.log(`[DRAG END] ${fieldId}: (${field.x.toFixed(1)}, ${field.y.toFixed(1)})`);
            draggedFieldsCache.current[fieldId] = { x: field.x, y: field.y };
          }
        });

        // Single batch update after clearing drag
        setDragging(null);
        setResizing(null);
        initialFieldPositions.current = {};

        // Now update parent in one go
        setTimeout(() => {
          selectedFields.forEach(fieldId => {
            if (draggedFieldsCache.current[fieldId]) {
              onFieldUpdate(fieldId, draggedFieldsCache.current[fieldId]);
            }
          });
        }, 0);
        madeChanges = true;
      } else if (dragging) {
        const field = localFields.find(f => f.id === dragging.fieldId);
        if (field) onFieldUpdate(field.id, field);
        setDragging(null);
        setResizing(null);
        initialFieldPositions.current = {};
        madeChanges = true;
      } else if (resizing) {
        const field = localFields.find(f => f.id === resizing.fieldId);
        if (field) onFieldUpdate(field.id, field);
        setDragging(null);
        setResizing(null);
        initialFieldPositions.current = {};
        madeChanges = true;
      }
      isInteractingRef.current = false;
    }

    if (draggingGuide) {
      setGuides(localGuides);
      setDraggingGuide(null);
      initialGuidePositions.current = {};
      madeChanges = true;
    }

    if (madeChanges) {
      saveToHistory();
    }

    if (boxSelect) {
      // Check if it was a click (very small box) - if so, clear selection
      const width = Math.abs(boxSelect.currentX - boxSelect.startX);
      const height = Math.abs(boxSelect.currentY - boxSelect.startY);
      if (width < 3 && height < 3) {
        if (mode === 'field') setSelectedFields([]);
        if (mode === 'guide') setSelectedGuides([]);
        justFinishedBoxSelect.current = false;
      } else {
        // Completed a real box select, flag it to prevent onClick from clearing
        justFinishedBoxSelect.current = true;
        setTimeout(() => {
          justFinishedBoxSelect.current = false;
        }, 100);
      }
      setBoxSelect(null);
    }
  };

  const handleGuideMouseDown = (e, type, index) => {
    if (guidesLocked) return;
    e.stopPropagation();
    e.preventDefault();
    const guide = { type, index, position: type === 'vertical' ? localGuides.vertical[index] : localGuides.horizontal[index] };

    console.log(`[GUIDE] MouseDown on ${type} guide ${index}, shift=${e.shiftKey}`);

    if (e.shiftKey) {
      // Shift-click: toggle in selection
      setSelectedGuides(prev => {
        const exists = prev.find(g => g.type === type && g.index === index);
        const newSelection = exists ? prev.filter(g => !(g.type === type && g.index === index)) : [...prev, guide];
        console.log(`[GUIDE] New selection after shift-click:`, newSelection);
        return newSelection;
      });
    } else {
      // Regular click: if already selected with others, start multi-drag, otherwise make single selection
      const alreadySelected = selectedGuides.find(g => g.type === type && g.index === index);

      let currentSelection = selectedGuides;
      if (!alreadySelected) {
        currentSelection = [guide];
        setSelectedGuides(currentSelection);
      }

      // Store initial positions for all selected guides
      initialGuidePositions.current = {};
      currentSelection.forEach(g => {
        const pos = g.type === 'vertical' ? localGuides.vertical[g.index] : localGuides.horizontal[g.index];
        initialGuidePositions.current[`${g.type}-${g.index}`] = pos;
      });

      const isMultiSelect = currentSelection.length > 1;
      console.log(`[GUIDE] ${isMultiSelect ? 'Multi' : 'Single'} select and drag with ${currentSelection.length} guides`);
      setDraggingGuide({ type, index, multiSelect: isMultiSelect, startX: e.clientX, startY: e.clientY });
    }
  };

  const handleAddGuide = (type) => {
    const pos = type === 'vertical' ? 100 : 100;
    const newGuides = {
      ...guides,
      [type]: [...guides[type], pos]
    };
    setGuides(newGuides);
  };

  const deleteSelectedGuides = () => {
    const newGuides = { ...guides };
    const sortedGuides = [...selectedGuides].sort((a, b) => b.index - a.index);
    sortedGuides.forEach(({ type, index }) => {
      newGuides[type] = newGuides[type].filter((_, i) => i !== index);
    });
    setGuides(newGuides);
    setSelectedGuides([]);
  };

  const handleAddField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      x: 100,
      y: 100,
      page: currentPage,
      width: 200,
      height: 30,
      airtable_field: null,
      font: defaultFont,
      font_size: defaultFontSize,
      alignment: defaultAlignment,
      bold: defaultBold,
      italic: defaultItalic,
      underline: defaultUnderline
    };
    onFieldAdd(newField);
    setSelectedFields([newField.id]);
    onFieldSelect(newField.id);
  };

  const distributeFieldsHorizontally = () => {
    if (selectedFields.length < 3) return;
    const fields = selectedFields.map(id => localFields.find(f => f.id === id)).sort((a, b) => a.x - b.x);
    const first = fields[0];
    const last = fields[fields.length - 1];
    const totalSpace = (last.x + last.width) - first.x;
    const spacing = (totalSpace - fields.reduce((sum, f) => sum + f.width, 0)) / (fields.length - 1);

    let currentX = first.x + first.width + spacing;
    for (let i = 1; i < fields.length - 1; i++) {
      onFieldUpdate(fields[i].id, { x: currentX });
      currentX += fields[i].width + spacing;
    }
  };

  const distributeFieldsVertically = () => {
    if (selectedFields.length < 3) return;
    const fields = selectedFields.map(id => localFields.find(f => f.id === id)).sort((a, b) => a.y - b.y);
    const first = fields[0];
    const last = fields[fields.length - 1];
    const totalSpace = (last.y + last.height) - first.y;
    const spacing = (totalSpace - fields.reduce((sum, f) => sum + f.height, 0)) / (fields.length - 1);

    let currentY = first.y + first.height + spacing;
    for (let i = 1; i < fields.length - 1; i++) {
      onFieldUpdate(fields[i].id, { y: currentY });
      currentY += fields[i].height + spacing;
    }
  };

  const distributeGuidesHorizontally = () => {
    if (selectedGuides.filter(g => g.type === 'vertical').length < 3) return;
    const vGuides = selectedGuides.filter(g => g.type === 'vertical').sort((a, b) => a.position - b.position);
    const first = vGuides[0].position;
    const last = vGuides[vGuides.length - 1].position;
    const spacing = (last - first) / (vGuides.length - 1);

    const newGuides = { ...guides };
    for (let i = 1; i < vGuides.length - 1; i++) {
      newGuides.vertical[vGuides[i].index] = first + spacing * i;
    }
    setGuides(newGuides);
  };

  const distributeGuidesVertically = () => {
    if (selectedGuides.filter(g => g.type === 'horizontal').length < 3) return;
    const hGuides = selectedGuides.filter(g => g.type === 'horizontal').sort((a, b) => a.position - b.position);
    const first = hGuides[0].position;
    const last = hGuides[hGuides.length - 1].position;
    const spacing = (last - first) / (hGuides.length - 1);

    const newGuides = { ...guides };
    for (let i = 1; i < hGuides.length - 1; i++) {
      newGuides.horizontal[hGuides[i].index] = first + spacing * i;
    }
    setGuides(newGuides);
  };

  const createGuidesFromField = (field, orientation) => {
    const newGuides = { ...guides };
    if (orientation === 'horizontal') {
      newGuides.horizontal.push(field.y, field.y + field.height);
    } else {
      newGuides.vertical.push(field.x, field.x + field.width);
    }
    setGuides(newGuides);
  };

  const cascadeFields = () => {
    if (selectedFields.length < 1) {
      console.log('[CASCADE] No fields selected');
      return;
    }

    // Get the first selected field as template
    const templateField = localFields.find(f => f.id === selectedFields[0]);
    if (!templateField) {
      console.log('[CASCADE] Template field not found');
      return;
    }

    // Find all horizontal guides below this field
    const fieldBottom = templateField.y + templateField.height;
    const guidesBelow = localGuides.horizontal
      .filter(g => g >= fieldBottom)
      .sort((a, b) => a - b);

    console.log('[CASCADE] Template field Y:', templateField.y, 'bottom:', fieldBottom);
    console.log('[CASCADE] Guides below field:', guidesBelow);

    if (guidesBelow.length === 0) {
      alert('No horizontal guides found below the selected field. Create guides first by right-clicking the field and selecting "Create Horizontal Guides", then cascade those guides.');
      return;
    }

    const baseTimestamp = Date.now();
    const newFields = [];

    // Create one field at each guide position, snapping height to next guide if available
    guidesBelow.forEach((guideY, i) => {
      const nextGuide = guidesBelow[i + 1];
      const height = nextGuide ? nextGuide - guideY : templateField.height;

      const newField = {
        ...templateField,
        id: `field_${baseTimestamp}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        y: guideY,
        height: height,
        label: `${templateField.label} ${i + 2}`,
        airtable_field: null
      };
      newFields.push(newField);
    });

    console.log('[CASCADE] Creating', newFields.length, 'new fields');

    // Use bulk add if available, otherwise fall back to individual adds
    if (onBulkFieldAdd) {
      onBulkFieldAdd(newFields);
    } else {
      newFields.forEach(field => onFieldAdd(field));
    }
  };

  const cascadeGuides = (count, type) => {
    const filtered = selectedGuides.filter(g => g.type === type).sort((a, b) => a.position - b.position);
    if (filtered.length < 2) return;

    // Use distance between first 2 guides as the spacing
    const spacing = filtered[1].position - filtered[0].position;
    const lastPos = filtered[filtered.length - 1].position;

    const newGuides = { ...guides };
    // Create 'count' extra guides after the last selected one
    for (let i = 1; i <= count; i++) {
      const pos = lastPos + (spacing * i);
      if (type === 'vertical') {
        if (!newGuides.vertical.includes(pos)) newGuides.vertical.push(pos);
      } else {
        if (!newGuides.horizontal.includes(pos)) newGuides.horizontal.push(pos);
      }
    }
    setGuides(newGuides);
  };

  const fillFieldsFromGuides = () => {
    if (selectedGuides.length < 2) {
      alert('Please select at least 2 guides to fill fields between them');
      return;
    }

    // Separate vertical and horizontal guides
    const verticalGuides = selectedGuides.filter(g => g.type === 'vertical').map(g => g.position).sort((a, b) => a - b);
    const horizontalGuides = selectedGuides.filter(g => g.type === 'horizontal').map(g => g.position).sort((a, b) => a - b);

    if (horizontalGuides.length < 2) {
      alert('Please select at least 2 horizontal guides to define field rows');
      return;
    }

    const baseTimestamp = Date.now();
    const newFields = [];

    // Create fields between consecutive horizontal guides
    for (let i = 0; i < horizontalGuides.length - 1; i++) {
      const y = horizontalGuides[i];
      const height = horizontalGuides[i + 1] - y;

      if (verticalGuides.length >= 2) {
        // Create fields between consecutive vertical guides for this row
        for (let j = 0; j < verticalGuides.length - 1; j++) {
          const x = verticalGuides[j];
          const width = verticalGuides[j + 1] - x;

          newFields.push({
            id: `field_${baseTimestamp}_${i}_${j}_${Math.random().toString(36).substr(2, 9)}`,
            label: `Field ${i + 1}-${j + 1}`,
            x,
            y,
            width,
            height,
            page: currentPage,
            airtable_field: null,
            font: defaultFont,
            font_size: defaultFontSize,
            alignment: defaultAlignment,
            bold: defaultBold,
            italic: defaultItalic,
            underline: defaultUnderline
          });
        }
      } else {
        // Just create one field per row, full width or default width
        const x = verticalGuides.length === 1 ? verticalGuides[0] : 50;
        const width = verticalGuides.length === 1 ? 512 : 200;

        newFields.push({
          id: `field_${baseTimestamp}_${i}_${Math.random().toString(36).substr(2, 9)}`,
          label: `Field ${i + 1}`,
          x,
          y,
          width,
          height,
          page: currentPage,
          airtable_field: null,
          font: defaultFont,
          font_size: defaultFontSize,
          alignment: defaultAlignment,
          bold: defaultBold,
          italic: defaultItalic,
          underline: defaultUnderline
        });
      }
    }

    console.log('[FILL FIELDS] Creating', newFields.length, 'fields from guides');

    if (onBulkFieldAdd) {
      onBulkFieldAdd(newFields);
    } else {
      newFields.forEach(field => onFieldAdd(field));
    }
    saveToHistory();
  };

  const mergeFields = () => {
    if (selectedFields.length < 2) return;

    const fieldsToMerge = selectedFields.map(id => localFields.find(f => f.id === id)).filter(Boolean);

    // Calculate bounding box
    const minX = Math.min(...fieldsToMerge.map(f => f.x));
    const minY = Math.min(...fieldsToMerge.map(f => f.y));
    const maxX = Math.max(...fieldsToMerge.map(f => f.x + f.width));
    const maxY = Math.max(...fieldsToMerge.map(f => f.y + f.height));

    const mergedField = {
      ...fieldsToMerge[0],
      id: `field_${Date.now()}`,
      label: fieldsToMerge.map(f => f.label).join(' '),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      airtable_field: null
    };

    // Remove old fields and add merged one
    const remainingFields = localFields.filter(f => !selectedFields.includes(f.id));
    const updatedFields = [...remainingFields, mergedField];

    queryClient.setQueryData(['template', templateId], (prev) => {
      const newData = {
        ...prev, // Use prev, not template prop
        fields: updatedFields
      };
      if (!newData.pdf_url && (prev?.pdf_url || template?.pdf_url)) {
        newData.pdf_url = prev?.pdf_url || template?.pdf_url;
      }
      return newData;
    });
    updateMutation.mutate({ fields: updatedFields });
    setSelectedFields([mergedField.id]);
    saveToHistory();
  };

  const startSplitMode = () => {
    if (selectedFields.length !== 1) return;
    const field = localFields.find(f => f.id === selectedFields[0]);
    if (!field) return;
    setSplitMode({ fieldId: field.id, orientation: 'vertical' });
  };

  const executeSplit = (field, splitPos) => {
    const isVertical = splitMode.orientation === 'vertical';

    const field1 = {
      ...field,
      id: `field_${Date.now()}_1`,
      label: `${field.label} 1`,
      width: isVertical ? splitPos - field.x : field.width,
      height: isVertical ? field.height : splitPos - field.y,
      airtable_field: null
    };

    const field2 = {
      ...field,
      id: `field_${Date.now()}_2`,
      label: `${field.label} 2`,
      x: isVertical ? splitPos : field.x,
      y: isVertical ? field.y : splitPos,
      width: isVertical ? (field.x + field.width) - splitPos : field.width,
      height: isVertical ? field.height : (field.y + field.height) - splitPos,
      airtable_field: null
    };

    const remainingFields = localFields.filter(f => f.id !== field.id);
    const updatedFields = [...remainingFields, field1, field2];

    queryClient.setQueryData(['template', templateId], (prev) => {
      const newData = {
        ...prev,
        fields: updatedFields
      };
      if (!newData.pdf_url && (prev?.pdf_url || template?.pdf_url)) {
        newData.pdf_url = prev?.pdf_url || template?.pdf_url;
      }
      return newData;
    });
    updateMutation.mutate({ fields: updatedFields });
    setSelectedFields([field1.id, field2.id]);
    setSplitMode(null);
    setSplitPosition(null);
    saveToHistory();
  };

  const copyFields = () => {
    setClipboard(selectedFields.map(id => {
      const f = localFields.find(field => field.id === id);
      return { ...f };
    }));
  };

  const cutFields = () => {
    copyFields();
    selectedFields.forEach(id => onFieldDelete(id));
    setSelectedFields([]);
  };

  const pasteFields = () => {
    if (clipboard.length === 0) return;

    clipboard.forEach(field => {
      const newField = {
        ...field,
        id: `field_${Date.now()}_${Math.random()}`,
        x: field.x + 20,
        y: field.y + 20
      };
      onFieldAdd(newField);
    });
  };

  const duplicateFields = () => {
    selectedFields.forEach(id => {
      const field = localFields.find(f => f.id === id);
      if (field) {
        const newField = {
          ...field,
          id: `field_${Date.now()}_${Math.random()}`,
          x: field.x + 20,
          y: field.y + 20
        };
        onFieldAdd(newField);
      }
    });
    saveToHistory();
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const snapshot = history[newIndex];

      setLocalFields(snapshot.fields);
      setLocalGuides(snapshot.guides);
      setGuides(snapshot.guides);
      setHistoryIndex(newIndex);

      // Sync to parent
      queryClient.setQueryData(['template', templateId], (prev) => {
        const newData = {
          ...prev,
          fields: snapshot.fields,
          guides: snapshot.guides
        };
        if (!newData.pdf_url && (prev?.pdf_url || template?.pdf_url)) {
          newData.pdf_url = prev?.pdf_url || template?.pdf_url;
        }
        return newData;
      });
      updateMutation.mutate({ fields: snapshot.fields, guides: snapshot.guides });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const snapshot = history[newIndex];

      setLocalFields(snapshot.fields);
      setLocalGuides(snapshot.guides);
      setGuides(snapshot.guides);
      setHistoryIndex(newIndex);

      // Sync to parent
      queryClient.setQueryData(['template', templateId], (prev) => {
        const newData = {
          ...prev,
          fields: snapshot.fields,
          guides: snapshot.guides
        };
        if (!newData.pdf_url && (prev?.pdf_url || template?.pdf_url)) {
          newData.pdf_url = prev?.pdf_url || template?.pdf_url;
        }
        return newData;
      });
      updateMutation.mutate({ fields: snapshot.fields, guides: snapshot.guides });
    }
  };

  useEffect(() => {
    if (dragging || resizing || draggingGuide || boxSelect) {
      const wrappedMouseUp = (e) => handleMouseUp(e);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', wrappedMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', wrappedMouseUp);
      };
    }
  }, [dragging, resizing, draggingGuide, boxSelect, handleMouseMove]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle keyboard shortcuts if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Get shortcuts from localStorage
      const shortcuts = JSON.parse(localStorage.getItem('pdfEditorShortcuts') || '{}');
      const getShortcutKey = (action) => shortcuts[action] || null;

      // Check if pressed key matches a shortcut
      const pressedKey = (e.ctrlKey || e.metaKey ? 'Ctrl+' : '') +
        (e.shiftKey ? 'Shift+' : '') +
        (e.altKey ? 'Alt+' : '') +
        e.key.toUpperCase();

      // Grid Fill (Ctrl+F default)
      if ((getShortcutKey('gridFill') === pressedKey || (!getShortcutKey('gridFill') && e.ctrlKey && e.key === 'f'))
        && selectedGuides.length >= 2 && mode === 'guide') {
        e.preventDefault();
        fillFieldsFromGuides();
        return;
      }

      // Merge (M default)
      if ((getShortcutKey('merge') === pressedKey || (!getShortcutKey('merge') && e.key === 'm' && !e.ctrlKey && !e.altKey))
        && selectedFields.length >= 2 && mode === 'field') {
        e.preventDefault();
        mergeFields();
        return;
      }

      // Split (S default)
      if ((getShortcutKey('split') === pressedKey || (!getShortcutKey('split') && e.key === 's' && !e.ctrlKey && !e.altKey))
        && selectedFields.length === 1 && mode === 'field' && !splitMode) {
        e.preventDefault();
        startSplitMode();
        return;
      }

      // Toggle Guides Visible
      if (getShortcutKey('toggleGuidesVisible') === pressedKey) {
        e.preventDefault();
        setGuidesVisible(prev => !prev);
        return;
      }

      // Toggle Guides Lock
      if (getShortcutKey('toggleGuidesLock') === pressedKey) {
        e.preventDefault();
        setGuidesLocked(prev => {
          const newLocked = !prev;
          if (newLocked && mode === 'guide') setMode('field');
          return newLocked;
        });
        return;
      }

      // Switch to Field Mode
      if (getShortcutKey('fieldMode') === pressedKey) {
        e.preventDefault();
        setMode('field');
        return;
      }

      // Switch to Guide Mode
      if (getShortcutKey('guideMode') === pressedKey && !guidesLocked) {
        e.preventDefault();
        setMode('guide');
        return;
      }

      // Handle Alt+X/Y for axis locking during drag
      if (dragging && e.altKey) {
        if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          setDragging(prev => ({ ...prev, constrainY: true, constrainX: false }));
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          setDragging(prev => ({ ...prev, constrainX: true, constrainY: false }));
        }
      }

      // Handle arrow keys for precise movement
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedFields.length > 0 && mode === 'field') {
          e.preventDefault();

          // Start acceleration on first press or different key
          if (!arrowKeyHoldRef.current.interval || arrowKeyHoldRef.current.key !== e.key) {
            arrowKeyHoldRef.current.key = e.key;
            arrowKeyHoldRef.current.count = 0;

            // Clear existing interval
            if (arrowKeyHoldRef.current.interval) {
              clearInterval(arrowKeyHoldRef.current.interval);
            }

            // Start movement with acceleration
            const moveFields = () => {
              arrowKeyHoldRef.current.count++;
              const step = Math.min(1 + Math.floor(arrowKeyHoldRef.current.count / 10), 10);
              const deltaX = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
              const deltaY = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

              setLocalFields(prev => prev.map(f =>
                selectedFields.includes(f.id) ? { ...f, x: f.x + deltaX, y: f.y + deltaY } : f
              ));

              selectedFields.forEach(fieldId => {
                const field = localFields.find(f => f.id === fieldId);
                if (field) onFieldUpdate(field.id, { x: field.x + deltaX, y: field.y + deltaY });
              });
            };

            // Initial move
            moveFields();

            // Set up interval for continuous movement
            arrowKeyHoldRef.current.interval = setInterval(moveFields, 50);
          }
        } else if (selectedGuides.length > 0 && mode === 'guide') {
          e.preventDefault();

          if (!arrowKeyHoldRef.current.interval || arrowKeyHoldRef.current.key !== e.key) {
            arrowKeyHoldRef.current.key = e.key;
            arrowKeyHoldRef.current.count = 0;

            if (arrowKeyHoldRef.current.interval) {
              clearInterval(arrowKeyHoldRef.current.interval);
            }

            const moveGuides = () => {
              arrowKeyHoldRef.current.count++;
              // Capslock = precision mode (1px always), otherwise accelerate
              const isCapsLock = e.getModifierState && e.getModifierState('CapsLock');
              const step = isCapsLock ? 1 : Math.min(1 + Math.floor(arrowKeyHoldRef.current.count / 10), 10);
              const deltaX = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
              const deltaY = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

              setLocalGuides(prev => {
                const newGuides = { ...prev };
                selectedGuides.forEach(g => {
                  if (g.type === 'vertical') {
                    newGuides.vertical[g.index] = Math.max(0, Math.min(612, newGuides.vertical[g.index] + deltaX));
                  } else {
                    newGuides.horizontal[g.index] = Math.max(0, Math.min(792, newGuides.horizontal[g.index] + deltaY));
                  }
                });
                return newGuides;
              });
            };

            moveGuides();
            arrowKeyHoldRef.current.interval = setInterval(moveGuides, 50);

          }
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGuides.length > 0 && mode === 'guide') {
          e.preventDefault();
          deleteSelectedGuides();
        } else if (selectedFields.length > 0 && mode === 'field') {
          e.preventDefault();
          // Batch delete all fields at once
          const remainingFields = localFields.filter(f => !selectedFields.includes(f.id));
          queryClient.setQueryData(['template', templateId], (prev) => {
            const newData = {
              ...prev,
              fields: remainingFields
            };
            if (!newData.pdf_url && (prev?.pdf_url || template?.pdf_url)) {
              newData.pdf_url = prev?.pdf_url || template?.pdf_url;
            }
            return newData;
          });
          updateMutation.mutate({ fields: remainingFields });
          setSelectedFields([]);
        }
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'c' && selectedFields.length > 0 && mode === 'field') {
          e.preventDefault();
          copyFields();
        } else if (e.key === 'x' && selectedFields.length > 0 && mode === 'field') {
          e.preventDefault();
          cutFields();
        } else if (e.key === 'v' && clipboard.length > 0 && mode === 'field') {
          e.preventDefault();
          pasteFields();
        } else if (e.key === 'd' && selectedFields.length > 0 && mode === 'field') {
          e.preventDefault();
          duplicateFields();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (arrowKeyHoldRef.current.interval) {
          clearInterval(arrowKeyHoldRef.current.interval);
          arrowKeyHoldRef.current.interval = null;
          arrowKeyHoldRef.current.key = null;
          arrowKeyHoldRef.current.count = 0;

          // Save to history after arrow key movement
          if (selectedGuides.length > 0) {
            setGuides(localGuides);
          }
          saveToHistory();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (arrowKeyHoldRef.current.interval) {
        clearInterval(arrowKeyHoldRef.current.interval);
      }
    };
  }, [selectedGuides, selectedFields, mode, localFields, clipboard, historyIndex, history]);

  const currentPageFields = useMemo(() =>
    localFields.filter(f => (f.page || 1) === currentPage),
    [localFields, currentPage]
  );

  const getFontStyle = (field) => ({
    fontFamily: field.font || 'Arial',
    fontWeight: field.bold ? 'bold' : 'normal',
    fontStyle: field.italic ? 'italic' : 'normal',
    fontSize: `${(field.font_size || 12) * scale}px`,
    textAlign: field.alignment || 'left',
    textDecoration: field.underline ? 'underline' : 'none'
  });

  // Clear split mode when selection changes (fixes "S-split not working after clicking another field")
  useEffect(() => {
    // Only clear if the split target field is no longer selected
    if (splitMode && !selectedFields.includes(splitMode.fieldId)) {
      setSplitMode(null);
      setSplitPosition(null);
    }
  }, [selectedFields, splitMode]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 shadow-sm">
        <div className="flex gap-2">
          <Button
            onClick={() => setMode('field')}
            size="sm"
            variant={mode === 'field' ? 'default' : 'outline'}
            className={mode === 'field' ? 'bg-teal-600 hover:bg-teal-700 shadow-sm' : ''}
          >
            <Hand className="h-4 w-4 mr-1.5" />
            <span className="font-medium">Fields</span>
          </Button>
          <Button
            onClick={() => {
              if (!guidesLocked) setMode('guide');
            }}
            size="sm"
            variant={mode === 'guide' ? 'default' : 'outline'}
            className={mode === 'guide' ? 'bg-teal-600 hover:bg-teal-700 shadow-sm' : ''}
            disabled={guidesLocked}
          >
            <Grid className="h-4 w-4 mr-1.5" />
            <span className="font-medium">Guides</span>
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <Button
            onClick={() => setGuidesVisible(!guidesVisible)}
            size="sm"
            variant="outline"
            title={guidesVisible ? 'Hide Guides (G)' : 'Show Guides (G)'}
            className="transition-all"
          >
            {guidesVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
          <Button
            onClick={() => {
              setGuidesLocked(!guidesLocked);
              if (!guidesLocked && mode === 'guide') setMode('field');
            }}
            size="sm"
            variant="outline"
            title={guidesLocked ? 'Unlock Guides (L)' : 'Lock Guides (L)'}
            className="transition-all"
          >
            {guidesLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {mode === 'guide' && (
            <>
              <Button onClick={() => handleAddGuide('vertical')} size="sm" variant="outline" className="transition-all hover:bg-teal-50 dark:hover:bg-teal-900/20">
                <MoveVertical className="h-4 w-4 mr-1.5" />
                Vertical
              </Button>
              <Button onClick={() => handleAddGuide('horizontal')} size="sm" variant="outline" className="transition-all hover:bg-teal-50 dark:hover:bg-teal-900/20">
                <MoveHorizontal className="h-4 w-4 mr-1.5" />
                Horizontal
              </Button>
            </>
          )}
          {mode === 'field' && (
            <Button onClick={handleAddField} size="sm" className="bg-teal-600 hover:bg-teal-700 shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Field
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ←
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[80px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              →
            </Button>
          </div>
          <ZoomSlider
            scale={scale}
            onScaleChange={setScale}
          />

        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900 p-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          ref={pdfContainerRef}
          className="pdf-container relative mx-auto bg-white shadow-lg border border-slate-300 select-none"
          style={{
            width: `${612 * scale}px`,
            height: `${792 * scale}px`,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onMouseDown={(e) => {
            // Allow box select on background, canvas, or wrapper - but not on fields/guides
            if (e.target === pdfContainerRef.current ||
              e.target.tagName === 'CANVAS' ||
              e.target.classList.contains('pdf-canvas-layer')) {
              const rect = pdfContainerRef.current.getBoundingClientRect();
              const startX = (e.clientX - rect.left) / scale;
              const startY = (e.clientY - rect.top) / scale;
              setBoxSelect({ startX, startY, currentX: startX, currentY: startY });
            }
          }}
          onMouseMove={(e) => {
            if (splitMode) {
              const rect = pdfContainerRef.current.getBoundingClientRect();
              const mouseX = (e.clientX - rect.left) / scale;
              const mouseY = (e.clientY - rect.top) / scale;
              const field = localFields.find(f => f.id === splitMode.fieldId);
              if (field) {
                if (splitMode.orientation === 'vertical') {
                  let clampedX = Math.max(field.x + 10, Math.min(field.x + field.width - 10, mouseX));
                  // Snap to vertical guides
                  const xSnap = snapToGuides(clampedX, true);
                  if (xSnap.didSnap) clampedX = xSnap.snapped;
                  setSplitPosition(clampedX);
                } else {
                  let clampedY = Math.max(field.y + 10, Math.min(field.y + field.height - 10, mouseY));
                  // Snap to horizontal guides
                  const ySnap = snapToGuides(clampedY, false);
                  if (ySnap.didSnap) clampedY = ySnap.snapped;
                  setSplitPosition(clampedY);
                }
              }
            }
          }}
          onClick={(e) => {
            if (splitMode && splitPosition) {
              const field = localFields.find(f => f.id === splitMode.fieldId);
              if (field) {
                executeSplit(field, splitPosition);
              }
              return;
            }

            // Prevent clearing split mode if active (user must press Escape or click the field)
            if (splitMode) return;

            if (justFinishedBoxSelect.current) return; // Don't clear after box select
            if (e.target === pdfContainerRef.current) {
              setSelectedFields([]);
              setSelectedGuides([]);
              setSplitMode(null);
              setSplitPosition(null);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();

            // Check if right-click is on a field or guide
            const rect = pdfContainerRef.current.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / scale;
            const mouseY = (e.clientY - rect.top) / scale;

            const clickedField = localFields
              .filter(f => (f.page || 1) === currentPage)
              .find(f => mouseX >= f.x && mouseX <= f.x + f.width &&
                mouseY >= f.y && mouseY <= f.y + f.height);

            // Standard multi-select right-click behavior:
            // - If right-clicking unselected item: select only that item
            // - If right-clicking selected item: keep current selection
            // - If right-clicking background: clear selection (or show background menu)
            if (mode === 'field') {
              if (clickedField) {
                // Right-click on a field
                if (!selectedFields.includes(clickedField.id)) {
                  // Clicking unselected field: select only it
                  setSelectedFields([clickedField.id]);
                  onFieldSelect(clickedField.id);
                }
                // else: clicking already-selected field, keep current selection
              } else {
                // Right-click on background: clear selection
                setSelectedFields([]);
                return; // Don't show menu
              }
            }

            // Show menu for selected fields
            if (mode === 'field' && selectedFields.length > 0) {
              const field = selectedFields.length === 1 ? localFields.find(f => f.id === selectedFields[0]) : null;
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                items: [
                  field && {
                    label: 'Create Horizontal Guides',
                    icon: <MoveHorizontal className="h-4 w-4" />,
                    onClick: () => createGuidesFromField(field, 'horizontal')
                  },
                  field && {
                    label: 'Create Vertical Guides',
                    icon: <MoveVertical className="h-4 w-4" />,
                    onClick: () => createGuidesFromField(field, 'vertical')
                  },
                  field && { divider: true },
                  selectedFields.length === 1 && {
                    label: 'Cascade Fields to Guides',
                    icon: <AlignVerticalDistributeCenter className="h-4 w-4" />,
                    onClick: () => cascadeFields()
                  },
                  selectedFields.length >= 3 && {
                    label: 'Distribute Horizontally',
                    icon: <AlignHorizontalDistributeCenter className="h-4 w-4" />,
                    onClick: distributeFieldsHorizontally
                  },
                  selectedFields.length >= 3 && {
                    label: 'Distribute Vertically',
                    icon: <AlignVerticalDistributeCenter className="h-4 w-4" />,
                    onClick: distributeFieldsVertically
                  },
                  { divider: true },
                  selectedFields.length >= 2 && {
                    label: 'Merge Fields',
                    icon: <Maximize2 className="h-4 w-4" />,
                    onClick: mergeFields
                  },
                  selectedFields.length >= 2 && { divider: true },
                  {
                    label: `Delete ${selectedFields.length} field${selectedFields.length > 1 ? 's' : ''}`,
                    icon: <Trash2 className="h-4 w-4" />,
                    onClick: () => {
                      selectedFields.forEach(id => onFieldDelete(id));
                      setSelectedFields([]);
                    }
                  }
                ].filter(Boolean)
              });
            } else if (mode === 'guide') {
              // Check if clicked on a guide
              const clickedVerticalGuide = localGuides.vertical.findIndex((pos) => Math.abs(mouseX - pos) < 5 / scale);
              const clickedHorizontalGuide = localGuides.horizontal.findIndex((pos) => Math.abs(mouseY - pos) < 5 / scale);

              if (clickedVerticalGuide !== -1) {
                const guide = { type: 'vertical', index: clickedVerticalGuide, position: localGuides.vertical[clickedVerticalGuide] };
                if (!selectedGuides.find(g => g.type === 'vertical' && g.index === clickedVerticalGuide)) {
                  setSelectedGuides([guide]);
                }
              } else if (clickedHorizontalGuide !== -1) {
                const guide = { type: 'horizontal', index: clickedHorizontalGuide, position: localGuides.horizontal[clickedHorizontalGuide] };
                if (!selectedGuides.find(g => g.type === 'horizontal' && g.index === clickedHorizontalGuide)) {
                  setSelectedGuides([guide]);
                }
              } else {
                // Clicked background
                setSelectedGuides([]);
                return;
              }

              if (selectedGuides.length > 0) {
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items: [
                    selectedGuides.length >= 2 && {
                      label: 'Fill Fields',
                      icon: <Grid className="h-4 w-4" />,
                      onClick: fillFieldsFromGuides
                    },
                    selectedGuides.length >= 2 && { divider: true },
                    selectedGuides.filter(g => g.type === 'vertical').length >= 2 && {
                      label: 'Cascade Vertical...',
                      icon: <MoveVertical className="h-4 w-4" />,
                      onClick: () => setCascadeDialog({ type: 'guides-vertical' })
                    },
                    selectedGuides.filter(g => g.type === 'horizontal').length >= 2 && {
                      label: 'Cascade Horizontal...',
                      icon: <MoveHorizontal className="h-4 w-4" />,
                      onClick: () => setCascadeDialog({ type: 'guides-horizontal' })
                    },
                    (selectedGuides.filter(g => g.type === 'vertical').length >= 2 ||
                      selectedGuides.filter(g => g.type === 'horizontal').length >= 2) && { divider: true },
                    selectedGuides.filter(g => g.type === 'vertical').length >= 3 && {
                      label: 'Distribute Vertically',
                      icon: <AlignHorizontalDistributeCenter className="h-4 w-4" />,
                      onClick: distributeGuidesHorizontally
                    },
                    selectedGuides.filter(g => g.type === 'horizontal').length >= 3 && {
                      label: 'Distribute Horizontally',
                      icon: <AlignVerticalDistributeCenter className="h-4 w-4" />,
                      onClick: distributeGuidesVertically
                    },
                    { divider: true },
                    {
                      label: `Delete ${selectedGuides.length} guide${selectedGuides.length > 1 ? 's' : ''}`,
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: deleteSelectedGuides
                    }
                  ].filter(Boolean)
                });
              }
            }
          }}
        >
          <div className="pdf-canvas-layer">
            <PDFCanvas
              pdfUrl={pdfUrl}
              scale={scale}
              page={currentPage}
              onLoadSuccess={(pdf) => setTotalPages(pdf.numPages)}
            />
          </div>

          {/* Guides */}
          {guidesVisible && localGuides.vertical.map((pos, idx) => {
            const isSelected = !guidesLocked && selectedGuides.some(g => g.type === 'vertical' && g.index === idx);
            const isDragging = draggingGuide && (draggingGuide.type === 'vertical' && draggingGuide.index === idx || (draggingGuide.multiSelect && isSelected));
            return (
              <div
                key={`v-${idx}`}
                className={`absolute top-0 bottom-0 ${guidesLocked ? 'pointer-events-none' : 'cursor-ew-resize'} ${isDragging ? 'bg-blue-500/10 z-20' : isSelected ? 'bg-blue-500 z-20' : guidesLocked ? 'bg-blue-400/20 z-10' : 'bg-blue-400/20 hover:bg-blue-500/60 z-10'
                  }`}
                style={{
                  left: guidesLocked ? `${pos * scale - 0.5}px` : `${pos * scale - 3.5}px`,
                  width: guidesLocked ? '1px' : '7px'
                }}
                onMouseDown={(e) => {
                  if (mode !== 'guide') {
                    setMode('guide');
                    setSelectedFields([]);
                  }
                  handleGuideMouseDown(e, 'vertical', idx);
                }}
              >
                {!guidesLocked && (
                  <div
                    className={`absolute inset-y-0 left-[3px] w-px ${isDragging ? 'bg-blue-600/30' : isSelected ? 'bg-blue-600' : 'bg-blue-400'}`}
                  />
                )}
                {isSelected && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                    {pos.toFixed(1)}px
                  </div>
                )}
              </div>
            );
          })}
          {guidesVisible && localGuides.horizontal.map((pos, idx) => {
            const isSelected = !guidesLocked && selectedGuides.some(g => g.type === 'horizontal' && g.index === idx);
            const isDragging = draggingGuide && (draggingGuide.type === 'horizontal' && draggingGuide.index === idx || (draggingGuide.multiSelect && isSelected));
            return (
              <div
                key={`h-${idx}`}
                className={`absolute left-0 right-0 ${guidesLocked ? 'pointer-events-none' : 'cursor-ns-resize'} ${isDragging ? 'bg-blue-500/10 z-20' : isSelected ? 'bg-blue-500 z-20' : guidesLocked ? 'bg-blue-400/20 z-10' : 'bg-blue-400/20 hover:bg-blue-500/60 z-10'
                  }`}
                style={{
                  top: guidesLocked ? `${pos * scale - 0.5}px` : `${pos * scale - 3.5}px`,
                  height: guidesLocked ? '1px' : '7px'
                }}
                onMouseDown={(e) => {
                  if (mode !== 'guide') {
                    setMode('guide');
                    setSelectedFields([]);
                  }
                  handleGuideMouseDown(e, 'horizontal', idx);
                }}
              >
                {!guidesLocked && (
                  <div
                    className={`absolute inset-x-0 top-[3px] h-px ${isDragging ? 'bg-blue-600/30' : isSelected ? 'bg-blue-600' : 'bg-blue-400'}`}
                  />
                )}
                {isSelected && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                    {pos.toFixed(1)}px
                  </div>
                )}
              </div>
            );
          })}

          {/* Snap Lines */}
          {snapLines.vertical.map((pos, idx) => (
            <div
              key={`snap-v-${idx}`}
              className="absolute top-0 bottom-0 w-px bg-teal-400 pointer-events-none"
              style={{ left: `${pos * scale}px` }}
            />
          ))}
          {snapLines.horizontal.map((pos, idx) => (
            <div
              key={`snap-h-${idx}`}
              className="absolute left-0 right-0 h-px bg-teal-400 pointer-events-none"
              style={{ top: `${pos * scale}px` }}
            />
          ))}

          {/* Fields */}
          {currentPageFields.map((field) => {
            const style = getFontStyle(field);
            let displayName = field.label;
            let displayIcon = null;

            // Special values take priority
            if (field.special_value) {
              if (field.special_value === 'today') displayName = 'Today';
              else if (field.special_value === 'yesterday') displayName = 'Yesterday';
              else if (field.special_value === 'tomorrow') displayName = 'Tomorrow';
              else if (field.special_value === 'custom') displayName = field.custom_text || 'Custom Text';
            } else if (field.airtable_field) {
              displayName = field.airtable_field;
              const fieldDef = airtableFields.find(f => f.name === field.airtable_field);
              if (fieldDef) {
                const IconComponent = getFieldIcon(fieldDef.type);
                displayIcon = <IconComponent className="h-3.5 w-3.5 flex-shrink-0" style={{ fontSize: `${(field.font_size || 12) * scale * 0.8}px` }} />;
              }
            }

            const isSelected = selectedFields.includes(field.id);
            const isPrimarySelected = isSelected && (selectedFields.length === 1 || selectedFieldId === field.id);
            const isDraggingField = dragging && dragging.fieldId === field.id;
            const isResizingField = resizing && resizing.fieldId === field.id;

            return (
              <div
                key={field.id}

                className={`absolute cursor-move group ${isSelected
                  ? `ring-2 ring-teal-500 ${isDraggingField || isResizingField ? 'bg-teal-100/10' : 'bg-teal-100/30'} z-10`
                  : 'ring-1 ring-slate-300 bg-blue-100/20 hover:bg-blue-200/30'
                  }`}
                style={{
                  left: `${field.x * scale}px`,
                  top: `${field.y * scale}px`,
                  width: `${field.width * scale}px`,
                  height: `${field.height * scale}px`,
                }}
                onMouseDown={(e) => {
                  if (mode !== 'field') {
                    setMode('field');
                    setSelectedGuides([]);
                  }
                  handleMouseDown(e, field, 'drag');
                }}
              >
                <div
                  className="absolute inset-0 flex pointer-events-none overflow-hidden gap-1.5"
                  style={{
                    ...style,
                    paddingLeft: style.textAlign === 'left' ? '8px' : style.textAlign === 'center' ? '8px' : '2px',
                    paddingRight: style.textAlign === 'right' ? '8px' : style.textAlign === 'center' ? '8px' : '2px',
                    justifyContent: style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start',
                    alignItems: field.vertical_alignment === 'top' ? 'flex-start' : field.vertical_alignment === 'bottom' ? 'flex-end' : 'center'
                  }}
                >
                  {displayIcon && <span className="text-slate-500">{displayIcon}</span>}
                  <span className="text-slate-700 truncate" style={style}>
                    {displayName}
                  </span>
                </div>

                {isPrimarySelected && mode === 'field' && (
                  <>
                    <div
                      className={`absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full cursor-nw-resize hover:scale-125 transition-transform z-10 ${isResizingField ? 'opacity-30' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'nw')}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className={`absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full cursor-ne-resize hover:scale-125 transition-transform z-10 ${isResizingField ? 'opacity-30' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'ne')}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className={`absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full cursor-sw-resize hover:scale-125 transition-transform z-10 ${isResizingField ? 'opacity-30' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'sw')}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div
                      className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-teal-500 rounded-full cursor-se-resize hover:scale-125 transition-transform z-10 ${isResizingField ? 'opacity-30' : ''}`}
                      onMouseDown={(e) => handleMouseDown(e, field, 'resize', 'se')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* Split Mode Line */}
          {splitMode && splitPosition && (() => {
            const field = localFields.find(f => f.id === splitMode.fieldId);
            if (!field) return null;
            return (
              <div
                className="absolute bg-red-500/50 pointer-events-none z-30"
                style={
                  splitMode.orientation === 'vertical'
                    ? {
                      left: `${splitPosition * scale}px`,
                      top: `${field.y * scale}px`,
                      width: '2px',
                      height: `${field.height * scale}px`,
                    }
                    : {
                      left: `${field.x * scale}px`,
                      top: `${splitPosition * scale}px`,
                      width: `${field.width * scale}px`,
                      height: '2px',
                    }
                }
              />
            );
          })()}

          {/* Box Selection */}
          {boxSelect && (
            <div
              className="absolute border-2 border-teal-500 bg-teal-500/10 pointer-events-none z-30"
              style={{
                left: `${Math.min(boxSelect.startX, boxSelect.currentX) * scale}px`,
                top: `${Math.min(boxSelect.startY, boxSelect.currentY) * scale}px`,
                width: `${Math.abs(boxSelect.currentX - boxSelect.startX) * scale}px`,
                height: `${Math.abs(boxSelect.currentY - boxSelect.startY) * scale}px`,
              }}
            />
          )}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {cascadeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl min-w-[300px]">
            <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
              Cascade Guides
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Creates extra guides with same spacing as first two selected guides
            </p>
            <label className="block text-sm mb-2 text-slate-700 dark:text-slate-300">
              Number of extra guides to create:
            </label>
            <input
              type="number"
              min="1"
              defaultValue="8"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded mb-4"
              id="cascade-count"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCascadeDialog(null)}>
                Cancel
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => {
                  const count = parseInt(document.getElementById('cascade-count').value);
                  if (cascadeDialog.type === 'guides-vertical') {
                    cascadeGuides(count, 'vertical');
                  } else {
                    cascadeGuides(count, 'horizontal');
                  }
                  setCascadeDialog(null);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 dark:text-slate-400">
          {mode === 'guide' && (
            <>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono">Caps Lock</kbd>
                Precision drag
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400">•</span>
                Right-click for Fill Fields
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono">Ctrl+Z/Y</kbd>
                Undo/Redo
              </span>
            </>
          )}
          {mode === 'field' && (
            <>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono">Caps Lock</kbd>
                Precision
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono">Alt+X/Y</kbd>
                Lock axis
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-mono">Ctrl+C/V/D</kbd>
                Copy/Paste/Duplicate
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}