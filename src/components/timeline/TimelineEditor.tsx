import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { createTimeline, getTimeline, updateTimeline, getAllUniqueBossTags } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { ArrowLeft, Plus, Save, Settings, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CustomActionModal from './CustomActionModal';
import BossActionsLibrary from './BossActionsLibrary';
import CompactTimelineVisualization from './CompactTimelineVisualization';
import TimelineSettingsDrawer from './TimelineSettingsDrawer';
import TimelineActionCard from './TimelineActionCard';

const SortableActionCard = ({ action, isExpanded, onToggleExpand, onEdit, onDelete, onDuplicate, onQuickTimeEdit }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TimelineActionCard
        action={action}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onQuickTimeEdit={onQuickTimeEdit}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
};

const TimelineEditor = () => {
  const { timelineId } = useParams();
  const navigate = useNavigate();
  const { user, isAnonymousMode, anonymousUser } = useAuth();


  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timelineName, setTimelineName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [bossTags, setBossTags] = useState([]);
  const [newBossTag, setNewBossTag] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(100);
  const [timelineActions, setTimelineActions] = useState([]);
  const [showCustomActionModal, setShowCustomActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [expandedActionId, setExpandedActionId] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState(null);

  // Tag suggestions state
  const [allExistingTags, setAllExistingTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredTagSuggestions, setFilteredTagSuggestions] = useState([]);

  const nameInputRef = useRef(null);
  const actionRefs = useRef({});

  const isEditMode = !!timelineId;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setTimelineActions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);
        
        return newItems;
      });
    }
  }, []);

  // Load all existing tags on mount
  useEffect(() => {
    loadAllExistingTags();
  }, []);

  // Load timeline if editing
  useEffect(() => {
    if (isEditMode) {
      loadTimeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineId, isEditMode]);

  // Filter tag suggestions based on input
  useEffect(() => {
    if (newBossTag.trim()) {
      const searchTerm = newBossTag.toLowerCase();

      const bossOptions = bosses.map(b => ({ id: b.id, name: b.name, type: 'boss' }));
      const existingTagOptions = allExistingTags
        .filter(tag => !bosses.find(b => b.id === tag))
        .map(tag => ({ id: tag, name: tag, type: 'custom' }));

      const allOptions = [...bossOptions, ...existingTagOptions];

      const filtered = allOptions.filter(option =>
        option.name.toLowerCase().includes(searchTerm) &&
        !bossTags.includes(option.id)
      );

      setFilteredTagSuggestions(filtered);
      setShowTagSuggestions(filtered.length > 0);
    } else {
      setFilteredTagSuggestions([]);
      setShowTagSuggestions(false);
    }
  }, [newBossTag, bossTags, allExistingTags]);

  // Focus name input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!saving) {
          handleSave();
        }
      }
      if (e.key === 'Escape') {
        if (showCustomActionModal) {
          setShowCustomActionModal(false);
          setEditingAction(null);
        } else if (showSettingsDrawer) {
          setShowSettingsDrawer(false);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, showCustomActionModal, showSettingsDrawer]);

  const loadAllExistingTags = async () => {
    try {
      const tags = await getAllUniqueBossTags();
      setAllExistingTags(tags);
    } catch (error) {
      console.error('Error loading existing tags:', error);
    }
  };

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const timeline = await getTimeline(timelineId);
      setTimelineName(timeline.name);
      setBossTags(timeline.bossTags || (timeline.bossId ? [timeline.bossId] : []));
      setDescription(timeline.description || '');
      setLevel(timeline.bossMetadata?.level || 100);
      setTimelineActions(timeline.actions || []);
    } catch (error) {
      console.error('Error loading timeline:', error);
      toast.error('Failed to load timeline', { description: 'Please try again.' });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding boss tag
  const handleAddBossTag = (tagToAdd = null) => {
    const tag = (tagToAdd || newBossTag).trim();
    if (tag && !bossTags.includes(tag)) {
      setBossTags([...bossTags, tag]);
      setNewBossTag('');
      setShowTagSuggestions(false);
      loadAllExistingTags();
    }
  };

  const handleSelectTagSuggestion = (tagId) => {
    handleAddBossTag(tagId);
  };

  const handleRemoveBossTag = (tagToRemove) => {
    setBossTags(bossTags.filter(tag => tag !== tagToRemove));
  };

  // Handle adding existing boss action
  const handleAddBossAction = (action) => {
    const newAction = {
      ...action,
      id: `${action.id}_${Date.now()}`,
      isCustom: false,
      source: 'boss'
    };
    setTimelineActions([...timelineActions, newAction]);
    toast.success('Action added', { description: `Added "${action.name}" to timeline` });
  };

  // Handle adding custom action
  const handleAddCustomAction = (customAction) => {
    const newAction = {
      ...customAction,
      id: `custom_${Date.now()}`,
      isCustom: true,
      source: 'custom'
    };
    
    if (editingAction) {
      setTimelineActions(timelineActions.map(a => 
        a.id === editingAction.id ? { ...newAction, id: editingAction.id } : a
      ));
      setEditingAction(null);
    } else {
      setTimelineActions([...timelineActions, newAction]);
    }
    
    setShowCustomActionModal(false);
  };

  // Handle removing action
  const handleRemoveAction = (actionId) => {
    setTimelineActions(timelineActions.filter(a => a.id !== actionId));
  };

  // Handle editing action
  const handleEditAction = (action) => {
    setEditingAction(action);
    setShowCustomActionModal(true);
  };

  // Handle duplicating action
  const handleDuplicateAction = (action) => {
    const duplicatedAction = {
      ...action,
      id: `${action.id}_copy_${Date.now()}`,
      time: action.time + 5, // Add 5 seconds offset
    };
    setTimelineActions([...timelineActions, duplicatedAction]);
    toast.success('Action duplicated', { description: `Duplicated "${action.name}"` });
  };

  // Handle quick time edit
  const handleQuickTimeEdit = useCallback((actionId, newTime) => {
    setTimelineActions(prev => prev.map(action =>
      action.id === actionId ? { ...action, time: newTime } : action
    ));
  }, []);

  // Handle toggle expand
  const handleToggleExpand = useCallback((actionId) => {
    setExpandedActionId(prev => prev === actionId ? null : actionId);
  }, []);

  // Handle action click from visualization
  const handleActionClick = useCallback((actionId) => {
    setSelectedActionId(actionId);
    setExpandedActionId(actionId);
    // Scroll to action
    if (actionRefs.current[actionId]) {
      actionRefs.current[actionId].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  // Sort actions by time
  const getSortedActions = () => {
    return [...timelineActions].sort((a, b) => a.time - b.time);
  };

  // Handle inline name edit
  const startNameEdit = () => {
    setTempName(timelineName);
    setIsEditingName(true);
  };

  const saveName = () => {
    if (tempName.trim()) {
      setTimelineName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const cancelNameEdit = () => {
    setTempName(timelineName);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveName();
    } else if (e.key === 'Escape') {
      cancelNameEdit();
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!timelineName.trim()) {
      toast.error('Timeline name required', { description: 'Please enter a timeline name.' });
      return;
    }

    if (timelineActions.length === 0) {
      toast.error('Boss actions required', { description: 'Please add at least one boss action.' });
      return;
    }

    setSaving(true);
    try {
      const userId = isAnonymousMode ? anonymousUser?.id : user?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const timelineData = {
        name: timelineName,
        bossTags: bossTags,
        bossId: bossTags.length > 0 ? bossTags[0] : null,
        description: description,
        actions: timelineActions,
        bossMetadata: {
          level: level
        }
      };

      if (isEditMode) {
        await updateTimeline(timelineId, timelineData);
        toast.success('Timeline updated!', { description: 'Your timeline has been updated successfully.' });
      } else {
        const newTimeline = await createTimeline(userId, timelineData);
        toast.success('Timeline created!', { description: 'Your timeline has been created successfully.' });
        navigate(`/timeline/edit/${newTimeline.id}`);
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      toast.error('Failed to save timeline', { description: error.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  const sortedActions = getSortedActions();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back button + Name */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="icon"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </Button>
              
              {/* Inline editable name */}
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    onBlur={saveName}
                    placeholder="Timeline name..."
                    className="flex-1 min-w-0 px-3 py-1.5 text-xl font-bold bg-background border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={saveName}
                    className="h-8 w-8 text-green-500 hover:bg-green-500/10"
                    title="Save"
                  >
                    <Check size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelNameEdit}
                    className="h-8 w-8"
                    title="Cancel"
                  >
                    <X size={18} />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={startNameEdit}
                  className="text-xl font-bold truncate hover:text-primary transition-colors text-left"
                  title="Click to edit name"
                >
                  {timelineName || 'Untitled Timeline'}
                </button>
              )}
            </div>

            {/* Right: Settings + Save */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowSettingsDrawer(true)}
                title="Timeline settings"
              >
                <Settings size={20} />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={18} />
                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Boss Actions Library */}
        <div className="w-80 lg:w-96 flex-shrink-0 border-r border-border bg-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold mb-3">Add Actions</h2>
              <Button
                onClick={() => {
                  setEditingAction(null);
                  setShowCustomActionModal(true);
                }}
                className="w-full"
              >
                <Plus size={18} />
                Create Custom Action
              </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
              Boss Actions Library
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Click to add actions. Customize time after adding.
            </p>
            <BossActionsLibrary onSelectAction={handleAddBossAction} />
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Compact Timeline Visualization */}
          <div className="p-4 border-b border-border bg-card">
            <CompactTimelineVisualization 
              actions={sortedActions}
              onActionClick={handleActionClick}
              selectedActionId={selectedActionId}
            />
          </div>

          {/* Timeline Actions List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Timeline Actions
              </h2>
              <span className="text-sm text-muted-foreground">
                {sortedActions.length} action{sortedActions.length !== 1 ? 's' : ''}
              </span>
            </div>

            {sortedActions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg font-medium mb-2">No actions yet</p>
                <p className="text-sm">
                  Add boss actions from the library or create custom actions to build your timeline.
                </p>
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={sortedActions.map(a => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sortedActions.map((action) => (
                      <div 
                        key={action.id} 
                        ref={el => actionRefs.current[action.id] = el}
                      >
                        <SortableActionCard
                          action={action}
                          isExpanded={expandedActionId === action.id}
                          onToggleExpand={handleToggleExpand}
                          onEdit={handleEditAction}
                          onDelete={handleRemoveAction}
                          onDuplicate={handleDuplicateAction}
                          onQuickTimeEdit={handleQuickTimeEdit}
                        />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      <TimelineSettingsDrawer
        isOpen={showSettingsDrawer}
        onClose={() => setShowSettingsDrawer(false)}
        level={level}
        setLevel={setLevel}
        bossTags={bossTags}
        description={description}
        setDescription={setDescription}
        newBossTag={newBossTag}
        setNewBossTag={setNewBossTag}
        filteredTagSuggestions={filteredTagSuggestions}
        showTagSuggestions={showTagSuggestions}
        setShowTagSuggestions={setShowTagSuggestions}
        onAddBossTag={handleAddBossTag}
        onRemoveBossTag={handleRemoveBossTag}
        onSelectTagSuggestion={handleSelectTagSuggestion}
      />

      {/* Custom Action Modal */}
      {showCustomActionModal && (
        <CustomActionModal
          onClose={() => {
            setShowCustomActionModal(false);
            setEditingAction(null);
          }}
          onSave={handleAddCustomAction}
          editingAction={editingAction}
        />
      )}
    </div>
  );
};

export default TimelineEditor;
