import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from '@/lib/navigation';

import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../contexts/PlanContext';
import { listNormalizedPlans } from '../../services/normalizedPlanService';
import { getErrorMessage } from '../../services/backendErrorUtils';
import PlanCard from './PlanCard';
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
import PageHeader from '../layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';





const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, hasPendingMigration, setHasPendingMigration } = useAuth();
  const userId = user?.uid;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCategorizedPlans = useCallback(async () => {
    if (!userId) {
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const plans = (await listNormalizedPlans()).sort((left, right) =>
        Number(right.lastAccessedAt || right.updatedAt || 0) -
        Number(left.lastAccessedAt || left.updatedAt || 0)
      );
      const ownedPlans = plans.filter((plan) => plan.accessLevel === 'owner');
      const sharedPlans = plans.filter((plan) => plan.accessLevel !== 'owner');
      setCategorizedPlans({ ownedPlans, sharedPlans, totalPlans: plans.length });
    } catch (err) {
      console.error('Error loading categorized plans:', err);
      setError(getErrorMessage(err));
      setCategorizedPlans({ ownedPlans: [], sharedPlans: [], totalPlans: 0 });
    } finally {
      setLoading(false);
    }
  }, [userId]);

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

  useEffect(() => {
    if (userId) {
      void loadCategorizedPlans();
    }
  }, [loadCategorizedPlans, userId]);

  useEffect(() => {
    if (user?.uid && hasPendingMigration) {
      setShowMigrationModal(true);
    }
  }, [user?.uid, hasPendingMigration]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigateToPlanner = (planId) => {
    navigate(`/plan/edit/${planId}`);
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

  const handleTimelineSelected = (timeline) => {
    setShowCustomTimelineModal(false);
    navigate(`/plan/create-from-timeline/${timeline.id}`);
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
          <div className="flex items-center justify-center p-16 text-[1.1rem] text-muted-foreground">Loading your plans...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[1200px] p-4 sm:p-8">
      <PageHeader
        title="Mitigation Plans"
        actions={
          <>
            <div className="hidden items-center gap-2 md:flex">
              <UserProfile />
              <KofiButton />
              <DiscordButton />
              <ThemeToggle />
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Open account menu">
                    <Menu className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Open account menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Account menu</SheetTitle>
                    <SheetDescription>Open account settings, community links, or sign out.</SheetDescription>
                  </SheetHeader>
                  <div className="mt-8 flex flex-col gap-4">
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
          </>
        }
      />

      {error && (
        <div className="mb-8 rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
          Plan loading issue: {error}
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-3">
        <Button onClick={handleCreatePlanByBoss}>
          New plan
        </Button>
        <Button variant="outline" onClick={handleImportPlan}>
          Import Plan
        </Button>
        <Button variant="outline" onClick={() => navigate('/timeline/create')}>
          Timelines
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/10 px-8 py-16 text-center text-destructive">
          <h3 className="mb-4 text-2xl text-destructive">Plans Unavailable</h3>
          <p className="mb-0 text-base">
            {error}
          </p>
        </div>
      ) : (
        <>
          {/* My Plans Section */}
          <section className="mb-12 last:mb-0">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="m-0 text-xl font-semibold text-foreground">Plans</h2>
              <span className="rounded-[12px] bg-muted px-3 py-1 text-sm font-semibold text-primary">{categorizedPlans.ownedPlans.length}</span>
            </div>

            {categorizedPlans.ownedPlans.length === 0 ? (
              <div className="text-center rounded-lg border border-dashed border-border bg-card p-8 text-muted-foreground">
                <p className="m-0 text-sm italic">
                  No plans yet. Create one to start mapping party mitigations to an encounter.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
                {categorizedPlans.ownedPlans.map((plan, index) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={() => handleOpenPlan(plan)}
                    onPlanChanged={handlePlanChanged}
                    onPlanDeleted={handlePlanDeleted}
                    isSharedPlan={false}
                    isMostRecent={index === 0}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Shared Plans Section - Only show for authenticated users */}
          {user && (
            <section className="mb-12 last:mb-0">
              <div className="mb-6 flex items-center gap-3">
                <h2 className="m-0 text-xl font-semibold text-foreground">Shared</h2>
                <span className="rounded-[12px] bg-muted px-3 py-1 text-sm font-semibold text-primary">{categorizedPlans.sharedPlans.length}</span>
              </div>

              {categorizedPlans.sharedPlans.length === 0 ? (
                <div className="text-center rounded-lg border border-dashed border-border bg-card p-8 text-muted-foreground">
                  <p className="m-0 text-sm italic">
                    Plans shared with you will appear here after you open an editable or snapshot link.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
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
