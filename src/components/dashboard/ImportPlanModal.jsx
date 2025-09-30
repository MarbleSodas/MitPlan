import { useState } from 'react';
import { usePlan } from '../../contexts/PlanContext';


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
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 p-8 rounded-xl max-w-2xl w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 m-0">Import Plan</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-neutral-800">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="planName" className="text-gray-800 dark:text-gray-200 font-medium text-sm">Plan Name *</label>
            <input
              id="planName"
              type="text"
              placeholder="Enter a name for the imported plan"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] text-[0.95rem] font-medium bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 transition hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.03)] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] placeholder:text-gray-500 placeholder:font-normal"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="fileUpload" className="text-gray-800 dark:text-gray-200 font-medium text-sm">Upload Plan File</label>
            <input
              id="fileUpload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-neutral-900 cursor-pointer hover:border-blue-500 transition"
            />
            <p className="text-gray-500 dark:text-gray-400 text-sm m-0">Select a JSON file exported from MitPlan (supports all versions)</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="importData" className="text-gray-800 dark:text-gray-200 font-medium text-sm">Or Paste Plan Data</label>
            <textarea
              id="importData"
              placeholder="Paste your plan JSON data here..."
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 font-mono min-h-[200px] resize-y focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] placeholder:text-gray-500"
            />
            <p className="text-gray-500 dark:text-gray-400 text-sm m-0">Paste the JSON data from an exported plan (supports all versions)</p>
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="min-h-11 px-5 py-3 rounded-[10px] text-white font-semibold bg-blue-500 hover:bg-blue-600 transition shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:shadow-[0_0_0_4px_rgba(59,130,246,0.2)]">{loading ? 'Importing...' : 'Import Plan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportPlanModal;
