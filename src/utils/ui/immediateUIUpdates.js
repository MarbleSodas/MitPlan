/**
 * Utility functions for immediate UI updates
 * These functions directly manipulate the DOM to provide immediate visual feedback
 * without waiting for React state updates
 */

/**
 * Update charge counters in the DOM immediately
 *
 * @param {string} mitigationId - ID of the mitigation ability
 * @param {string} bossActionId - ID of the boss action (used for context in logs)
 * @param {boolean} isAdding - Whether we're adding or removing a mitigation
 */
export const updateChargeCountersImmediately = (mitigationId, bossActionId, isAdding = true) => {
  // Log the action for debugging
  console.log(`Updating charge counters for mitigation ${mitigationId} on boss action ${bossActionId}, isAdding=${isAdding}`);
  try {
    // Try multiple selector strategies to ensure we find all relevant charge counters
    let foundCounters = false;

    // 1. First, try to find charge counters by data attributes (most specific)
    // Use multiple selectors to catch all possible charge counters
    const chargeCounters = document.querySelectorAll(
      `.ChargeCount[data-mitigation-id="${mitigationId}"], ` +
      `[data-mitigation-id="${mitigationId}"] .ChargeCount, ` +
      `span[available][data-mitigation-id="${mitigationId}"]`
    );
    if (chargeCounters.length > 0) {
      console.log(`Found ${chargeCounters.length} charge counters by data-mitigation-id`);
      chargeCounters.forEach(counter => {
        updateChargeCounter(counter, isAdding);
      });
      foundCounters = true;
    }

    // 2. Try finding by parent element with mitigation ID
    const mitigationElements = document.querySelectorAll(`[data-mitigation-id="${mitigationId}"]`);
    mitigationElements.forEach(element => {
      const chargeCounter = element.querySelector('.ChargeCount');
      if (chargeCounter) {
        console.log(`Found charge counter within parent element with data-mitigation-id`);
        updateChargeCounter(chargeCounter, isAdding);
        foundCounters = true;
      }
    });

    // 3. Try finding by mitigation ID in common attributes
    const elementsWithMitigationIdAttr = document.querySelectorAll(`[id*="${mitigationId}"], [data-id*="${mitigationId}"], [data-mitigation*="${mitigationId}"]`);
    elementsWithMitigationIdAttr.forEach(element => {
      const chargeCounter = element.querySelector('.ChargeCount');
      if (chargeCounter) {
        console.log(`Found charge counter within element with mitigation ID in attributes`);
        updateChargeCounter(chargeCounter, isAdding);
        foundCounters = true;
      }

      // Also check if the element itself is a charge counter
      if (element.classList && element.classList.contains('ChargeCount')) {
        console.log(`Found charge counter element with mitigation ID in attributes`);
        updateChargeCounter(element, isAdding);
        foundCounters = true;
      }
    });

    // 4. Last resort: find by class and content pattern
    if (!foundCounters) {
      console.log(`No charge counters found by ID, trying content pattern matching`);
      const allChargeCounters = document.querySelectorAll('.ChargeCount');
      allChargeCounters.forEach(counter => {
        const counterText = counter.textContent || '';
        if (counterText.match(/\d+\/\d+\s+(Charges|Instances)/)) {
          updateChargeCounter(counter, isAdding);
          foundCounters = true;
        }
      });
    }

    if (!foundCounters) {
      console.warn(`No charge counters found for mitigation ${mitigationId}, attempting to force update via React props`);

      // Force update via React props - this is a last resort approach
      // Find all elements that might contain the mitigation
      const mitigationItems = document.querySelectorAll('.MitigationItem, .MitigationAbility, [class*="mitigation"]');

      mitigationItems.forEach(item => {
        // Check if this item contains text matching the mitigation ID or name
        const itemText = item.textContent || '';
        if (itemText.includes(mitigationId)) {
          console.log(`Found potential mitigation item containing ID ${mitigationId}`);

          // Look for any elements with numbers that might be charge counters
          const potentialCounters = Array.from(item.querySelectorAll('*')).filter(el => {
            const text = el.textContent || '';
            return text.match(/\d+\/\d+/) && (text.includes('Charges') || text.includes('Instances'));
          });

          potentialCounters.forEach(counter => {
            console.log(`Found potential charge counter with text: ${counter.textContent}`);
            updateChargeCounter(counter, isAdding);
            foundCounters = true;
          });
        }
      });
    }
  } catch (error) {
    console.error('Error updating charge counters:', error);
  }
};

/**
 * Update a single charge counter element
 *
 * @param {HTMLElement} counterElement - The charge counter DOM element
 * @param {boolean} isAdding - Whether we're adding or removing a mitigation
 */
const updateChargeCounter = (counterElement, isAdding) => {
  try {
    // Get the current text content
    const text = counterElement.textContent;

    // Parse the current values
    const match = text.match(/(\d+)\/(\d+)/);
    if (match) {
      const currentCharges = parseInt(match[1]);
      const totalCharges = parseInt(match[2]);

      // Calculate the new value
      // For adding a mitigation, we always want to show one less charge available
      // For removing a mitigation, we always want to show one more charge available
      const newCharges = isAdding ?
        Math.max(0, currentCharges - 1) : // Decrement when adding a mitigation
        Math.min(totalCharges, currentCharges + 1); // Increment when removing a mitigation

      // Always update the text content to ensure immediate visual feedback
      // This is critical for ensuring the UI updates synchronously with the user action
      counterElement.textContent = `${newCharges}/${totalCharges} ${text.includes('Charges') ? 'Charges' : 'Instances'}`;

      // Update the available attribute for styling
      counterElement.setAttribute('available', newCharges);

      // Add a flash effect to highlight the change
      counterElement.classList.add('flash-update');
      setTimeout(() => {
        counterElement.classList.remove('flash-update');
      }, 500);

      // Log the update for debugging
      console.log(`Updated charge counter from ${currentCharges} to ${newCharges} (${text} -> ${counterElement.textContent})`);

      // Force a reflow to ensure the browser updates the DOM
      // This is a hack but can help ensure the visual update happens immediately
      void counterElement.offsetHeight;
    }
  } catch (error) {
    console.error('Error updating individual charge counter:', error);
  }
};

/**
 * Add CSS styles for the flash effect and animations
 */
export const addFlashUpdateStyles = () => {
  // Check if the styles already exist
  if (document.getElementById('flash-update-styles')) return;

  // Create a style element
  const style = document.createElement('style');
  style.id = 'flash-update-styles';
  style.textContent = `
    @keyframes flash-update {
      0% { transform: scale(1.2); background-color: rgba(255, 255, 0, 0.5); }
      100% { transform: scale(1); background-color: transparent; }
    }

    .flash-update {
      animation: flash-update 0.3s ease-in-out;
      transition: all 0.3s ease;
    }

    /* Make charge counters more visible */
    .ChargeCount {
      transition: all 0.3s ease;
      position: relative;
    }

    /* Add a subtle pulse effect to all charge counters */
    .ChargeCount[available="0"] {
      animation: pulse-empty 2s infinite;
    }

    @keyframes pulse-empty {
      0% { opacity: 0.7; }
      50% { opacity: 1; }
      100% { opacity: 0.7; }
    }
  `;

  // Add the style to the document head
  document.head.appendChild(style);

  // Set up a MutationObserver to detect when new charge counters are added to the DOM
  setupMutationObserver();
};

/**
 * Set up a MutationObserver to detect when new charge counters are added to the DOM
 * This ensures that charge counters are properly styled and updated even when they're
 * dynamically added to the DOM after the initial render
 */
const setupMutationObserver = () => {
  // Check if we've already set up the observer
  if (window._chargeCounterObserver) return;

  // Create a new MutationObserver
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Process any charge counters in this node
            const processChargeCounter = (counter) => {
              const mitigationId = counter.getAttribute('data-mitigation-id');
              if (!mitigationId) {
                const parent = counter.closest('[data-mitigation-id]');
                if (parent) {
                  counter.setAttribute('data-mitigation-id', parent.getAttribute('data-mitigation-id'));
                }
              }
            };

            // Check if the node itself is a charge counter
            if (node.classList && node.classList.contains('ChargeCount')) {
              processChargeCounter(node);
            }

            // Check for charge counters within this node
            const chargeCounters = node.querySelectorAll('.ChargeCount');
            chargeCounters.forEach(processChargeCounter);
          }
        });
      }
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Store the observer on the window object so we don't create multiple observers
  window._chargeCounterObserver = observer;
};
