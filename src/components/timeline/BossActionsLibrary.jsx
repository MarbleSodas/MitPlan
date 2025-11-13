import { useState, useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { bossActionsLibrary, categorizedActions, libraryUtils } from '../../data/bossActionsLibrary';
import { INPUT, SELECT } from '../../styles/designSystem';

const BossActionsLibrary = ({ onSelectAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDamageType, setSelectedDamageType] = useState('all');
  const [selectedImportance, setSelectedImportance] = useState('all');

  // Filter actions based on search and filters
  const filteredActions = useMemo(() => {
    let actions = bossActionsLibrary;

    // Apply category filter
    if (selectedCategory !== 'all') {
      actions = categorizedActions[selectedCategory] || [];
    }

    // Apply search
    if (searchTerm) {
      actions = libraryUtils.searchActions(actions, searchTerm);
    }

    // Apply damage type filter
    if (selectedDamageType !== 'all') {
      actions = libraryUtils.getActionsByDamageType(actions, selectedDamageType);
    }

    // Apply importance filter
    if (selectedImportance !== 'all') {
      actions = libraryUtils.getActionsByImportance(actions, selectedImportance);
    }

    return actions;
  }, [searchTerm, selectedCategory, selectedDamageType, selectedImportance]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-textSecondary)]" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search actions by name or description..."
          className={INPUT.small + ' pl-10'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--color-textSecondary)]" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={SELECT.small}
          >
            <option value="all">All Actions</option>
            <option value="tankBusters">Tank Busters</option>
            <option value="raidwide">Raidwide</option>
            <option value="mechanics">Mechanics</option>
          </select>
        </div>

        <select
          value={selectedDamageType}
          onChange={(e) => setSelectedDamageType(e.target.value)}
          className={SELECT.small}
        >
          <option value="all">All Damage Types</option>
          <option value="magical">Magical</option>
          <option value="physical">Physical</option>
          <option value="both">Both</option>
        </select>

        <select
          value={selectedImportance}
          onChange={(e) => setSelectedImportance(e.target.value)}
          className={SELECT.small}
        >
          <option value="all">All Importance</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-[var(--color-textSecondary)]">
        Showing {filteredActions.length} action{filteredActions.length !== 1 ? 's' : ''}
      </div>

      {/* Actions list */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredActions.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-textSecondary)]">
            <p>No actions found matching your filters.</p>
          </div>
        ) : (
          filteredActions.map((action) => (
            <button
              key={action.libraryId || action.id}
              onClick={() => onSelectAction(action)}
              className="w-full text-left px-4 py-3 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{action.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{action.name}</span>
                    {action.isTankBuster && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                        Tank Buster
                      </span>
                    )}
                    {action.isDualTankBuster && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                        Dual TB
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--color-textSecondary)] flex items-center gap-3 mb-1">
                    <span>⏱️ {formatTime(action.time)}</span>
                    {action.damageType && (
                      <span className="capitalize">
                        {action.damageType === 'magical' ? '🔮' : action.damageType === 'physical' ? '⚔️' : '⚡'} {action.damageType}
                      </span>
                    )}
                    {action.importance && (
                      <span className="capitalize">
                        {action.importance === 'critical' ? '🔴' : action.importance === 'high' ? '🟠' : action.importance === 'medium' ? '🟡' : '🟢'} {action.importance}
                      </span>
                    )}
                    {action.sourceBoss && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                        {action.sourceBoss}
                      </span>
                    )}
                  </div>
                  {action.unmitigatedDamage && (
                    <div className="text-xs text-[var(--color-textSecondary)] mb-1">
                      💥 {action.unmitigatedDamage}
                    </div>
                  )}
                  {action.description && (
                    <p className="text-xs text-[var(--color-textSecondary)] m-0 line-clamp-2">
                      {action.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default BossActionsLibrary;

