import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { createTimeline, getTimeline, updateTimeline, addBossTag, removeBossTag, getAllUniqueBossTags } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { bossActionsLibrary } from '../../data/bossActionsLibrary';
import { ArrowLeft, Plus, Trash2, Save, GripVertical, X, Tag, Edit2, Check } from 'lucide-react';
import CustomActionModal from './CustomActionModal';
import BossActionsLibrary from './BossActionsLibrary';

const TimelineEditor = () => {
  const { timelineId } = useParams();
  const navigate = useNavigate();
  const { user, isAnonymousMode, anonymousUser } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timelineName, setTimelineName] = useState('');
  const [bossTags, setBossTags] = useState([]); // New: array of boss tags
  const [newBossTag, setNewBossTag] = useState(''); // New: input for adding boss tags
  const [description, setDescription] = useState('');
  const [timelineActions, setTimelineActions] = useState([]);
  const [showCustomActionModal, setShowCustomActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [editingActionId, setEditingActionId] = useState(null); // New: for inline editing
  const [editingField, setEditingField] = useState(null); // New: which field is being edited

  // Tag suggestions state
  const [allExistingTags, setAllExistingTags] = useState([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredTagSuggestions, setFilteredTagSuggestions] = useState([]);
  const tagInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const isEditMode = !!timelineId;

  // Load all existing tags on mount
  useEffect(() => {
    loadAllExistingTags();
  }, []);

  // Load timeline if editing
  useEffect(() => {
    if (isEditMode) {
      loadTimeline();
    }
  }, [timelineId]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(event.target)
      ) {
        setShowTagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter tag suggestions based on input
  useEffect(() => {
    if (newBossTag.trim()) {
      const searchTerm = newBossTag.toLowerCase();

      // Combine boss names from bosses data and existing tags
      const bossOptions = bosses.map(b => ({ id: b.id, name: b.name, type: 'boss' }));
      const existingTagOptions = allExistingTags
        .filter(tag => !bosses.find(b => b.id === tag)) // Exclude boss IDs already in bosses
        .map(tag => ({ id: tag, name: tag, type: 'custom' }));

      const allOptions = [...bossOptions, ...existingTagOptions];

      // Filter options that contain the search term and aren't already added
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

  const loadAllExistingTags = async () => {
    try {
      const tags = await getAllUniqueBossTags();
      setAllExistingTags(tags);
    } catch (error) {
      console.error('Error loading existing tags:', error);
      // Silently fail - not critical
    }
  };

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const timeline = await getTimeline(timelineId);
      setTimelineName(timeline.name);
      // Support both new bossTags and legacy bossId
      setBossTags(timeline.bossTags || (timeline.bossId ? [timeline.bossId] : []));
      setDescription(timeline.description || '');
      setTimelineActions(timeline.actions || []);
    } catch (error) {
      console.error('Error loading timeline:', error);
      addToast({
        type: 'error',
        title: 'Failed to load timeline',
        message: 'Please try again.',
        duration: 4000
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Get all available boss actions from library
  const getAvailableBossActions = () => {
    return bossActionsLibrary.map(action => ({
      ...action,
      isCustom: false,
      source: 'library'
    }));
  };

  // Handle adding boss tag
  const handleAddBossTag = (tagToAdd = null) => {
    const tag = (tagToAdd || newBossTag).trim();
    if (tag && !bossTags.includes(tag)) {
      setBossTags([...bossTags, tag]);
      setNewBossTag('');
      setShowTagSuggestions(false);

      // Reload existing tags to include the new one
      loadAllExistingTags();
    }
  };

  // Handle selecting a tag from suggestions
  const handleSelectTagSuggestion = (tagId) => {
    handleAddBossTag(tagId);
  };

  // Handle removing boss tag
  const handleRemoveBossTag = (tagToRemove) => {
    setBossTags(bossTags.filter(tag => tag !== tagToRemove));
  };

  // Handle inline field edit
  const handleInlineEdit = (actionId, field, value) => {
    setTimelineActions(timelineActions.map(action =>
      action.id === actionId ? { ...action, [field]: value } : action
    ));
  };

  // Start inline editing
  const startInlineEdit = (actionId, field) => {
    setEditingActionId(actionId);
    setEditingField(field);
  };

  // Finish inline editing
  const finishInlineEdit = () => {
    setEditingActionId(null);
    setEditingField(null);
  };

  // Handle adding existing boss action
  const handleAddBossAction = (action) => {
    const newAction = {
      ...action,
      id: `${action.id}_${Date.now()}`, // Make unique
      isCustom: false,
      source: 'boss'
    };
    setTimelineActions([...timelineActions, newAction]);
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
      // Update existing action
      setTimelineActions(timelineActions.map(a => 
        a.id === editingAction.id ? { ...newAction, id: editingAction.id } : a
      ));
      setEditingAction(null);
    } else {
      // Add new action
      setTimelineActions([...timelineActions, newAction]);
    }
    
    setShowCustomActionModal(false);
  };

  // Handle removing action
  const handleRemoveAction = (actionId) => {
    setTimelineActions(timelineActions.filter(a => a.id !== actionId));
  };

  // Handle editing action (now works for all actions, not just custom)
  const handleEditAction = (action) => {
    setEditingAction(action);
    setShowCustomActionModal(true);
  };

  // Sort actions by time
  const getSortedActions = () => {
    return [...timelineActions].sort((a, b) => a.time - b.time);
  };

  // Handle save
  const handleSave = async () => {
    if (!timelineName.trim()) {
      addToast({
        type: 'error',
        title: 'Timeline name required',
        message: 'Please enter a timeline name.',
        duration: 3000
      });
      return;
    }

    if (timelineActions.length === 0) {
      addToast({
        type: 'error',
        title: 'Boss actions required',
        message: 'Please add at least one boss action.',
        duration: 3000
      });
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
        bossTags: bossTags, // New: use boss tags instead of single boss
        bossId: bossTags.length > 0 ? bossTags[0] : null, // Keep first tag as legacy bossId for compatibility
        description: description,
        actions: timelineActions
      };

      if (isEditMode) {
        await updateTimeline(timelineId, timelineData);
        addToast({
          type: 'success',
          title: 'Timeline updated!',
          message: 'Your timeline has been updated successfully.',
          duration: 3000
        });
      } else {
        const newTimeline = await createTimeline(userId, timelineData);
        addToast({
          type: 'success',
          title: 'Timeline created!',
          message: 'Your timeline has been created successfully.',
          duration: 3000
        });
        navigate(`/timeline/edit/${newTimeline.id}`);
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      addToast({
        type: 'error',
        title: 'Failed to save timeline',
        message: error.message || 'Please try again.',
        duration: 4000
      });
    } finally {
      setSaving(false);
    }
  };



  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-[var(--color-textSecondary)]">Loading timeline...</p>
        </div>
      </div>
    );
  }

  const availableActions = getAvailableBossActions();
  const sortedActions = getSortedActions();

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Header */}
      <div className="bg-[var(--color-cardBackground)] border-b border-[var(--color-border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 rounded-lg hover:bg-[var(--select-bg)] transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-2xl font-bold m-0">
                {isEditMode ? 'Edit Timeline' : 'Create Timeline'}
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[#2563eb] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Timeline'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Timeline Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Timeline Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Timeline Name</label>
                  <input
                    type="text"
                    value={timelineName}
                    onChange={(e) => setTimelineName(e.target.value)}
                    placeholder="Enter timeline name"
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Tag size={16} />
                    Boss Tags (Optional)
                  </label>
                  <div className="space-y-2">
                    {/* Display existing tags */}
                    {bossTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {bossTags.map((tag, index) => {
                          const boss = bosses.find(b => b.id === tag);
                          return (
                            <div
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
                            >
                              {boss ? boss.name : tag}
                              <button
                                onClick={() => handleRemoveBossTag(tag)}
                                className="hover:bg-blue-500/30 rounded-full p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add new tag with suggestions */}
                    <div className="relative">
                      <div className="flex gap-2">
                        <input
                          ref={tagInputRef}
                          type="text"
                          value={newBossTag}
                          onChange={(e) => setNewBossTag(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filteredTagSuggestions.length > 0) {
                                handleSelectTagSuggestion(filteredTagSuggestions[0].id);
                              } else {
                                handleAddBossTag();
                              }
                            }
                          }}
                          onFocus={() => {
                            if (newBossTag.trim() && filteredTagSuggestions.length > 0) {
                              setShowTagSuggestions(true);
                            }
                          }}
                          placeholder="Search for boss tags..."
                          className="flex-1 px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                        />
                        <button
                          onClick={() => handleAddBossTag()}
                          className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[#2563eb] transition-colors"
                          title="Add custom tag"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Tag suggestions dropdown */}
                      {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                        <div
                          ref={suggestionsRef}
                          className="absolute z-10 w-full mt-1 bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto"
                        >
                          {filteredTagSuggestions.map((suggestion, index) => {
                            const boss = bosses.find(b => b.id === suggestion.id);
                            return (
                              <button
                                key={`${suggestion.id}-${index}`}
                                onClick={() => handleSelectTagSuggestion(suggestion.id)}
                                className="w-full px-3 py-2 text-left hover:bg-[var(--select-bg)] transition-colors flex items-center justify-between text-sm"
                              >
                                <span className="flex items-center gap-2">
                                  {boss && <span>{boss.icon}</span>}
                                  <span>{suggestion.name}</span>
                                </span>
                                {suggestion.type === 'custom' && (
                                  <span className="text-xs text-[var(--color-textSecondary)] italic">custom</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Helper text */}
                    <div className="text-xs text-[var(--color-textSecondary)]">
                      Type to search existing tags or add a custom tag
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter timeline description"
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Add Actions Panel */}
            <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Add Actions</h2>
              
              <button
                onClick={() => {
                  setEditingAction(null);
                  setShowCustomActionModal(true);
                }}
                className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[#2563eb] transition-colors flex items-center justify-center gap-2 mb-4"
              >
                <Plus size={18} />
                Create Custom Action
              </button>

              <div className="border-t border-[var(--color-border)] pt-4">
                <h3 className="text-sm font-semibold mb-3 text-[var(--color-textSecondary)]">
                  Boss Actions Library
                </h3>
                <p className="text-xs text-[var(--color-textSecondary)] mb-3">
                  Select any action from the library. You can customize time, damage, and other properties after adding.
                </p>
                <BossActionsLibrary onSelectAction={handleAddBossAction} />
              </div>
            </div>
          </div>

          {/* Right Panel - Timeline Actions */}
          <div className="lg:col-span-2">
            <div className="bg-[var(--color-cardBackground)] border border-[var(--color-border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                Timeline Actions ({sortedActions.length})
              </h2>

              {sortedActions.length === 0 ? (
                <div className="text-center py-12 text-[var(--color-textSecondary)]">
                  <p>No actions added yet. Add boss actions or create custom actions to build your timeline.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedActions.map((action, index) => {
                    const isEditingThis = editingActionId === action.id;

                    return (
                      <div
                        key={action.id}
                        className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon - Inline editable */}
                          <div className="flex-shrink-0 text-2xl">
                            {isEditingThis && editingField === 'icon' ? (
                              <input
                                type="text"
                                value={action.icon}
                                onChange={(e) => handleInlineEdit(action.id, 'icon', e.target.value)}
                                onBlur={finishInlineEdit}
                                autoFocus
                                className="w-12 px-1 py-0.5 bg-[var(--color-cardBackground)] border border-[var(--color-primary)] rounded text-center"
                              />
                            ) : (
                              <span
                                onClick={() => startInlineEdit(action.id, 'icon')}
                                className="cursor-pointer hover:opacity-70"
                                title="Click to edit icon"
                              >
                                {action.icon}
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Name - Inline editable */}
                            <div className="flex items-center gap-2 mb-1">
                              {isEditingThis && editingField === 'name' ? (
                                <input
                                  type="text"
                                  value={action.name}
                                  onChange={(e) => handleInlineEdit(action.id, 'name', e.target.value)}
                                  onBlur={finishInlineEdit}
                                  autoFocus
                                  className="flex-1 px-2 py-1 bg-[var(--color-cardBackground)] border border-[var(--color-primary)] rounded font-semibold"
                                />
                              ) : (
                                <span
                                  onClick={() => startInlineEdit(action.id, 'name')}
                                  className="font-semibold cursor-pointer hover:text-[var(--color-primary)]"
                                  title="Click to edit name"
                                >
                                  {action.name}
                                </span>
                              )}
                              {action.isCustom && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                  Custom
                                </span>
                              )}
                              {action.sourceBoss && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                                  {action.sourceBoss}
                                </span>
                              )}
                            </div>

                            {/* Time - Inline editable */}
                            <div className="text-sm text-[var(--color-textSecondary)] mb-2 flex items-center gap-2">
                              ⏱️
                              {isEditingThis && editingField === 'time' ? (
                                <input
                                  type="number"
                                  value={action.time}
                                  onChange={(e) => handleInlineEdit(action.id, 'time', parseInt(e.target.value) || 0)}
                                  onBlur={finishInlineEdit}
                                  autoFocus
                                  className="w-20 px-2 py-1 bg-[var(--color-cardBackground)] border border-[var(--color-primary)] rounded"
                                />
                              ) : (
                                <span
                                  onClick={() => startInlineEdit(action.id, 'time')}
                                  className="cursor-pointer hover:text-[var(--color-primary)]"
                                  title="Click to edit time"
                                >
                                  {formatTime(action.time)} ({action.time}s)
                                </span>
                              )}
                            </div>

                            {/* Damage - Inline editable */}
                            {action.unmitigatedDamage && (
                              <div className="text-sm text-[var(--color-textSecondary)] mb-2 flex items-center gap-2">
                                💥
                                {isEditingThis && editingField === 'unmitigatedDamage' ? (
                                  <input
                                    type="text"
                                    value={action.unmitigatedDamage}
                                    onChange={(e) => handleInlineEdit(action.id, 'unmitigatedDamage', e.target.value)}
                                    onBlur={finishInlineEdit}
                                    autoFocus
                                    className="flex-1 px-2 py-1 bg-[var(--color-cardBackground)] border border-[var(--color-primary)] rounded"
                                  />
                                ) : (
                                  <span
                                    onClick={() => startInlineEdit(action.id, 'unmitigatedDamage')}
                                    className="cursor-pointer hover:text-[var(--color-primary)]"
                                    title="Click to edit damage"
                                  >
                                    {action.unmitigatedDamage}
                                  </span>
                                )}
                              </div>
                            )}

                            {action.description && (
                              <p className="text-sm text-[var(--color-textSecondary)] m-0">
                                {action.description}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditAction(action)}
                              className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:bg-[var(--select-bg)] rounded transition-colors"
                              title="Edit in modal"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleRemoveAction(action.id)}
                              className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              title="Remove action"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

