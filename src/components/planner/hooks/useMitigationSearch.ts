/**
 * useMitigationSearch Hook
 * 
 * Manages mitigation search and filtering state.
 */

import { useState, useMemo, useCallback } from 'react';
import type { MitigationAbility, BossAction, JobId } from '../../../types';

interface UseMitigationSearchOptions {
  /** Filtered mitigations from context */
  filteredMitigations: MitigationAbility[];
  /** Currently selected boss action */
  selectedBossAction: BossAction | null;
  /** The user's assigned job */
  myAssignedJob: JobId | null;
  /** Available job IDs for filtering */
  availableJobs: JobId[];
}

interface UseMitigationSearchReturn {
  /** Current search query */
  searchQuery: string;
  /** Set the search query */
  setSearchQuery: (query: string) => void;
  /** Currently selected job filter */
  selectedJobFilter: string | null;
  /** Set the job filter */
  setSelectedJobFilter: (jobId: string | null) => void;
  /** Mitigations after search and filter */
  searchedMitigations: MitigationAbility[];
}

/**
 * Fuzzy match a text string against a query
 */
const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query.trim()) return true;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  // Direct substring match
  if (lowerText.includes(lowerQuery)) return true;
  
  // Character-by-character fuzzy match
  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
};

export const useMitigationSearch = (options: UseMitigationSearchOptions): UseMitigationSearchReturn => {
  const { filteredMitigations } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string | null>(null);

  const searchedMitigations = useMemo(() => {
    let result = filteredMitigations;

    // Filter by job
    if (selectedJobFilter) {
      result = result.filter(m => m.jobs?.includes(selectedJobFilter as JobId));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      result = result.filter(m => 
        fuzzyMatch(m.name, searchQuery) ||
        fuzzyMatch(m.description || '', searchQuery)
      );
    }

    return result;
  }, [filteredMitigations, selectedJobFilter, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    selectedJobFilter,
    setSelectedJobFilter,
    searchedMitigations,
  };
};

export default useMitigationSearch;
