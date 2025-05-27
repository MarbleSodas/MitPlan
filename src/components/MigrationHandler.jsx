import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';

/**
 * Component to handle localStorage plan migration
 * This component has access to both AuthContext and PlanContext,
 * allowing it to safely call hooks and perform the migration.
 */
const MigrationHandler = () => {
  const { user, isAuthenticated, migratePlans, needsMigration } = useAuth();
  const { createPlan } = usePlan();

  useEffect(() => {
    console.log('🔄 [MIGRATION HANDLER] Checking migration status', {
      isAuthenticated,
      hasUser: !!user,
      hasCreatePlan: !!createPlan,
      userId: user?.id
    });

    if (isAuthenticated && user && createPlan) {
      // Check if migration is needed
      if (needsMigration(user.id)) {
        console.log('✅ [MIGRATION HANDLER] Migration needed for user:', user.id);
        
        // Delay migration slightly to ensure all contexts are ready
        const migrationTimeout = setTimeout(() => {
          console.log('🚀 [MIGRATION HANDLER] Starting migration for user:', user.id);
          migratePlans(user.id, createPlan);
        }, 1000);

        return () => clearTimeout(migrationTimeout);
      } else {
        console.log('⏭️ [MIGRATION HANDLER] No migration needed for user:', user.id);
      }
    }
  }, [isAuthenticated, user, createPlan, migratePlans, needsMigration]);

  // This component doesn't render anything
  return null;
};

export default MigrationHandler;
