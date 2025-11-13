import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTimelines } from '../../services/timelineService';
import { Plus, Clock, Tag } from 'lucide-react';
import { bosses } from '../../data/bosses/bossData';

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
      // Filter to only show non-official timelines (custom timelines)
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
    // Small delay for visual feedback before proceeding
    setTimeout(() => {
      onSelectTimeline(timeline);
    }, 150);
  };

  const handleCreateNewTimeline = () => {
    // Navigate to timeline creation page
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
    <div 
      onClick={onClose} 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000]"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white dark:bg-neutral-900 p-8 rounded-xl max-w-5xl w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Select Custom Timeline
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-base">
              Choose a timeline to create a new plan, or create a new timeline
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-neutral-800 text-2xl"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading your timelines...</p>
          </div>
        ) : (
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))] gap-6">
            {/* Create New Timeline Card */}
            <div
              onClick={handleCreateNewTimeline}
              className="bg-white dark:bg-neutral-900 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 cursor-pointer transition-all shadow-sm hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-lg active:-translate-y-0.5 flex flex-col items-center justify-center min-h-[200px]"
            >
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                <Plus size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Create New Timeline
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Build a custom timeline from scratch
              </p>
            </div>

            {/* Existing Timeline Cards */}
            {timelines.map(timeline => {
              const bossInfo = getBossInfo(timeline);
              const level = timeline.bossMetadata?.level || bossInfo?.level || 100;
              
              return (
                <div
                  key={timeline.id}
                  onClick={() => handleTimelineClick(timeline)}
                  className="bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6 cursor-pointer transition-all shadow-sm hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-lg active:-translate-y-0.5 flex flex-col min-h-[200px]"
                  style={{
                    opacity: selectedTimeline?.id === timeline.id ? 0.7 : 1,
                    transform: selectedTimeline?.id === timeline.id ? 'scale(0.98)' : undefined
                  }}
                >
                  {/* Timeline Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
                        {timeline.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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

                  {/* Boss Info */}
                  {bossInfo && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-xl">{bossInfo.icon}</span>
                      <span>{bossInfo.name}</span>
                    </div>
                  )}

                  {/* Boss Tags */}
                  {timeline.bossTags && timeline.bossTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {timeline.bossTags.slice(0, 3).map((tag, index) => {
                        const boss = bosses.find(b => b.id === tag);
                        return (
                          <span 
                            key={index}
                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs flex items-center gap-1"
                          >
                            <Tag size={10} />
                            {boss ? boss.name : tag}
                          </span>
                        );
                      })}
                      {timeline.bossTags.length > 3 && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
                          +{timeline.bossTags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {timeline.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 flex-1">
                      {timeline.description}
                    </p>
                  )}

                  {/* Footer Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
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

            {/* Empty State */}
            {timelines.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="mb-4">You don't have any custom timelines yet.</p>
                <p className="text-sm">Click the "+" card to create your first timeline!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTimelineSelectionModal;

