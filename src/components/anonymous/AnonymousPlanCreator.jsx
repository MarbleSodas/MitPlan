/**
 * Anonymous Plan Creator Component
 * Handles creation of new plans for anonymous users
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import localStoragePlanService from '../../services/localStoragePlanService';
import { bosses } from '../../data';


const AnonymousPlanCreator = ({ onCancel, onSuccess, preSelectedBossId = null }) => {
  const navigate = useNavigate();
  const { isAnonymousMode, anonymousUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    bossId: preSelectedBossId || '',
    description: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Plan name is required');
      return;
    }
    
    if (!formData.bossId) {
      setError('Please select a boss');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create the plan using local storage service
      const planData = {
        name: formData.name.trim(),
        bossId: formData.bossId,
        description: formData.description.trim(),
        assignments: {},
        selectedJobs: {},
        tankPositions: {}
      };

      const createdPlan = await localStoragePlanService.createPlan(planData);
      
      console.log('[AnonymousPlanCreator] Plan created:', createdPlan);
      
      // Navigate to the new plan
      navigate(`/anonymous/plan/${createdPlan.id}`);
      
      // Call success callback
      onSuccess?.(createdPlan);
      
    } catch (err) {
      console.error('[AnonymousPlanCreator] Error creating plan:', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1); // Go back
    }
  };

  if (!isAnonymousMode) {
    return null;
  }

  return (
    <div className="max-w-[500px] mx-auto p-8 bg-white dark:bg-neutral-900 rounded-xl shadow-md">
      <h2 className="m-0 mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Plus size={24} />
        {preSelectedBossId
          ? `Create Plan for ${bosses.find(b => b.id === preSelectedBossId)?.name}`
          : 'Create New Plan'
        }
      </h2>

      <div className="text-sm rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 p-4 mb-4">
        You're creating a plan in anonymous mode. It will be stored locally in your browser.
        Create an account to save plans permanently and enable sharing.
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium text-gray-800 dark:text-gray-200">Plan Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter plan name"
            maxLength={100}
            disabled={isCreating}
            required
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="bossId" className="text-sm font-medium text-gray-800 dark:text-gray-200">Boss *</label>
          <select
            id="bossId"
            name="bossId"
            value={formData.bossId}
            onChange={handleInputChange}
            disabled={isCreating || !!preSelectedBossId}
            required
            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a boss</option>
            {bosses.map(boss => (
              <option key={boss.id} value={boss.id}>
                {boss.name}
              </option>
            ))}
          </select>
          {preSelectedBossId && (
            <div className="text-sm text-gray-500 mt-1">
              Boss pre-selected: {bosses.find(b => b.id === preSelectedBossId)?.name}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="description" className="text-sm font-medium text-gray-800 dark:text-gray-200">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Add a description for your plan"
            maxLength={500}
            disabled={isCreating}
            className="min-h-[100px] px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm mt-2 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCreating}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isCreating || !formData.name.trim() || !formData.bossId}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={16} />
            {isCreating ? 'Creating...' : 'Create Plan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnonymousPlanCreator;
