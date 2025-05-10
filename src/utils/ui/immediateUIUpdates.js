/**
 * Utility functions for immediate UI updates
 * These functions directly manipulate the DOM to provide immediate visual feedback
 * without waiting for React state updates
 */

/**
 * Update charge counters in the DOM immediately
 *
 * @param {string} mitigationId - ID of the mitigation ability
 * @param {string} bossActionId - ID of the boss action
 * @param {boolean} isAdding - Whether we're adding or removing a mitigation
 */
export const updateChargeCountersImmediately = (mitigationId, bossActionId, isAdding = true) => {
  try {
    // First, try to find charge counters by data attributes (most specific)
    const chargeCounters = document.querySelectorAll(`.ChargeCount[data-mitigation-id="${mitigationId}"]`);

    if (chargeCounters.length > 0) {
      // Update all found charge counters
      chargeCounters.forEach(counter => {
        updateChargeCounter(counter, isAdding);
      });
      return; // Exit early if we found and updated counters
    }

    // If no charge counters are found with data attributes, try more aggressive approaches

    // 1. Try to find by parent element with mitigation ID
    const mitigationElements = document.querySelectorAll(`[data-mitigation-id="${mitigationId}"]`);
    let foundCounter = false;

    mitigationElements.forEach(element => {
      const chargeCounter = element.querySelector('.ChargeCount');
      if (chargeCounter) {
        updateChargeCounter(chargeCounter, isAdding);
        foundCounter = true;
      }
    });

    if (foundCounter) return; // Exit if we found counters this way

    // 2. Try to find by mitigation name in the DOM
    // This is a fallback approach for when data attributes aren't available
    const allMitigationItems = document.querySelectorAll('.MitigationItem, [class*="mitigation"]');

    allMitigationItems.forEach(item => {
      // Check if this item contains the mitigation ID or name
      const itemText = item.textContent || '';
      const hasMitigationId = itemText.includes(mitigationId);

      // If this item is for our mitigation, find and update its charge counter
      if (hasMitigationId) {
        const chargeCounter = item.querySelector('.ChargeCount');
        if (chargeCounter) {
          updateChargeCounter(chargeCounter, isAdding);
          foundCounter = true;
        }
      }
    });

    if (foundCounter) return; // Exit if we found counters this way

    // 3. Last resort: update all charge counters that match the pattern
    // This is the most aggressive approach and should only be used if all else fails
    const allChargeCounters = document.querySelectorAll('.ChargeCount');

    allChargeCounters.forEach(counter => {
      const counterText = counter.textContent || '';
      // Look for counters with the pattern "X/Y Charges" or "X/Y Instances"
      if (counterText.match(/\d+\/\d+\s+(Charges|Instances)/)) {
        updateChargeCounter(counter, isAdding);
      }
    });
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
      const newCharges = isAdding ?
        Math.max(0, currentCharges - 1) : // Decrement when adding a mitigation
        Math.min(totalCharges, currentCharges + 1); // Increment when removing a mitigation

      // Only update if the value would actually change
      if (newCharges !== currentCharges) {
        // Store the original text for reference
        const originalText = counterElement.textContent;

        // Create a temporary element to show the animation
        const tempElement = document.createElement('span');
        tempElement.className = 'charge-counter-animation';
        tempElement.textContent = isAdding ? '-1' : '+1';
        tempElement.style.position = 'absolute';
        tempElement.style.color = isAdding ? 'red' : 'green';
        tempElement.style.fontWeight = 'bold';
        tempElement.style.fontSize = '14px';
        tempElement.style.opacity = '1';
        tempElement.style.transition = 'all 0.5s ease-out';
        tempElement.style.zIndex = '9999';

        // Position the temp element near the counter
        const rect = counterElement.getBoundingClientRect();
        tempElement.style.left = `${rect.left + rect.width / 2}px`;
        tempElement.style.top = `${rect.top - 10}px`;

        // Add the temp element to the document
        document.body.appendChild(tempElement);

        // Animate the temp element
        setTimeout(() => {
          tempElement.style.opacity = '0';
          tempElement.style.transform = 'translateY(-20px)';
        }, 10);

        // Remove the temp element after animation
        setTimeout(() => {
          document.body.removeChild(tempElement);
        }, 500);

        // Update the text content
        counterElement.textContent = `${newCharges}/${totalCharges} ${text.includes('Charges') ? 'Charges' : 'Instances'}`;

        // Update the available attribute for styling
        counterElement.setAttribute('available', newCharges);

        // Add a flash effect to highlight the change
        counterElement.classList.add('flash-update');
        setTimeout(() => {
          counterElement.classList.remove('flash-update');
        }, 500);

        // Log the update for debugging
        console.log(`Updated charge counter from ${currentCharges} to ${newCharges} (${originalText} -> ${counterElement.textContent})`);
      }
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
      50% { transform: scale(1.5); background-color: rgba(255, 255, 0, 0.8); }
      100% { transform: scale(1); background-color: transparent; }
    }

    .flash-update {
      animation: flash-update 0.5s ease-in-out;
      transition: all 0.3s ease;
    }

    @keyframes charge-counter-animation {
      0% { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-20px); }
    }

    .charge-counter-animation {
      animation: charge-counter-animation 0.5s ease-out forwards;
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
    // For each mutation
    mutations.forEach(mutation => {
      // If nodes were added
      if (mutation.addedNodes.length) {
        // Check each added node
        mutation.addedNodes.forEach(node => {
          // If it's an element node
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if it's a charge counter
            if (node.classList && node.classList.contains('ChargeCount')) {
              // Make sure it has the data-mitigation-id attribute
              const mitigationId = node.getAttribute('data-mitigation-id');
              if (!mitigationId) {
                // Try to find the mitigation ID from a parent element
                const parent = node.closest('[data-mitigation-id]');
                if (parent) {
                  node.setAttribute('data-mitigation-id', parent.getAttribute('data-mitigation-id'));
                }
              }
            }

            // Check for charge counters within this node
            const chargeCounters = node.querySelectorAll('.ChargeCount');
            chargeCounters.forEach(counter => {
              // Make sure it has the data-mitigation-id attribute
              const mitigationId = counter.getAttribute('data-mitigation-id');
              if (!mitigationId) {
                // Try to find the mitigation ID from a parent element
                const parent = counter.closest('[data-mitigation-id]');
                if (parent) {
                  counter.setAttribute('data-mitigation-id', parent.getAttribute('data-mitigation-id'));
                }
              }
            });
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
