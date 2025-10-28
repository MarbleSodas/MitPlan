import { useState } from 'react';
import { usePlan } from '../../contexts/PlanContext';
import { bosses } from '../../data';


const CreatePlanModal = ({ onClose, onSuccess, onNavigateToPlanner, preSelectedBossId = null }) => {
  const { createNewPlan } = usePlan();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bossId: preSelectedBossId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Use the imported bosses data for consistency

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }

    // Boss is now optional - no validation required

    setLoading(true);
    setError('');

    try {
      const planData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        bossId: formData.bossId || null, // Boss is now optional
        bossTags: formData.bossId ? [formData.bossId] : [], // Convert to array for new structure
        assignments: {},
        selectedJobs: {},
        tankPositions: {
          mainTank: null,
          offTank: null
        }
      };

      console.log('[CreatePlanModal] Creating plan with data:', planData);
      const newPlan = await createNewPlan(planData);
      console.log('[CreatePlanModal] Plan created successfully:', newPlan);

      onSuccess?.(newPlan);

      // Navigate to planner if requested
      if (onNavigateToPlanner) {
        onNavigateToPlanner(newPlan.id);
      }
    } catch (err) {
      console.error('[CreatePlanModal] Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 p-8 rounded-xl max-w-xl w-[90%] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 m-0">
            {preSelectedBossId
              ? `Create Plan for ${bosses.find(b => b.id === preSelectedBossId)?.name}`
              : 'Create New Plan'
            }
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-neutral-800">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-gray-800 dark:text-gray-200 font-medium text-sm">Plan Name *</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter plan name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] text-[0.95rem] font-medium bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 transition hover:border-blue-500 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.03)] focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] placeholder:text-gray-500 placeholder:font-normal"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="bossId" className="text-gray-800 dark:text-gray-200 font-medium text-sm">Boss Encounter (Optional)</label>
            <select
              id="bossId"
              name="bossId"
              value={formData.bossId}
              onChange={handleInputChange}
              disabled={!!preSelectedBossId}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-[10px] bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            >
              <option value="">No boss selected (create custom timeline)</option>
              {bosses.map(boss => (
                <option key={boss.id} value={boss.id}>
                  {boss.name}
                </option>
              ))}
            </select>
            {preSelectedBossId ? (
              <div className="text-sm text-gray-500 mt-1">
                Boss pre-selected: {bosses.find(b => b.id === preSelectedBossId)?.name}
              </div>
            ) : (
              <div className="text-sm text-gray-500 mt-1">
                You can create a custom timeline without selecting a boss, or choose a boss to start with their predefined actions.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-gray-800 dark:text-gray-200 font-medium text-sm">Description</label>
            <textarea
              id="description"
              name="description"
              placeholder="Optional description for your plan"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-100 min-h-[100px] resize-y focus:outline-none focus:border-blue-500 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.125)] placeholder:text-gray-500"
            />
          </div>

          {error && (
            <div className="text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className="min-h-11 px-5 py-3 rounded-[10px] font-medium border-2 border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-gray-50 dark:hover:bg-neutral-800 transition">Cancel</button>
            <button type="submit" disabled={loading} className="min-h-11 px-5 py-3 rounded-[10px] text-white font-semibold bg-blue-500 hover:bg-blue-600 transition shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:shadow-[0_0_0_4px_rgba(59,130,246,0.2)]">{loading ? 'Creating...' : 'Create Plan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlanModal;
