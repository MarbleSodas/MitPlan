import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast';
import { getAllPublicTimelines, getAllUniqueBossTags, addToCollection, toggleLike, hasUserLiked, getCollectionTimelineIds } from '../../services/timelineService';
import { bosses } from '../../data/bosses/bossData';
import { ArrowLeft, Search, Filter, Copy, Eye, Plus, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const TimelineBrowser = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBossTags, setSelectedBossTags] = useState([]);
  const [sortBy, setSortBy] = useState('popularity');
  const [availableBossTags, setAvailableBossTags] = useState([]);
  const [showFilters, setShowFilters] = useState(true);
  const [likedTimelines, setLikedTimelines] = useState(new Set());
  const [likingInProgress, setLikingInProgress] = useState(new Set());
  const [collectionTimelineIds, setCollectionTimelineIds] = useState(new Set());
  const [addingToCollection, setAddingToCollection] = useState(new Set());

  useEffect(() => {
    loadTimelines();
    loadBossTags();
  }, [sortBy]);

  // Load liked status for all timelines when user changes or timelines load
  useEffect(() => {
    const loadLikedStatus = async () => {
      const userId = user?.uid;
      if (!userId) return;

      const liked = new Set();
      for (const timeline of timelines) {
        const isLiked = await hasUserLiked(timeline.id, userId);
        if (isLiked) {
          liked.add(timeline.id);
        }
      }
      setLikedTimelines(liked);
    };

    loadLikedStatus();
  }, [timelines, user]);

  // Load collection timeline IDs when user changes
  useEffect(() => {
    const loadCollectionIds = async () => {
      const userId = user?.uid;
      if (!userId) return;

      try {
        const ids = await getCollectionTimelineIds(userId);
        setCollectionTimelineIds(new Set(ids));
      } catch (error) {
        console.error('Error loading collection timeline IDs:', error);
      }
    };

    loadCollectionIds();
  }, [user]);

  const loadTimelines = async () => {
    setLoading(true);
    try {
      const publicTimelines = await getAllPublicTimelines(sortBy);
      setTimelines(publicTimelines);
    } catch (error) {
      console.error('Error loading timelines:', error);
      addToast({
        type: 'error',
        title: 'Failed to load timelines',
        message: 'Please try again.',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBossTags = async () => {
    try {
      const tags = await getAllUniqueBossTags();
      setAvailableBossTags(tags);
    } catch (error) {
      console.error('Error loading boss tags:', error);
    }
  };

  // Get boss info from boss data
  const getBossInfo = (bossTag) => {
    const boss = bosses.find(b => b.id === bossTag);
    return boss || { name: bossTag, icon: '📋' };
  };

  // Filter timelines based on search and selected boss tags
  const filteredTimelines = useMemo(() => {
    let filtered = timelines;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(timeline => 
        timeline.name?.toLowerCase().includes(search) ||
        timeline.description?.toLowerCase().includes(search)
      );
    }

    // Filter by selected boss tags
    if (selectedBossTags.length > 0) {
      filtered = filtered.filter(timeline => {
        const timelineTags = timeline.bossTags || (timeline.bossId ? [timeline.bossId] : []);
        return selectedBossTags.some(tag => timelineTags.includes(tag));
      });
    }

    return filtered;
  }, [timelines, searchTerm, selectedBossTags]);

  const handleToggleBossTag = (tag) => {
    setSelectedBossTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAddToCollection = async (timeline) => {
    const userId = user?.uid;
    if (!userId) {
      addToast({
        type: 'error',
        title: 'Authentication required',
        message: 'Please sign in to add timelines to your collection.',
        duration: 4000
      });
      return;
    }

    // Optimistic update: Add to collection immediately
    setCollectionTimelineIds(prev => new Set([...prev, timeline.id]));
    setAddingToCollection(prev => new Set([...prev, timeline.id]));

    try {
      await addToCollection(userId, timeline.id);
      addToast({
        type: 'success',
        title: 'Timeline added!',
        message: 'Timeline has been added to your collection.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error adding timeline:', error);

      // Revert optimistic update on error
      setCollectionTimelineIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(timeline.id);
        return newSet;
      });

      addToast({
        type: 'error',
        title: 'Failed to add timeline',
        message: error.message || 'Please try again.',
        duration: 4000
      });
    } finally {
      setAddingToCollection(prev => {
        const newSet = new Set(prev);
        newSet.delete(timeline.id);
        return newSet;
      });
    }
  };

  const handleViewTimeline = (timelineId) => {
    navigate(`/timeline/view/${timelineId}`);
  };

  const handleToggleLike = async (timelineId, e) => {
    e.stopPropagation(); // Prevent triggering parent click handlers

    if (!user) {
      addToast({
        type: 'info',
        title: 'Login Required',
        message: 'Please log in to like timelines.',
        duration: 3000
      });
      return;
    }

    const userId = user?.uid;
    if (!userId) return;

    // Prevent multiple simultaneous likes on the same timeline
    if (likingInProgress.has(timelineId)) return;

    try {
      setLikingInProgress(prev => new Set(prev).add(timelineId));

      const result = await toggleLike(timelineId, userId);

      // Update local state
      setLikedTimelines(prev => {
        const newSet = new Set(prev);
        if (result.liked) {
          newSet.add(timelineId);
        } else {
          newSet.delete(timelineId);
        }
        return newSet;
      });

      // Update timeline like count in local state
      setTimelines(prev => prev.map(t =>
        t.id === timelineId
          ? { ...t, likeCount: result.likeCount }
          : t
      ));

    } catch (error) {
      console.error('Error toggling like:', error);
      addToast({
        type: 'error',
        title: 'Failed to update like',
        message: 'Please try again.',
        duration: 3000
      });
    } finally {
      setLikingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(timelineId);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold m-0">Browse Community Timelines</h1>
                <p className="m-0 mt-1 max-w-2xl text-sm text-muted-foreground">
                  Discover community-created timelines, collect favorites, and start your own community copy
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/timeline/create')}
                className="hidden md:inline-flex"
              >
                Open Timeline Hub
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <Filter size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0`}>
            <div className="sticky top-24 rounded-lg border border-border bg-card p-4">
              <h2 className="text-lg font-semibold mb-4">Filters</h2>
              
              {/* Sort By */}
              <div className="mb-6">
                <Label className="block text-sm font-medium mb-2">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popularity">Popularity</SelectItem>
                    <SelectItem value="recent">Recently Updated</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="actions">Most Actions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Boss Tags Filter */}
              <div>
                <Label className="block text-sm font-medium mb-2">Boss Tags</Label>
                <div className="max-h-[18rem] space-y-2 overflow-y-auto pr-1 md:max-h-96">
                  {availableBossTags.map(tag => {
                    const bossInfo = getBossInfo(tag);
                    const isSelected = selectedBossTags.includes(tag);
                    return (
                      <Button
                        key={tag}
                        variant={isSelected ? 'secondary' : 'outline'}
                        onClick={() => handleToggleBossTag(tag)}
                        className={`w-full justify-start ${isSelected ? 'font-semibold border-primary' : ''}`}
                      >
                        <span className="mr-2">{bossInfo.icon}</span>
                        {bossInfo.name}
                      </Button>
                    );
                  })}
                </div>
                {selectedBossTags.length > 0 && (
                  <Button
                    variant="link"
                    onClick={() => setSelectedBossTags([])}
                    className="mt-2 p-0 h-auto text-sm"
                  >
                    Clear all filters
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  type="text"
                  placeholder="Search timelines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredTimelines.length} of {timelines.length} timelines
            </div>

            {/* Timeline Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading timelines...</p>
              </div>
            ) : filteredTimelines.length === 0 ? (
              <div className="rounded-lg border border-border bg-card py-12 text-center">
                <p className="text-muted-foreground">
                  {searchTerm || selectedBossTags.length > 0
                    ? 'No timelines match your search criteria.'
                    : 'No community timelines available yet.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {filteredTimelines.map(timeline => {
                  const timelineTags = timeline.bossTags || (timeline.bossId ? [timeline.bossId] : []);
                  return (
                    <div
                      key={timeline.id}
                      className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/35"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-1 truncate">{timeline.name}</h3>
                          {timeline.official && (
                            <span className="inline-block px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded mb-2">
                              Official
                            </span>
                          )}
                        </div>
                      </div>

                      {timeline.description && (
                        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                          {timeline.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-3">
                        {timelineTags.map(tag => {
                          const bossInfo = getBossInfo(tag);
                          return (
                            <span
                              key={tag}
                              className="rounded-full border border-border bg-background px-2 py-1 text-xs"
                            >
                              {bossInfo.icon} {bossInfo.name}
                            </span>
                          );
                        })}
                      </div>

                      <div className="mb-3 text-sm text-muted-foreground">
                        {timeline.actions?.length || 0} actions
                      </div>

                      {/* Like Button Row - Only for non-official timelines */}
                      {!timeline.official && (
                        <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleToggleLike(timeline.id, e)}
                            disabled={likingInProgress.has(timeline.id)}
                            className={`flex items-center gap-1.5 ${
                              likedTimelines.has(timeline.id)
                                ? 'bg-red-500/10 border-red-500/50 text-red-500 hover:bg-red-500/20'
                                : 'hover:border-red-500/30 hover:text-red-500'
                            }`}
                            title={likedTimelines.has(timeline.id) ? 'Unlike this timeline' : 'Like this timeline'}
                          >
                            <Heart
                              size={14}
                              fill={likedTimelines.has(timeline.id) ? 'currentColor' : 'none'}
                            />
                            <span className="font-medium">{timeline.likeCount || 0}</span>
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {(timeline.likeCount || 0) === 1 ? '1 player likes this' : `${timeline.likeCount || 0} players like this`}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleViewTimeline(timeline.id)}
                          className="min-w-[7rem] flex-1"
                        >
                          <Eye size={16} />
                          View
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/timeline/create/editor?sourceTimelineId=${encodeURIComponent(timeline.id)}`)}
                          className="min-w-[9rem] flex-1"
                        >
                          <Copy size={16} />
                          Start From This
                        </Button>
                        <Button
                          variant={timeline.official || collectionTimelineIds.has(timeline.id) ? 'outline' : 'default'}
                          onClick={() => handleAddToCollection(timeline)}
                          disabled={timeline.official || collectionTimelineIds.has(timeline.id) || addingToCollection.has(timeline.id)}
                          className={`min-w-[10rem] flex-1 ${
                            timeline.official || collectionTimelineIds.has(timeline.id)
                              ? 'opacity-50'
                              : ''
                          } ${addingToCollection.has(timeline.id) ? 'opacity-70' : ''}`}
                          title={
                            timeline.official
                              ? 'Official timelines cannot be added to collection'
                              : collectionTimelineIds.has(timeline.id)
                              ? 'Already in your collection'
                              : 'Add to your collection'
                          }
                        >
                          <Plus size={16} />
                          {collectionTimelineIds.has(timeline.id) ? 'In Collection' : 'Save to Collection'}
                        </Button>
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
  );
};

export default TimelineBrowser;

