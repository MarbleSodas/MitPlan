/**
 * Anonymous Dashboard Component
 * Shows local plans and provides access to anonymous features
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, User, Trash2, Edit, Check, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../common/Toast/Toast';
import unifiedPlanService from '../../services/unifiedPlanService';
import localStoragePlanService from '../../services/localStoragePlanService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import AnonymousPlanCreator from './AnonymousPlanCreator';
import { BossSelectionModal, UserProfile } from '../dashboard';
import Footer from '../layout/Footer';








const AnonymousDashboard = () => {
  const navigate = useNavigate();
  const { isAnonymousMode, anonymousUser } = useAuth();
  const { addToast } = useToast();
  const [categorizedPlans, setCategorizedPlans] = useState({
    ownedPlans: [],
    sharedPlans: [],
    totalPlans: 0
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBossSelectionModal, setShowBossSelectionModal] = useState(false);
  const [selectedBossForPlan, setSelectedBossForPlan] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Set up unified plan service context and load plans
  useEffect(() => {
    if (isAnonymousMode && anonymousUser) {
      // Set the user context for the unified plan service
      unifiedPlanService.setUserContext(anonymousUser, true);
      loadPlans();
    }
  }, [isAnonymousMode, anonymousUser]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plans = await unifiedPlanService.getCategorizedUserPlans();
      setCategorizedPlans(plans);
    } catch (error) {
      console.error('Error loading categorized plans:', error);
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlanByBoss = () => {
    setShowBossSelectionModal(true);
  };

  const handleBossSelected = (bossId) => {
    setSelectedBossForPlan(bossId);
    setShowBossSelectionModal(false);
    setShowCreateModal(true);
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setSelectedBossForPlan(null);
  };

  const handlePlanCreated = () => {
    setShowCreateModal(false);
    setSelectedBossForPlan(null);
    loadPlans(); // Refresh the list
  };

  const handleEditPlan = (planId) => {
    navigate(`/anonymous/plan/${planId}`);
  };

  const handleDeletePlan = async (planId, planName) => {
    if (window.confirm(`Are you sure you want to delete "${planName}"? This action cannot be undone.`)) {
      try {
        await localStoragePlanService.deletePlan(planId);
        loadPlans(); // Refresh the list
      } catch (error) {
        console.error('Error deleting plan:', error);
        addToast({
          type: 'error',
          title: 'Delete failed',
          message: 'Failed to delete plan: ' + error.message,
          duration: 4000
        });
      }
    }
  };

  const handleStartEditName = (planId, currentName) => {
    setEditingPlanId(planId);
    setEditedName(currentName);
  };

  const handleSaveName = async (planId) => {
    if (editedName.trim() === '' || !editingPlanId) {
      setEditingPlanId(null);
      setEditedName('');
      return;
    }

    setSavingName(true);
    try {
      // Update both 'title' (primary field) and 'name' (for compatibility)
      await unifiedPlanService.updatePlan(planId, {
        title: editedName.trim(),
        name: editedName.trim()
      });
      setEditingPlanId(null);
      setEditedName('');

      // Show success toast
      addToast({
        type: 'success',
        title: 'Plan renamed!',
        message: `Plan renamed to "${editedName.trim()}".`,
        duration: 3000
      });

      // Refresh the plans list
      loadPlans();
    } catch (error) {
      console.error('Failed to rename plan:', error);

      // Show error toast
      addToast({
        type: 'error',
        title: 'Failed to rename plan',
        message: 'Please try again.',
        duration: 4000
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setEditingPlanId(null);
    setEditedName('');
  };

  const handleNameKeyPress = (e, planId) => {
    if (e.key === 'Enter') {
      handleSaveName(planId);
    } else if (e.key === 'Escape') {
      handleCancelEditName();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isAnonymousMode) {
    return null;
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex-1">
          <h1 className="m-0 mb-2 text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <User size={32} />
            Anonymous Dashboard
          </h1>
          <p className="m-0 text-gray-600 dark:text-gray-400">
            Your plans are stored locally in your browser.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <UserProfile />
        </div>
      </div>



      <div className="flex items-center justify-between mb-6 gap-4 flex-col md:flex-row">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Your Plans ({categorizedPlans.totalPlans})</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button onClick={handleCreatePlanByBoss}>
            <Plus size={16} />
            Create New Plan
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading plans...</div>
      ) : categorizedPlans.totalPlans === 0 ? (
        <div className="text-center p-6 text-gray-600 dark:text-gray-400">
          <div className="mb-4 text-gray-400">
            <FileText size={48} />
          </div>
          <h3>No plans yet</h3>
          <p>Create your first mitigation plan to get started.</p>
          <div className="flex gap-4 justify-center flex-wrap mt-4">
            <Button onClick={handleCreatePlanByBoss}>
              <Plus size={16} />
              Create Your First Plan
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* My Plans Section */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 m-0">My Plans</h2>
              <span className="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">{categorizedPlans.ownedPlans.length}</span>
            </div>

            {categorizedPlans.ownedPlans.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-lg">
                You haven't created any plans yet. Click "Create New Plan" to get started!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {categorizedPlans.ownedPlans.map((plan) => (
                  <div key={plan.id} onClick={() => handleEditPlan(plan.id)} className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 transition hover:shadow-md hover:border-blue-500 cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      {editingPlanId === plan.id ? (
                        <>
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={(e) => handleNameKeyPress(e, plan.id)}
                            onBlur={() => handleSaveName(plan.id)}
                            autoFocus
                            disabled={savingName}
                            onClick={(e) => e.stopPropagation()}
                            className="text-lg font-semibold"
                          />
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-green-600 hover:bg-green-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveName(plan.id);
                              }}
                              disabled={savingName}
                              title="Save name"
                            >
                              <Check size={12} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-500 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEditName();
                              }}
                              disabled={savingName}
                              title="Cancel"
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <h3 className="m-0 text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">{plan.name}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-70 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditName(plan.id, plan.name);
                            }}
                            disabled={savingName}
                            title="Edit plan name"
                          >
                            <Edit size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 mb-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>Boss: {plan.bossId}</div>
                      <div>
                        <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Created: {formatDate(plan.createdAt)}
                      </div>
                      <div>
                        <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        Updated: {formatDate(plan.updatedAt)}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" onClick={() => handleEditPlan(plan.id)}>
                        <Edit size={14} />
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeletePlan(plan.id, plan.name)}>
                        <Trash2 size={14} />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note: Anonymous users don't have shared plans since they only work with localStorage */}
        </>
      )}

      {showBossSelectionModal && (
        <BossSelectionModal
          onClose={() => setShowBossSelectionModal(false)}
          onSelectBoss={handleBossSelected}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4" onClick={handleCreateModalClose}>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-4" onClick={(e) => e.stopPropagation()}>
            <AnonymousPlanCreator
              onCancel={handleCreateModalClose}
              onSuccess={handlePlanCreated}
              preSelectedBossId={selectedBossForPlan}
            />
          </div>
        </div>
      )}
    </div>
    <Footer />
  </>
  );
};

export default AnonymousDashboard;
