import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, FolderOpen, Folder, Edit2, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useOrgContext } from '../context/OrgContext';

export default function SectionManager({ 
  sections, 
  onCreateSection, 
  onUpdateSection, 
  onDeleteSection,
  selectedSection,
  onSelectSection 
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionName, setSectionName] = useState('');
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [creatingUnderParent, setCreatingUnderParent] = useState(null);
  const { getContextFilter } = useOrgContext();

  // Build tree structure
  const sectionTree = useMemo(() => {
    const buildTree = (parentId = null, level = 0) => {
      return sections
        .filter(s => (s.parent_id || null) === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(section => ({
          ...section,
          level,
          children: buildTree(section.id, level + 1)
        }));
    };
    return buildTree();
  }, [sections]);

  // Flatten tree for rendering
  const flattenTree = (tree) => {
    const result = [];
    const traverse = (nodes) => {
      nodes.forEach(node => {
        result.push(node);
        if (expandedSections.has(node.id) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(tree);
    return result;
  };

  const flatSections = flattenTree(sectionTree);

  const toggleExpand = (sectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!sectionName.trim()) return;
    const contextFilter = getContextFilter();
    
    const parentId = creatingUnderParent?.id || null;
    const siblings = sections.filter(s => (s.parent_id || null) === parentId);
    
    await onCreateSection({ 
      name: sectionName, 
      parent_id: parentId,
      order: siblings.length,
      organization_id: contextFilter.organization_id
    });
    
    setSectionName('');
    setIsCreateOpen(false);
    setCreatingUnderParent(null);
    
    // Auto-expand parent if creating under it
    if (parentId) {
      setExpandedSections(prev => new Set([...prev, parentId]));
    }
  };

  const handleUpdate = async () => {
    if (!sectionName.trim() || !editingSection) return;
    await onUpdateSection(editingSection.id, { name: sectionName });
    setSectionName('');
    setEditingSection(null);
  };

  const startEdit = (section) => {
    setEditingSection(section);
    setSectionName(section.name);
  };

  const startCreate = (parentSection = null) => {
    setCreatingUnderParent(parentSection);
    setSectionName('');
    setIsCreateOpen(true);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;
    
    if (sourceIndex === destIndex) return;

    const draggedSection = flatSections[sourceIndex];
    const targetSection = flatSections[destIndex];
    
    // Determine new parent and order based on indentation
    let newParentId = null;
    let newOrder = 0;

    // Check if dropped on another section (potential parent) or between sections
    if (targetSection) {
      // If target has children and is expanded, make dragged a child
      if (expandedSections.has(targetSection.id) && targetSection.children.length > 0 && destIndex > sourceIndex) {
        newParentId = targetSection.id;
        newOrder = 0;
      } else {
        // Otherwise, make it a sibling
        newParentId = targetSection.parent_id || null;
        const siblings = sections.filter(s => (s.parent_id || null) === newParentId);
        const targetOrderIndex = siblings.findIndex(s => s.id === targetSection.id);
        newOrder = destIndex > sourceIndex ? targetOrderIndex + 1 : targetOrderIndex;
      }
    }

    // Update the section
    onUpdateSection(draggedSection.id, {
      parent_id: newParentId,
      order: newOrder
    });

    // Reorder siblings
    const siblings = sections.filter(s => 
      (s.parent_id || null) === newParentId && s.id !== draggedSection.id
    );
    siblings.sort((a, b) => (a.order || 0) - (b.order || 0));
    siblings.forEach((sibling, idx) => {
      const finalOrder = idx >= newOrder ? idx + 1 : idx;
      if (sibling.order !== finalOrder) {
        onUpdateSection(sibling.id, { order: finalOrder });
      }
    });
  };

  const indentSection = (section) => {
    // Find previous sibling at same level to become parent
    const siblings = flatSections.filter(s => 
      (s.parent_id || null) === (section.parent_id || null) && 
      s.order < section.order
    );
    const newParent = siblings[siblings.length - 1];
    
    if (newParent) {
      const newSiblings = sections.filter(s => (s.parent_id || null) === newParent.id);
      onUpdateSection(section.id, {
        parent_id: newParent.id,
        order: newSiblings.length
      });
      setExpandedSections(prev => new Set([...prev, newParent.id]));
    }
  };

  const outdentSection = (section) => {
    if (!section.parent_id) return;
    
    const parent = sections.find(s => s.id === section.parent_id);
    if (!parent) return;
    
    const newParentId = parent.parent_id || null;
    const newSiblings = sections.filter(s => (s.parent_id || null) === newParentId);
    const parentOrder = parent.order || 0;
    
    onUpdateSection(section.id, {
      parent_id: newParentId,
      order: parentOrder + 1
    });
    
    // Shift down siblings after parent
    newSiblings
      .filter(s => s.order > parentOrder)
      .forEach(s => onUpdateSection(s.id, { order: s.order + 1 }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Sections
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => startCreate(null)}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onSelectSection(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedSection === null
              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>All Templates</span>
        </button>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sections">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {flatSections.map((section, index) => {
                  const hasChildren = section.children.length > 0;
                  const isExpanded = expandedSections.has(section.id);
                  const isSelected = selectedSection?.id === section.id;
                  
                  return (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`group flex items-center gap-1 rounded-lg text-sm transition-colors py-2 cursor-grab active:cursor-grabbing ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                              : snapshot.isDragging
                              ? 'bg-slate-200 dark:bg-slate-700'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                          style={{
                            paddingLeft: `${section.level * 16 + 12}px`,
                            paddingRight: '12px',
                            ...provided.draggableProps.style
                          }}
                        >
                          {hasChildren ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(section.id);
                              }}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex-shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                          ) : (
                            <div className="w-5 flex-shrink-0" />
                          )}
                          
                          <button
                            onClick={() => onSelectSection(section)}
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                          >
                            <Folder className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{section.name}</span>
                          </button>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                            {section.level < 3 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startCreate(section);
                                }}
                                title="Add subsection"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(section);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete section "${section.name}"?`)) {
                                  onDeleteSection(section.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creatingUnderParent 
                ? `New subsection under "${creatingUnderParent.name}"`
                : 'Create New Section'
              }
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Section name"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Section</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Section name"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleUpdate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="bg-teal-600 hover:bg-teal-700">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}