import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import { toast } from 'sonner';
import { createPlanTimelineLayoutFromTimeline } from '../../utils/timeline/planTimelineLayoutUtils';
import unifiedPlanService from '../../services/unifiedPlanService';
import { getUserTimelines } from '../../services/timelineService';
import { getDashboardPlanLoadErrorMessage } from '../../services/firebaseErrorUtils';
import PlanCard from './PlanCard';
import TimelineCard from './TimelineCard';
import CreatePlanModal from './CreatePlanModal';
import BossSelectionModal from './BossSelectionModal';
import CustomTimelineSelectionModal from './CustomTimelineSelectionModal';
import ImportPlanModal from './ImportPlanModal';
import UserProfile from './UserProfile';
import PlanMigrationModal from '../modals/PlanMigrationModal';
import ThemeToggle from '../common/ThemeToggle';
import KofiButton from '../common/KofiButton/KofiButton';
import DiscordButton from '../common/DiscordButton/DiscordButton';
import Footer from '../layout/Footer';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';





const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, hasPendingMigration, setHasPendingMigration } = useAuth();
  const { loadUserPlans } = usePlan();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBossSelectionModal, setShowBossSelectionModal] = useState(false);
  const [showCustomTimelineModal, setShowCustomTimelineModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [selectedBossForPlan, setSelectedBossForPlan] = useState(null);
  const [categorizedPlans, setCategorizedPlans] = useState({
    ownedPlans: [],
    sharedPlans: [],
    totalPlans: 0
  });
  const [timelines, setTimelines] = useState([]);
  const [timelinesLoading, setTimelinesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set up unified plan service context and load categorized plans
  useEffect(() => {
    if (user) {
      unifiedPlanService.setUserContext(user);
      loadCategorizedPlans();
      loadUserTimelines();
    }
  }, [user]);

  useEffect(() => {
    if (user && hasPendingMigration) {
      setShowMigrationModal(true);
    }
  }, [user, hasPendingMigration]);

  const loadCategorizedPlans = async () => {
    if (!user) {
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const plans = await unifiedPlanService.getCategorizedUserPlans();
      setCategorizedPlans(plans);
    } catch (err) {
      console.error('Error loading categorized plans:', err);
      setError(getDashboardPlanLoadErrorMessage(err));
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
    } finally {
      setLoading(false);
    }
  };

  const loadUserTimelines = async () => {
    if (!user) {
      setTimelines([]);
      return;
    }

    setTimelinesLoading(true);

    try {
      const userTimelines = await getUserTimelines(user.uid);
      setTimelines(userTimelines);
    } catch (err) {
      console.error('Error loading timelines:', err);
      setTimelines([]);
    } finally {
      setTimelinesLoading(false);
    }
  };

  const handleOpenPlan = (plan) => {
    if (plan?.shareMode === 'view' && plan?.viewToken) {
      navigate(`/plan/view/${plan.viewToken}`);
      return;
    }

    if (plan?.shareMode === 'edit' && !plan?.isOwner) {
      navigate(`/plan/shared/${plan.id}`);
      return;
    }

    navigate(`/plan/edit/${plan.id}`);
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

    // If bossId is null, show custom timeline selection modal
    // Otherwise, show the regular create plan modal
    if (bossId === null) {
      setShowCustomTimelineModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleCreateModalClose = () => {
    setShowCreateModal(false);
    setSelectedBossForPlan(null);
  };

  const handleCustomTimelineModalClose = () => {
    setShowCustomTimelineModal(false);
    setSelectedBossForPlan(null);
  };

  const handleTimelineSelected = async (timeline) => {
    // Close the custom timeline modal
    setShowCustomTimelineModal(false);

    // Create a new empty plan with the selected timeline
    try {
      const planData = {
        name: `${timeline.name} - Plan`,
        description: timeline.description || '',
        bossId: timeline.bossId || null,
        bossTags: timeline.bossTags || [],
        assignments: {},
        selectedJobs: {},
        tankPositions: {
          mainTank: null,
          offTank: null
        },
        timelineLayout: createPlanTimelineLayoutFromTimeline(timeline),
        sourceTimelineId: timeline.id,
        sourceTimelineName: timeline.name,
        bossMetadata: timeline.bossMetadata || null
      };

      // Use the unified plan service to create the plan
      const newPlan = await unifiedPlanService.createPlan(planData);
      console.log('[Dashboard] Plan created from timeline:', newPlan);

      toast.success('Plan created!', { description: `Plan created from timeline "${timeline.name}"` });

      // Refresh plans and navigate to the new plan
      loadCategorizedPlans();
      handleOpenPlan(newPlan);
    } catch (error) {
      console.error('Error creating plan from timeline:', error);
      toast.error('Failed to create plan', { description: error.message || 'Please try again.' });
    }
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

  const handleMigrationComplete = () => {
    setHasPendingMigration(false);
    setShowMigrationModal(false);
    loadUserPlans();
    loadCategorizedPlans();
  };

  const handleMigrationSkipped = () => {
    setHasPendingMigration(false);
    setShowMigrationModal(false);
  };

  const handleTimelineChanged = () => {
    loadUserTimelines(); // Refresh timelines when one is changed/deleted
  };

  const handleTimelineDeleted = (timelineId) => {
    // Optimistic update: Remove timeline from UI immediately
    setTimelines(prev => prev.filter(timeline => timeline.id !== timelineId));
  };

  const handleCreateTimeline = () => {
    navigate('/timeline/create');
  };

  const handlePlanChanged = () => {
    loadUserPlans(); // Keep for real-time updates
    loadCategorizedPlans(); // Refresh categorized view
  };

  const handlePlanDeleted = (planId) => {
    // Optimistic update: Remove plan from categorized lists immediately
    setCategorizedPlans(prev => ({
      ownedPlans: prev.ownedPlans.filter(plan => plan.id !== planId),
      sharedPlans: prev.sharedPlans.filter(plan => plan.id !== planId),
      totalPlans: prev.totalPlans - 1
    }));
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
      <div className="max-w-[1200px] mx-auto p-4 sm:p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-xl sm:text-2xl font-semibold text-[var(--color-text)]">Mitigation Plans</h1>
        
        {/* Desktop: All buttons visible */}
        <div className="hidden md:flex items-center gap-2">
          <UserProfile />
          <KofiButton />
          <DiscordButton />
          <ThemeToggle />
          <Button variant="destructive" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>

        {/* Mobile: Theme toggle + Menu */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <div className="flex flex-col gap-4 mt-8">
                <UserProfile />
                <div className="border-t border-border" />
                <KofiButton />
                <DiscordButton />
                <div className="border-t border-border" />
                <Button variant="destructive" onClick={handleLogout} className="w-full">
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-lg border border-[#fecaca] bg-[#fef2f2] p-4 text-[#ef4444]">
          Plan loading issue: {error}
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-4">
        <Button onClick={handleCreatePlanByBoss}>
          Create New Plan
        </Button>
        <Button variant="secondary" onClick={handleImportPlan}>
          Import Plan
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-dashed border-[#fecaca] bg-[#fff7f7] px-8 py-16 text-center text-[#b91c1c]">
          <h3 className="mb-4 text-2xl text-[#991b1b]">Plans Unavailable</h3>
          <p className="mb-0 text-base">
            {error}
          </p>
        </div>
      ) : categorizedPlans.totalPlans === 0 ? (
        <div className="text-center px-8 py-16 text-[var(--color-textSecondary)]">
          <h3 className="mb-4 text-2xl text-[var(--color-text)]">No Plans Yet</h3>
          <p className="mb-8 text-base">
            Create your first mitigation plan to get started with optimizing your raid strategies.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button onClick={handleCreatePlanByBoss}>
              Create Your First Plan
            </Button>
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
                    onEdit={() => handleOpenPlan(plan)}
                    onPlanChanged={handlePlanChanged}
                    onPlanDeleted={handlePlanDeleted}
                    isSharedPlan={false}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Shared Plans Section - Only show for authenticated users */}
          {user && (
            <section className="mb-12 last:mb-0">
              <div className="mb-6 flex items-center gap-3">
                <h2 className="m-0 text-xl font-semibold text-[var(--color-text)]">Shared Plans</h2>
                <span className="rounded-[12px] bg-[var(--select-bg)] px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">{categorizedPlans.sharedPlans.length}</span>
              </div>

              {categorizedPlans.sharedPlans.length === 0 ? (
                <div className="text-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-cardBackground)] p-8 text-[var(--color-textSecondary)]">
                  <p className="m-0 text-sm italic">
                    No shared plans yet. Editable plans appear here after you open a public edit link, and read-only plans appear after you open a snapshot link.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(400px,1fr))]">
                  {categorizedPlans.sharedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onEdit={() => handleOpenPlan(plan)}
                      onPlanChanged={handlePlanChanged}
                      onPlanDeleted={handlePlanDeleted}
                      isSharedPlan={true}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Community Timelines Section */}
          <section className="mb-12 last:mb-0">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="m-0 text-xl font-semibold text-[var(--color-text)]">Community Timelines</h2>
                <span className="rounded-[12px] bg-[var(--select-bg)] px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">{timelines.length}</span>
              </div>
              <div className="flex gap-4">
                <Button onClick={handleCreateTimeline}>
                  Open Timeline Hub
                </Button>
                <Button variant="secondary" onClick={() => navigate('/timeline/browse')}>
                  Browse Community Timelines
                </Button>
              </div>
            </div>

            {timelinesLoading ? (
              <div className="text-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-cardBackground)] p-8 text-[var(--color-textSecondary)]">
                <p className="m-0 text-sm">Loading timelines...</p>
              </div>
            ) : timelines.length === 0 ? (
              <div className="text-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-cardBackground)] p-8 text-[var(--color-textSecondary)]">
                <p className="m-0 text-sm italic">
                  You haven't created any community timelines yet. Open the timeline hub to start blank, branch from a plan, or build from official and public routes.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(400px,1fr))]">
                {timelines.map((timeline) => (
                  <TimelineCard
                    key={timeline.id}
                    timeline={timeline}
                    onTimelineChanged={handleTimelineChanged}
                    onTimelineDeleted={handleTimelineDeleted}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showBossSelectionModal && (
        <BossSelectionModal
          onClose={() => setShowBossSelectionModal(false)}
          onSelectBoss={handleBossSelected}
        />
      )}

      {showCustomTimelineModal && (
        <CustomTimelineSelectionModal
          onClose={handleCustomTimelineModalClose}
          onSelectTimeline={handleTimelineSelected}
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

      <PlanMigrationModal
        isOpen={showMigrationModal}
        userId={user?.uid}
        onMigrate={handleMigrationComplete}
        onSkip={handleMigrationSkipped}
        onClose={handleMigrationSkipped}
      />
    </div>
    <Footer />
  </>
  );
};

export default Dashboard;
