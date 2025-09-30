import React from 'react';


const AvailabilityIndicatorDemo = () => {






  return (
    <div className="p-8 rounded-lg m-4 bg-neutral-100 dark:bg-neutral-900">
      <h3 className="mb-4 text-neutral-900 dark:text-neutral-100">Mitigation Availability Indicators</h3>

      <div className="p-4 mb-2 transition-all rounded border-l-4 border-l-blue-500 bg-white dark:bg-neutral-800 hover:bg-black/5 dark:hover:bg-white/5">
        <div className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">Available Mitigation</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          Blue border indicates this mitigation can be assigned to the selected boss action.
          No cooldown restrictions or compatibility issues.
        </div>
      </div>

      <div className="p-4 mb-2 transition-all rounded border-l-4 border-l-red-500 bg-white dark:bg-neutral-800 hover:bg-black/5 dark:hover:bg-white/5 opacity-70">
        <div className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">Unavailable Mitigation</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          Red border indicates this mitigation cannot be assigned due to cooldown restrictions,
          job compatibility issues, tank targeting restrictions, or charge/stack limitations.
        </div>
      </div>

      <div className="p-4 mb-2 transition-all rounded border-l-4 border-l-blue-500 bg-white dark:bg-neutral-800 hover:bg-black/5 dark:hover:bg-white/5">
        <div className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">Scholar Aetherflow (Available)</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          Blue border shows this Aetherflow ability can be used (stacks available).
        </div>
      </div>

      <div className="p-4 mb-2 transition-all rounded border-l-4 border-l-red-500 bg-white dark:bg-neutral-800 hover:bg-black/5 dark:hover:bg-white/5 opacity-70">
        <div className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">Scholar Aetherflow (No Stacks)</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          Red border indicates no Aetherflow stacks available for this ability.
        </div>
      </div>

      <div className="p-4 mb-2 transition-all rounded border-l-4 border-l-red-500 bg-white dark:bg-neutral-800 hover:bg-black/5 dark:hover:bg-white/5 opacity-70">
        <div className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">Tank-Specific Ability (Wrong Job)</div>
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          Red border shows this tank ability cannot be used by the currently selected tank job.
        </div>
      </div>


    </div>
  );
};

export default AvailabilityIndicatorDemo;
