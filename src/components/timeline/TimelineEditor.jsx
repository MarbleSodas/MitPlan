import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { createTimeline, getTimeline, updateTimeline } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { bossActionsMap } from '../../data/bosses/bossActions';
import { ArrowLeft, Plus, Trash2, Save, GripVertical } from 'lucide-react';
import CustomActionModal from './CustomActionModal';

const TimelineEditor = () => {
  const { timelineId } = useParams();
  const navigate = useNavigate();
  const { user, isAnonymousMode, anonymousUser } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timelineName, setTimelineName] = useState('');
  const [selectedBossId, setSelectedBossId] = useState('ketuduke');
  const [description, setDescription] = useState('');
  const [timelineActions, setTimelineActions] = useState([]);
  const [showCustomActionModal, setShowCustomActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState(null);

  const isEditMode = !!timelineId;

  // Load timeline if editing
  useEffect(() => {
    if (isEditMode) {
      loadTimeline();
    }
  }, [timelineId]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const timeline = await getTimeline(timelineId);
      setTimelineName(timeline.name);
      setSelectedBossId(timeline.bossId);
      setDescription(timeline.description || '');
      setTimelineActions(timeline.actions || []);
    } catch (error) {
      console.error('Error loading timeline:', error);
      addToast('Failed to load timeline', 'error');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Get available boss actions for selected boss
  const getAvailableBossActions = () => {
    const bossActions = bossActionsMap[selectedBossId] || [];
    return bossActions.map(action => ({
      ...action,
      isCustom: false,
      source: 'boss'
    }));
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

  // Handle editing custom action
  const handleEditAction = (action) => {
    if (action.isCustom) {
      setEditingAction(action);
      setShowCustomActionModal(true);
    }
  };

  // Sort actions by time
  const getSortedActions = () => {
    return [...timelineActions].sort((a, b) => a.time - b.time);
  };

  // Handle save
  const handleSave = async () => {
    if (!timelineName.trim()) {
      addToast('Please enter a timeline name', 'error');
      return;
    }

    if (timelineActions.length === 0) {
      addToast('Please add at least one boss action', 'error');
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
        bossId: selectedBossId,
        description: description,
        actions: timelineActions
      };

      if (isEditMode) {
        await updateTimeline(timelineId, timelineData);
        addToast('Timeline updated successfully', 'success');
      } else {
        const newTimeline = await createTimeline(userId, timelineData);
        addToast('Timeline created successfully', 'success');
        navigate(`/timeline/edit/${newTimeline.id}`);
      }
    } catch (error) {
      console.error('Error saving timeline:', error);
      addToast(error.message || 'Failed to save timeline', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle boss change
  const handleBossChange = (newBossId) => {
    if (timelineActions.length > 0) {
      const confirmed = window.confirm(
        'Changing the boss will remove all current actions. Are you sure?'
      );
      if (!confirmed) return;
      setTimelineActions([]);
    }
    setSelectedBossId(newBossId);
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
                  <label className="block text-sm font-medium mb-2">Boss</label>
                  <select
                    value={selectedBossId}
                    onChange={(e) => handleBossChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {bosses.map(boss => (
                      <option key={boss.id} value={boss.id}>
                        {boss.icon} {boss.name}
                      </option>
                    ))}
                  </select>
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
                  Boss Actions ({availableActions.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleAddBossAction(action)}
                      className="w-full text-left px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{action.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{action.name}</div>
                          <div className="text-xs text-[var(--color-textSecondary)]">
                            {formatTime(action.time)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
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
                  {sortedActions.map((action, index) => (
                    <div
                      key={action.id}
                      className="bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-4 hover:border-[var(--color-primary)] transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-2xl">{action.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{action.name}</span>
                            {action.isCustom && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-[var(--color-textSecondary)] mb-2">
                            ⏱️ {formatTime(action.time)} ({action.time}s)
                          </div>
                          {action.description && (
                            <p className="text-sm text-[var(--color-textSecondary)] m-0">
                              {action.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {action.isCustom && (
                            <button
                              onClick={() => handleEditAction(action)}
                              className="p-2 text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:bg-[var(--select-bg)] rounded transition-colors"
                              title="Edit action"
                            >
                              ✏️
                            </button>
                          )}
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
                  ))}
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

