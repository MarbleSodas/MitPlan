import { useEffect } from 'react';
import { useMitigationContext } from '../../contexts/MitigationContext';

/**
 * MitigationSyncConnector
 * 
 * This component connects real-time sync functions from the App component
 * to the MitigationContext, enabling efficient async synchronization of
 * mitigation assignments for shared plans.
 */
const MitigationSyncConnector = ({ realTimeSyncFunctions }) => {
  const { setRealTimeSyncContext } = useMitigationContext();

  useEffect(() => {
    if (realTimeSyncFunctions && setRealTimeSyncContext) {
      console.log('%c[MITIGATION SYNC CONNECTOR] Connecting real-time sync functions to MitigationContext', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 3px;', {
        hasSyncFunctions: !!realTimeSyncFunctions.syncMitigationAssignments,
        isSharedPlan: window.location.pathname.includes('/plan/shared/')
      });
      
      // Provide the real-time sync functions to MitigationContext
      setRealTimeSyncContext(realTimeSyncFunctions);
    }

    // Cleanup function to remove the context when component unmounts
    return () => {
      if (setRealTimeSyncContext) {
        setRealTimeSyncContext(null);
      }
    };
  }, [realTimeSyncFunctions, setRealTimeSyncContext]);

  // This component doesn't render anything
  return null;
};

export default MitigationSyncConnector;
