import { useState } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import { INPUT, BUTTON, MODAL, cn } from '../../styles/designSystem';


const ImportPlanModal = ({ onClose, onSuccess }) => {
  const { importPlanData } = usePlan();
  const [planName, setPlanName] = useState('');
  const [importData, setImportData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        setImportData(content);
        
        // Try to parse and extract plan name
        const parsed = JSON.parse(content);
        if (parsed.name && !planName) {
          setPlanName(parsed.name);
        }
      } catch (err) {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!importData.trim()) {
      setError('Please provide plan data to import');
      return;
    }

    if (!planName.trim()) {
      setError('Plan name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const parsedData = JSON.parse(importData);
      await importPlanData(parsedData, planName.trim());
      onSuccess?.();
    } catch (err) {
      if (err.name === 'SyntaxError') {
        setError('Invalid JSON format. Please check your plan data.');
      } else {
        setError(err.message || 'Failed to import plan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} className={cn(MODAL.overlay, 'z-[1000]')}>
      <div onClick={(e) => e.stopPropagation()} className={cn(MODAL.container, 'max-w-2xl p-8')}>
        <div className="flex justify-between items-center mb-8">
          <h2 className={cn(MODAL.title, 'text-2xl')}>Import Plan</h2>
          <button onClick={onClose} className={cn(BUTTON.ghost, 'w-8 h-8 p-0')}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="planName" className="text-[var(--color-text)] font-medium text-sm">Plan Name *</label>
            <input
              id="planName"
              type="text"
              placeholder="Enter a name for the imported plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              required
              className={INPUT.medium}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="fileUpload" className="text-[var(--color-text)] font-medium text-sm">Upload Plan File</label>
            <input
              id="fileUpload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className={cn(INPUT.medium, 'border-dashed cursor-pointer')}
            />
            <p className="text-[var(--color-textSecondary)] text-sm m-0">Select a JSON file exported from MitPlan (supports all versions)</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="importData" className="text-[var(--color-text)] font-medium text-sm">Or Paste Plan Data</label>
            <textarea
              id="importData"
              placeholder="Paste your plan JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className={cn(INPUT.medium, 'font-mono min-h-[200px] resize-y')}
            />
            <p className="text-[var(--color-textSecondary)] text-sm m-0">Paste the JSON data from an exported plan (supports all versions)</p>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className={BUTTON.secondary.large}>Cancel</button>
            <button type="submit" disabled={loading} className={BUTTON.primary.large}>{loading ? 'Importing...' : 'Import Plan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportPlanModal;
