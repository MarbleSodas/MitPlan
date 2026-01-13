import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Download } from 'lucide-react';




const BANNER_DISMISSED_KEY = 'mitplan-migration-banner-dismissed';

const DataMigrationBanner = ({ onExportClick, onVisibilityChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const wasDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);

    // Check if we're past the migration date (July 10th, 2025)
    const migrationDate = new Date('2025-07-10');
    const currentDate = new Date();

    // Show banner if not dismissed and before migration date
    const shouldShow = !wasDismissed && currentDate < migrationDate;
    setIsVisible(shouldShow);

    // Notify parent of visibility change
    if (onVisibilityChange) {
      onVisibilityChange(shouldShow);
    }
  }, [onVisibilityChange]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');

    // Notify parent of visibility change
    if (onVisibilityChange) {
      onVisibilityChange(false);
    }
  };

  const handleExportClick = () => {
    if (onExportClick) {
      onExportClick();
    }
    // Optionally scroll to export section or show export modal
    const exportSection = document.querySelector('[data-export-section]');
    if (exportSection) {
      exportSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] bg-[linear-gradient(135deg,_#fff3cd_0%,_#ffeaa7_100%)] dark:bg-[linear-gradient(135deg,_#4a3800_0%,_#5c4500_100%)] border-b-2 border-amber-500 shadow-md">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-amber-500 text-white dark:text-black flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-amber-800 dark:text-white text-sm md:text-base">
              Important: Data Migration Notice
            </div>
            <div className="text-amber-700 dark:text-amber-200 text-xs md:text-sm">
              Export your mitigation plans to JSON before July 10th, 2025. New collaboration features may not preserve locally stored plans.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportClick} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500 text-white dark:text-black font-semibold hover:bg-amber-600 transition">
            <Download size={16} />
            Export Plans
          </button>
          <button onClick={handleDismiss} aria-label="Dismiss notification" className="w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-amber-800 dark:text-amber-200">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataMigrationBanner;
