import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTimelines } from '../../services/timelineService';
import { Plus, Clock, Tag } from 'lucide-react';
import { bosses } from '../../data/bosses/bossData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const CustomTimelineSelectionModal = ({ onClose, onSelectTimeline }) => {
  const navigate = useNavigate();
  const { user, isAnonymousMode, anonymousUser } = useAuth();
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeline, setSelectedTimeline] = useState(null);

  useEffect(() => {
    loadUserTimelines();
  }, []);

  const loadUserTimelines = async () => {
    setLoading(true);
    try {
      const userId = isAnonymousMode ? anonymousUser?.id : user?.uid;
      if (!userId) {
        console.error('No user ID available');
        setTimelines([]);
        return;
      }

      const userTimelines = await getUserTimelines(userId);
      const customTimelines = userTimelines.filter(t => !t.official);
      setTimelines(customTimelines);
    } catch (error) {
      console.error('Error loading user timelines:', error);
      setTimelines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTimelineClick = (timeline) => {
    setSelectedTimeline(timeline);
    setTimeout(() => {
      onSelectTimeline(timeline);
    }, 150);
  };

  const handleCreateNewTimeline = () => {
    navigate('/timeline/create');
    onClose();
  };

  const getBossInfo = (timeline) => {
    if (!timeline.bossId && (!timeline.bossTags || timeline.bossTags.length === 0)) {
      return null;
    }
    const bossId = timeline.bossId || timeline.bossTags?.[0];
    return bosses.find(b => b.id === bossId);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Select Custom Timeline
          </DialogTitle>
          <DialogDescription>
            Choose a timeline to create a new plan, or create a new timeline
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your timelines...</p>
          </div>
        ) : (
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-6 py-4">
            <div
              onClick={handleCreateNewTimeline}
              className="bg-card border-2 border-dashed border-border rounded-xl p-6 cursor-pointer transition-all shadow-sm hover:border-primary hover:-translate-y-0.5 hover:shadow-lg active:-translate-y-0.5 flex flex-col items-center justify-center min-h-[200px]"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Plus size={32} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Create New Timeline
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Build a custom timeline from scratch
              </p>
            </div>

            {timelines.map(timeline => {
              const bossInfo = getBossInfo(timeline);
              const level = timeline.bossMetadata?.level || bossInfo?.level || 100;
              
              return (
                <div
                  key={timeline.id}
                  onClick={() => handleTimelineClick(timeline)}
                  className={cn(
                    "bg-card border-2 border-border rounded-xl p-6 cursor-pointer transition-all shadow-sm hover:border-primary hover:-translate-y-0.5 hover:shadow-lg active:-translate-y-0.5 flex flex-col min-h-[200px]",
                    selectedTimeline?.id === timeline.id && "opacity-70 scale-[0.98]"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                        {timeline.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                          Level {level}
                        </span>
                        {timeline.isOwned && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                            Owned
                          </span>
                        )}
                        {timeline.inCollection && !timeline.isOwned && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            Collection
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {bossInfo && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                      <span className="text-xl">{bossInfo.icon}</span>
                      <span>{bossInfo.name}</span>
                    </div>
                  )}

                  {timeline.bossTags && timeline.bossTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {timeline.bossTags.slice(0, 3).map((tag, index) => {
                        const boss = bosses.find(b => b.id === tag);
                        return (
                          <span 
                            key={index}
                            className="px-2 py-0.5 bg-secondary text-muted-foreground rounded text-xs flex items-center gap-1"
                          >
                            <Tag size={10} />
                            {boss ? boss.name : tag}
                          </span>
                        );
                      })}
                      {timeline.bossTags.length > 3 && (
                        <span className="px-2 py-0.5 bg-secondary text-muted-foreground rounded text-xs">
                          +{timeline.bossTags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {timeline.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                      {timeline.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{timeline.actions?.length || 0} actions</span>
                    </div>
                    {timeline.updatedAt && (
                      <span>{formatDate(timeline.updatedAt)}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {timelines.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p className="mb-4">You don't have any custom timelines yet.</p>
                <p className="text-sm">Click the "+" card to create your first timeline!</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomTimelineSelectionModal;
