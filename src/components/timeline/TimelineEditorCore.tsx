import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  Globe,
  Plus,
  Save,
  Settings,
  Share2,
  X,
} from 'lucide-react';
import type { BossAction, BossActionTemplate, PlanTimelineLayout, Timeline } from '../../types';
import { syncBossActionMetadataWithClassification } from '../../utils/boss/bossActionUtils';
import { applyEditedTimelineActions } from '../../utils/timeline/adaptiveTimelineUtils';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CollaborationStatusNotice from '../collaboration/CollaborationStatusNotice';
import PresenceSurface from '../collaboration/PresenceSurface';
import PresenceTarget from '../collaboration/PresenceTarget';
import SectionPresencePill from '../collaboration/SectionPresencePill';
import CustomActionModal from './CustomActionModal';
import BossActionsLibrary from './BossActionsLibrary';
import CompactTimelineVisualization from './CompactTimelineVisualization';
import TimelineSettingsDrawer from './TimelineSettingsDrawer';
import TimelineActionCard from './TimelineActionCard';

export type TimelineEditorMode = 'plan' | 'community';

type TimelineSeedRecord = Partial<Timeline> & Partial<PlanTimelineLayout> & {
  name?: string;
};

type TimelineEditorSavePayload = {
  name: string;
  description: string;
  bossTags: string[];
  level: number;
  actions: BossAction[];
  editedTimeline: Timeline;
};

type TimelineEditorPublishPayload = {
  editedTimeline: Timeline;
  details: {
    name: string;
    description: string;
    visibility: 'private' | 'public';
  };
};

interface TimelineEditorCoreProps {
  mode: TimelineEditorMode;
  loading?: boolean;
  readOnly?: boolean;
  recordKey: string;
  sourceRecord?: TimelineSeedRecord | null;
  title?: string;
  backLabel?: string;
  readOnlyMessage?: string | null;
  onBack: () => void;
  onSave: (payload: TimelineEditorSavePayload) => Promise<void>;
  onPublish?: (payload: TimelineEditorPublishPayload) => Promise<void>;
  canEditBossTags?: boolean;
  lockBossTagsMessage?: string;
}

const SortableActionCard = ({
  action,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onDuplicate,
  onQuickTimeEdit,
}) => {
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

export function buildEditedTimelineRecord({
  baseRecord,
  timelineActions,
  normalizeTimelineAction,
  description,
  bossTags,
  level,
  fixedBossId,
}: {
  baseRecord: TimelineSeedRecord | null;
  timelineActions: BossAction[];
  normalizeTimelineAction: (action: BossAction) => BossAction;
  description: string;
  bossTags: string[];
  level: number;
  fixedBossId?: string | null;
}): Timeline {
  const normalizedActions = timelineActions.map(normalizeTimelineAction);
  const sourceRecord = baseRecord || {};
  const nextBossTags = fixedBossId
    ? (sourceRecord.bossTags || (fixedBossId ? [fixedBossId] : []))
    : bossTags;
  const nextBossId = fixedBossId || nextBossTags[0] || sourceRecord.bossId || null;
  const nextBossMetadata = {
    ...(sourceRecord.bossMetadata || {}),
    level,
  };

  return applyEditedTimelineActions(
    {
      ...sourceRecord,
      bossId: nextBossId,
      bossTags: nextBossTags,
      bossMetadata: nextBossMetadata,
      description,
      guideSources: sourceRecord.guideSources || [],
      analysisSources: sourceRecord.analysisSources || [],
      phases: sourceRecord.phases || [],
      adaptiveModel: sourceRecord.adaptiveModel || null,
      resolution: sourceRecord.resolution || null,
      format: sourceRecord.format,
      schemaVersion: sourceRecord.schemaVersion,
    },
    normalizedActions
  );
}

const TimelineEditorCore = ({
  mode,
  loading = false,
  readOnly = false,
  recordKey,
  sourceRecord = null,
  title,
  backLabel = 'Back',
  readOnlyMessage = null,
  onBack,
  onSave,
  onPublish,
  canEditBossTags = mode === 'community',
  lockBossTagsMessage = 'Encounter identity is locked for plan timelines.',
}: TimelineEditorCoreProps) => {
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [timelineName, setTimelineName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [bossTags, setBossTags] = useState<string[]>([]);
  const [newBossTag, setNewBossTag] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(100);
  const [timelineActions, setTimelineActions] = useState<BossAction[]>([]);
  const [baseRecord, setBaseRecord] = useState<TimelineSeedRecord | null>(null);
  const [showCustomActionModal, setShowCustomActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<BossAction | null>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [pendingBossActionTemplate, setPendingBossActionTemplate] = useState<BossActionTemplate | null>(null);
  const [pendingBossActionTime, setPendingBossActionTime] = useState('');
  const [pendingBossActionTimeError, setPendingBossActionTimeError] = useState('');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishName, setPublishName] = useState('');
  const [publishDescription, setPublishDescription] = useState('');
  const [publishVisibility, setPublishVisibility] = useState<'private' | 'public'>('private');

  const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [filteredTagSuggestions, setFilteredTagSuggestions] = useState<Array<{ id: string; name: string; type: string }>>([]);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const actionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const initializedRecordRef = useRef<string | null>(null);

  const normalizeTimelineAction = useCallback((action: BossAction) => {
    return syncBossActionMetadataWithClassification({
      ...action,
      source: action.source || (action.isCustom ? 'custom' : 'boss'),
    });
  }, []);

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

  const loadAllExistingTags = useCallback(async () => {
    if (!canEditBossTags) {
      setAllExistingTags([]);
      return;
    }

    try {
      const { getAllUniqueBossTags } = await import('../../services/timelineService');
      const tags = await getAllUniqueBossTags();
      setAllExistingTags(tags);
    } catch (error) {
      console.error('Error loading existing tags:', error);
    }
  }, [canEditBossTags]);

  useEffect(() => {
    loadAllExistingTags();
  }, [loadAllExistingTags]);

  useEffect(() => {
    const shouldInitializeFromLoadedSource = Boolean(sourceRecord && !baseRecord);
    if (loading || (initializedRecordRef.current === recordKey && !shouldInitializeFromLoadedSource)) {
      return;
    }

    const nextBaseRecord = sourceRecord || null;
    const nextBossTags = nextBaseRecord?.bossTags || (nextBaseRecord?.bossId ? [nextBaseRecord.bossId] : []);
    const nextLevel = nextBaseRecord?.bossMetadata?.level || 100;
    const nextActions = (nextBaseRecord?.actions || []).map(normalizeTimelineAction);

    setBaseRecord(nextBaseRecord);
    setTimelineName(nextBaseRecord?.name || '');
    setTempName(nextBaseRecord?.name || '');
    setBossTags(nextBossTags);
    setDescription(nextBaseRecord?.description || '');
    setLevel(nextLevel);
    setTimelineActions(nextActions);
    setExpandedActionId(null);
    setSelectedActionId(null);
    setShowSettingsDrawer(false);
    setShowCustomActionModal(false);
    setEditingAction(null);
    setShowPublishDialog(false);
    setPendingBossActionTemplate(null);
    setPendingBossActionTime('');
    setPendingBossActionTimeError('');
    initializedRecordRef.current = recordKey;
  }, [baseRecord, loading, normalizeTimelineAction, recordKey, sourceRecord]);

  useEffect(() => {
    if (!canEditBossTags || !newBossTag.trim()) {
      setFilteredTagSuggestions([]);
      setShowTagSuggestions(false);
      return;
    }

    const searchTerm = newBossTag.toLowerCase();
    import('../../data/bosses/bossData').then(({ bosses }) => {
      const bossOptions = bosses.map((boss) => ({ id: boss.id, name: boss.name, type: 'boss' }));
      const existingTagOptions = allExistingTags
        .filter((tag) => !bosses.find((boss) => boss.id === tag))
        .map((tag) => ({ id: tag, name: tag, type: 'custom' }));

      const filtered = [...bossOptions, ...existingTagOptions].filter((option) =>
        option.name.toLowerCase().includes(searchTerm) && !bossTags.includes(option.id)
      );

      setFilteredTagSuggestions(filtered);
      setShowTagSuggestions(filtered.length > 0);
    });
  }, [allExistingTags, bossTags, canEditBossTags, newBossTag]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (!saving && !readOnly) {
          void handleSave();
        }
      }

      if (event.key === 'Escape') {
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
  }, [readOnly, saving, showCustomActionModal, showSettingsDrawer]);

  useEffect(() => {
    if (pendingBossActionTimeError && pendingBossActionTime.trim()) {
      setPendingBossActionTimeError('');
    }
  }, [pendingBossActionTime, pendingBossActionTimeError]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setTimelineActions((previousActions) => {
      const currentOrder = [...previousActions].sort((left, right) => left.time - right.time);
      const oldIndex = currentOrder.findIndex((action) => action.id === active.id);
      const newIndex = currentOrder.findIndex((action) => action.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return previousActions;
      }

      const reorderedActions = [...currentOrder];
      const [movedAction] = reorderedActions.splice(oldIndex, 1);
      reorderedActions.splice(newIndex, 0, movedAction);
      return reorderedActions;
    });
  }, []);

  const handleAddBossTag = useCallback((tagToAdd: string | null = null) => {
    if (!canEditBossTags) {
      return;
    }

    const tag = (tagToAdd || newBossTag).trim();
    if (!tag || bossTags.includes(tag)) {
      return;
    }

    setBossTags((previousTags) => [...previousTags, tag]);
    setNewBossTag('');
    setShowTagSuggestions(false);
    void loadAllExistingTags();
  }, [bossTags, canEditBossTags, loadAllExistingTags, newBossTag]);

  const handleSelectTagSuggestion = useCallback((tagId: string) => {
    handleAddBossTag(tagId);
  }, [handleAddBossTag]);

  const handleRemoveBossTag = useCallback((tagToRemove: string) => {
    if (!canEditBossTags) {
      return;
    }

    setBossTags((previousTags) => previousTags.filter((tag) => tag !== tagToRemove));
  }, [canEditBossTags]);

  const handleAddBossAction = useCallback((actionTemplate: BossActionTemplate) => {
    setPendingBossActionTemplate(actionTemplate);
    setPendingBossActionTime('');
    setPendingBossActionTimeError('');
  }, []);

  const closePendingBossActionDialog = useCallback(() => {
    setPendingBossActionTemplate(null);
    setPendingBossActionTime('');
    setPendingBossActionTimeError('');
  }, []);

  const handleConfirmBossActionTime = useCallback(() => {
    if (!pendingBossActionTemplate) {
      return;
    }

    const trimmedTime = pendingBossActionTime.trim();
    if (!trimmedTime) {
      setPendingBossActionTimeError('A time is required before adding this action.');
      return;
    }

    const parsedTime = Number.parseInt(trimmedTime, 10);
    if (!Number.isFinite(parsedTime) || parsedTime < 0) {
      setPendingBossActionTimeError('Time must be a whole number that is 0 or greater.');
      return;
    }

    const {
      occurrenceCount: _occurrenceCount,
      libraryId: _libraryId,
      ...templateAction
    } = pendingBossActionTemplate;

    const newAction = normalizeTimelineAction({
      ...templateAction,
      id: `${templateAction.id}_${Date.now()}`,
      time: parsedTime,
      isCustom: false,
      source: 'boss',
    });

    setTimelineActions((previousActions) => [...previousActions, newAction]);
    toast.success('Action added', {
      description: `Added "${pendingBossActionTemplate.name}" to timeline`,
    });
    closePendingBossActionDialog();
  }, [closePendingBossActionDialog, normalizeTimelineAction, pendingBossActionTemplate, pendingBossActionTime]);

  const handleAddCustomAction = useCallback((customAction: BossAction) => {
    if (editingAction) {
      const updatedAction = normalizeTimelineAction({
        ...editingAction,
        ...customAction,
        id: editingAction.id,
        isCustom: editingAction.isCustom ?? false,
        source: editingAction.source || (editingAction.isCustom ? 'custom' : 'boss'),
      });

      setTimelineActions((previousActions) => previousActions.map((action) =>
        action.id === editingAction.id ? updatedAction : action
      ));
      setEditingAction(null);
    } else {
      const newAction = normalizeTimelineAction({
        ...customAction,
        id: `custom_${Date.now()}`,
        isCustom: true,
        source: 'custom',
      });
      setTimelineActions((previousActions) => [...previousActions, newAction]);
    }

    setShowCustomActionModal(false);
  }, [editingAction, normalizeTimelineAction]);

  const handleRemoveAction = useCallback((actionId: string) => {
    setTimelineActions((previousActions) => previousActions.filter((action) => action.id !== actionId));
  }, []);

  const handleEditAction = useCallback((action: BossAction) => {
    setEditingAction(action);
    setShowCustomActionModal(true);
  }, []);

  const handleDuplicateAction = useCallback((action: BossAction) => {
    const duplicatedAction = normalizeTimelineAction({
      ...action,
      id: `${action.id}_copy_${Date.now()}`,
      time: action.time + 5,
    });

    setTimelineActions((previousActions) => [...previousActions, duplicatedAction]);
    toast.success('Action duplicated', { description: `Duplicated "${action.name}"` });
  }, [normalizeTimelineAction]);

  const handleQuickTimeEdit = useCallback((actionId: string, newTime: number) => {
    setTimelineActions((previousActions) => previousActions.map((action) =>
      action.id === actionId ? { ...action, time: newTime } : action
    ));
  }, []);

  const handleToggleExpand = useCallback((actionId: string) => {
    setExpandedActionId((previousId) => previousId === actionId ? null : actionId);
  }, []);

  const handleActionClick = useCallback((actionId: string) => {
    setSelectedActionId(actionId);
    setExpandedActionId(actionId);
    actionRefs.current[actionId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  const startNameEdit = useCallback(() => {
    if (readOnly || mode !== 'community') {
      return;
    }

    setTempName(timelineName);
    setIsEditingName(true);
  }, [mode, readOnly, timelineName]);

  const saveName = useCallback(() => {
    if (tempName.trim()) {
      setTimelineName(tempName.trim());
    }
    setIsEditingName(false);
  }, [tempName]);

  const cancelNameEdit = useCallback(() => {
    setTempName(timelineName);
    setIsEditingName(false);
  }, [timelineName]);

  const handleNameKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      saveName();
    } else if (event.key === 'Escape') {
      cancelNameEdit();
    }
  }, [cancelNameEdit, saveName]);

  const sortedActions = [...timelineActions].sort((left, right) => left.time - right.time);

  const createSavePayload = useCallback(() => {
    const editedTimeline = buildEditedTimelineRecord({
      baseRecord,
      timelineActions,
      normalizeTimelineAction,
      description,
      bossTags,
      level,
      fixedBossId: mode === 'plan' ? (baseRecord?.bossId || null) : null,
    });

    return {
      name: timelineName.trim(),
      description,
      bossTags: editedTimeline.bossTags || [],
      level,
      actions: editedTimeline.actions || [],
      editedTimeline,
    };
  }, [baseRecord, bossTags, description, level, mode, normalizeTimelineAction, timelineActions, timelineName]);

  const validateDraft = useCallback((requireName: boolean) => {
    if (requireName && !timelineName.trim()) {
      toast.error('Timeline name required', { description: 'Please enter a timeline name.' });
      return false;
    }

    if (timelineActions.length === 0) {
      toast.error('Boss actions required', { description: 'Please add at least one boss action.' });
      return false;
    }

    return true;
  }, [timelineActions.length, timelineName]);

  const handleSave = useCallback(async () => {
    if (readOnly) {
      return;
    }

    if (!validateDraft(mode === 'community')) {
      return;
    }

    setSaving(true);
    try {
      await onSave(createSavePayload());
    } finally {
      setSaving(false);
    }
  }, [createSavePayload, mode, onSave, readOnly, validateDraft]);

  const openPublishDialog = useCallback(() => {
    const payload = createSavePayload();
    const fallbackName = mode === 'plan'
      ? `${title || 'Plan'} Community Timeline`
      : timelineName || 'Community Timeline';

    setPublishName(fallbackName);
    setPublishDescription(payload.description || '');
    setPublishVisibility('private');
    setShowPublishDialog(true);
  }, [createSavePayload, mode, timelineName, title]);

  const handlePublish = useCallback(async () => {
    if (!onPublish || readOnly) {
      return;
    }

    if (!validateDraft(false)) {
      return;
    }

    if (!publishName.trim()) {
      toast.error('Community timeline name required', {
        description: 'Please choose a name before publishing.',
      });
      return;
    }

    setPublishing(true);
    try {
      await onPublish({
        editedTimeline: createSavePayload().editedTimeline,
        details: {
          name: publishName.trim(),
          description: publishDescription.trim(),
          visibility: publishVisibility,
        },
      });
      setShowPublishDialog(false);
    } finally {
      setPublishing(false);
    }
  }, [
    createSavePayload,
    onPublish,
    publishDescription,
    publishName,
    publishVisibility,
    readOnly,
    validateDraft,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Button
                onClick={onBack}
                variant="outline"
                size="icon"
                title={backLabel}
              >
                <ArrowLeft size={20} />
              </Button>

              {mode === 'community' ? (
                isEditingName ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <PresenceTarget
                      target={{ surface: 'timeline', entityType: 'timelineMeta', entityId: 'timeline', field: 'name' }}
                      className="flex-1 rounded-lg"
                      showIndicator={false}
                      publishFocus={true}
                      focusInteraction="editing"
                    >
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={tempName}
                        onChange={(event) => setTempName(event.target.value)}
                        onKeyDown={handleNameKeyDown}
                        onBlur={saveName}
                        placeholder="Timeline name..."
                        className="flex-1 min-w-0 px-3 py-1.5 text-xl font-bold bg-background border border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </PresenceTarget>
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
                  <PresenceTarget
                    target={{ surface: 'timeline', entityType: 'timelineMeta', entityId: 'timeline', field: 'name' }}
                    className="rounded-md"
                    publishHover={true}
                  >
                    <button
                      onClick={startNameEdit}
                      className="text-xl font-bold truncate hover:text-primary transition-colors text-left"
                      title={readOnly ? timelineName || 'Timeline name' : 'Click to edit name'}
                    >
                      {timelineName || 'Untitled Timeline'}
                    </button>
                  </PresenceTarget>
                )
              ) : (
                <div className="min-w-0">
                  <h1 className="text-xl font-bold truncate">{title || 'Plan Timeline'}</h1>
                  <p className="text-sm text-muted-foreground truncate">
                    Edit this plan's local timeline layout directly. Publishing creates a separate community copy.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowSettingsDrawer(true)}
                title="Timeline settings"
                disabled={readOnly}
              >
                <Settings size={20} />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              {onPublish && !readOnly && (
                <Button variant="outline" onClick={openPublishDialog}>
                  <Share2 size={18} />
                  <span className="hidden sm:inline">Save as Community Timeline</span>
                </Button>
              )}
              <Button
                onClick={() => void handleSave()}
                disabled={saving || readOnly}
              >
                <Save size={18} />
                <span className="hidden sm:inline">
                  {saving ? 'Saving...' : mode === 'plan' ? 'Save to Plan' : 'Save'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 md:px-6 lg:px-8 space-y-3">
        {readOnly && readOnlyMessage && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
            {readOnlyMessage}
          </div>
        )}
        <CollaborationStatusNotice />
      </div>

      <div className="flex-1 min-h-0 px-4 pb-6 md:px-6 lg:px-8">
        <div className="mx-auto flex min-h-0 max-w-[1800px] flex-col gap-4 lg:h-full lg:flex-row">
          <div
            data-testid="timeline-add-actions-rail"
            className="w-full flex-shrink-0 lg:w-96 lg:sticky lg:top-[calc(3rem+1px)] lg:self-start"
          >
            <div className="flex min-h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:max-h-[calc(100vh-12rem)]">
              <div className="border-b border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Add Actions</h2>
                  <SectionPresencePill surface="timeline" section="library" />
                </div>
                <Button
                  onClick={() => {
                    setEditingAction(null);
                    setShowCustomActionModal(true);
                  }}
                  className="w-full"
                  disabled={readOnly}
                >
                  <Plus size={18} />
                  Create Custom Action
                </Button>
              </div>

              <div className="flex flex-1 min-h-0 flex-col p-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Boss Action Templates
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Choose a reusable boss action template, then enter its timeline time before adding it.
                </p>
                <PresenceSurface
                  surface="timeline"
                  panel="library"
                  section="library"
                  hideRemoteCursorsOnMobile={true}
                  className="flex-1 min-h-0 overflow-hidden"
                >
                  <BossActionsLibrary onSelectAction={handleAddBossAction} />
                </PresenceSurface>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-card p-4">
              <CompactTimelineVisualization
                actions={sortedActions}
                onActionClick={handleActionClick}
                selectedActionId={selectedActionId}
              />
            </div>

            <PresenceSurface
              surface="timeline"
              panel="timeline"
              section="timeline"
              hideRemoteCursorsOnMobile={true}
              className="flex flex-1 min-h-0 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Timeline Actions</h2>
                    <SectionPresencePill surface="timeline" section="timeline" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {sortedActions.length} action{sortedActions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {sortedActions.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <div className="mb-4 text-4xl">📋</div>
                    <p className="mb-2 text-lg font-medium">No actions yet</p>
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
                      items={sortedActions.map((action) => action.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {sortedActions.map((action) => (
                          <div
                            key={action.id}
                            ref={(element) => {
                              actionRefs.current[action.id] = element;
                            }}
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
            </PresenceSurface>
          </div>
        </div>
      </div>

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
        canEditBossTags={canEditBossTags}
        lockBossTagsMessage={lockBossTagsMessage}
      />

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

      <Dialog
        open={Boolean(pendingBossActionTemplate)}
        onOpenChange={(open) => {
          if (!open) {
            closePendingBossActionDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Boss Action Time</DialogTitle>
            <DialogDescription>
              Add <span className="font-medium text-foreground">{pendingBossActionTemplate?.name}</span> to the timeline with a required time in seconds.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="boss-action-time">Time (seconds)</Label>
            <Input
              id="boss-action-time"
              type="number"
              min="0"
              step="1"
              value={pendingBossActionTime}
              onChange={(event) => setPendingBossActionTime(event.target.value)}
              placeholder="e.g. 90"
              className={cn(pendingBossActionTimeError && 'border-destructive')}
              autoFocus
            />
            {pendingBossActionTimeError && (
              <p className="text-sm text-destructive">{pendingBossActionTimeError}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closePendingBossActionDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmBossActionTime}>
              Add Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save as Community Timeline</DialogTitle>
            <DialogDescription>
              Publish the current edited plan timeline as a new community timeline. This will not change the plan's local timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publish-name">Community Timeline Name</Label>
              <Input
                id="publish-name"
                value={publishName}
                onChange={(event) => setPublishName(event.target.value)}
                placeholder="e.g. Clean PF Route"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publish-description">Description</Label>
              <Input
                id="publish-description"
                value={publishDescription}
                onChange={(event) => setPublishDescription(event.target.value)}
                placeholder="What makes this route useful?"
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={publishVisibility}
                onValueChange={(value) => setPublishVisibility(value as 'private' | 'public')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe size={14} />
                      Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)} disabled={publishing}>
              Cancel
            </Button>
            <Button onClick={() => void handlePublish()} disabled={publishing}>
              {publishing ? 'Publishing...' : 'Create Community Timeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimelineEditorCore;
