import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import unifiedPlanService from '../../services/unifiedPlanService';
import PlanCard from './PlanCard';
import CreatePlanModal from './CreatePlanModal';
import BossSelectionModal from './BossSelectionModal';
import ImportPlanModal from './ImportPlanModal';
import UserProfile from './UserProfile';
import ThemeToggle from '../common/ThemeToggle';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';
import Footer from '../layout/Footer';





const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { loadUserPlans } = usePlan();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBossSelectionModal, setShowBossSelectionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedBossForPlan, setSelectedBossForPlan] = useState(null);
  const [categorizedPlans, setCategorizedPlans] = useState({
    ownedPlans: [],
    sharedPlans: [],
    totalPlans: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set up unified plan service context and load categorized plans
  useEffect(() => {
    if (user) {
      // Set the user context for the unified plan service
      unifiedPlanService.setUserContext(user, false);
      loadCategorizedPlans();
    }
  }, [user]);

  const loadCategorizedPlans = async () => {
    if (!user) {
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Dashboard] Loading categorized plans for user:', user.uid);
      const plans = await unifiedPlanService.getCategorizedUserPlans();
      console.log('[Dashboard] Categorized plans loaded:', {
        ownedPlans: plans.ownedPlans.length,
        sharedPlans: plans.sharedPlans.length,
        totalPlans: plans.totalPlans
      });
      setCategorizedPlans(plans);
    } catch (err) {
      console.error('Error loading categorized plans:', err);
      setError(err.message);
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToPlanner = (planId) => {
    navigate(`/plan/edit/${planId}`);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
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

  const handleImportPlan = () => {
    setShowImportModal(true);
  };

  const handlePlanCreated = () => {
    setShowCreateModal(false);
    loadUserPlans(); // Keep for real-time updates
    loadCategorizedPlans(); // Refresh categorized view
  };

  const handlePlanImported = () => {
    setShowImportModal(false);
    loadUserPlans(); // Keep for real-time updates
    loadCategorizedPlans(); // Refresh categorized view
  };

  const handlePlanChanged = () => {
    loadUserPlans(); // Keep for real-time updates
    loadCategorizedPlans(); // Refresh categorized view
  };

  if (loading) {
    return (
      <>
        <div className="max-w-[1200px] mx-auto p-8">
          <div className="flex items-center justify-center p-16 text-[1.1rem] text-[var(--color-textSecondary)]">Loading your plans...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="max-w-[1200px] mx-auto p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-2xl font-semibold text-[var(--color-text)]">Mitigation Plans</h1>
        <div className="flex items-center gap-2">
          <UserProfile />
          <KofiButton />
          <DiscordButton />
          <ThemeToggle />
          <button onClick={handleLogout} className="inline-flex h-9 items-center justify-center rounded-md bg-red-500 px-4 text-white text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:bg-red-600">
            Sign Out
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4 text-[#ef4444]">
          Error: {error}
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-4">
        <button onClick={handleCreatePlanByBoss} className="rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-buttonText)] shadow-sm transition-all hover:brightness-110">
          Create New Plan
        </button>
        <button onClick={handleImportPlan} className="rounded-lg border-2 border-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-primary)] transition-all hover:bg-[var(--color-primary)] hover:text-[var(--color-buttonText)]">
          Import Plan
        </button>
      </div>

      {categorizedPlans.totalPlans === 0 ? (
        <div className="text-center px-8 py-16 text-[var(--color-textSecondary)]">
          <h3 className="mb-4 text-2xl text-[var(--color-text)]">No Plans Yet</h3>
          <p className="mb-8 text-base">
            Create your first mitigation plan to get started with optimizing your raid strategies.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={handleCreatePlanByBoss} className="rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#2563eb]">
              Create Your First Plan
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* My Plans Section */}
          <section className="mb-12 last:mb-0">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="m-0 text-xl font-semibold text-[var(--color-text)]">My Plans</h2>
              <span className="rounded-[12px] bg-[var(--select-bg)] px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">{categorizedPlans.ownedPlans.length}</span>
            </div>

            {categorizedPlans.ownedPlans.length === 0 ? (
              <div className="text-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-cardBackground)] p-8 text-[var(--color-textSecondary)]">
                <p className="m-0 text-sm italic">
                  You haven't created any plans yet. Click "Create New Plan" to get started!
                </p>
              </div>
            ) : (
              <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(400px,1fr))]">
                {categorizedPlans.ownedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => handleNavigateToPlanner(plan.id)}
                    onPlanChanged={handlePlanChanged}
                    isSharedPlan={false}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Shared Plans Section - Only show for authenticated users */}
          {user && !user.isAnonymous && (
            <section className="mb-12 last:mb-0">
              <div className="mb-6 flex items-center gap-3">
                <h2 className="m-0 text-xl font-semibold text-[var(--color-text)]">Shared Plans</h2>
                <span className="rounded-[12px] bg-[var(--select-bg)] px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">{categorizedPlans.sharedPlans.length}</span>
              </div>

              {categorizedPlans.sharedPlans.length === 0 ? (
                <div className="text-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-cardBackground)] p-8 text-[var(--color-textSecondary)]">
                  <p className="m-0 text-sm italic">
                    No plans have been shared with you yet. Shared plans will appear here when other users give you access.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(400px,1fr))]">
                  {categorizedPlans.sharedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={() => handleNavigateToPlanner(plan.id)}
                      onPlanChanged={handlePlanChanged}
                      isSharedPlan={true}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {showBossSelectionModal && (
        <BossSelectionModal
          onClose={() => setShowBossSelectionModal(false)}
          onSelectBoss={handleBossSelected}
        />
      )}

      {showCreateModal && (
        <CreatePlanModal
          onClose={handleCreateModalClose}
          onSuccess={handlePlanCreated}
          onNavigateToPlanner={handleNavigateToPlanner}
          preSelectedBossId={selectedBossForPlan}
        />
      )}

      {showImportModal && (
        <ImportPlanModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handlePlanImported}
        />
      )}
    </div>
    <Footer />
  </>
  );
};

export default Dashboard;
