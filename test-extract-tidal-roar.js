const testEvent = `"02:51.563","Ketuduke 1 Tidal Roar Dustfinger Folchart 37922 (A: 24742) (U: 81436, M: 18772, 23.05%)",""`;

// Function to extract unmitigated damage
const extractUnmitigatedDamage = (eventStr) => {
  // First, try to find the most specific pattern for unmitigated damage
  // Look for patterns like "(U: 12345)" or "(U: 12345, M: 5678, 28.00%)"
  const unmitigatedMatch = eventStr.match(/\(U:\s*(\d+)(?:[,\s]|$|\))/);

  if (unmitigatedMatch && unmitigatedMatch[1]) {
    const value = parseInt(unmitigatedMatch[1], 10);
    console.log(`Extracted unmitigated damage from U: pattern: ${value} from "${eventStr.substring(0, 100)}..."`);
    return value;
  }
  
  // Try to find the pattern for hit actions which often have a different format
  // Look for patterns like "(A: 24742) (U: 81436, M: 18772, 23.05%)"
  const hitActionMatch = eventStr.match(/\(A:[^)]*\)\s*\(U:\s*(\d+)(?:[,\s]|$|\))/);
  
  if (hitActionMatch && hitActionMatch[1]) {
    const value = parseInt(hitActionMatch[1], 10);
    console.log(`Extracted unmitigated damage from hit action pattern: ${value} from "${eventStr.substring(0, 100)}..."`);
    return value;
  }
  
  // Try to find the pattern for direct hit actions like "Tidal Roar Dustfinger Folchart 37922 (A: 24742) (U: 81436, M: 18772, 23.05%)"
  const directHitMatch = eventStr.match(/([A-Za-z\s]+)\s+([A-Za-z\s]+)\s+\d+\s+\(A:[^)]*\)\s*\(U:\s*(\d+)(?:[,\s]|$|\))/);
  
  if (directHitMatch && directHitMatch[3]) {
    const value = parseInt(directHitMatch[3], 10);
    console.log(`Extracted unmitigated damage from direct hit pattern: ${value} from "${eventStr.substring(0, 100)}..."`);
    return value;
  }
  
  // Try to find the pattern for hit actions like "Ketuduke 1 Tidal Roar Dustfinger Folchart 37922 (A: 24742) (U: 81436, M: 18772, 23.05%)"
  const hitActionMatch2 = eventStr.match(/Ketuduke\s+\d+\s+([A-Za-z\s]+)\s+([A-Za-z\s]+)\s+\d+\s+\(A:[^)]*\)\s*\(U:\s*(\d+)(?:[,\s]|$|\))/);
  
  if (hitActionMatch2 && hitActionMatch2[3]) {
    const value = parseInt(hitActionMatch2[3], 10);
    console.log(`Extracted unmitigated damage from Ketuduke hit pattern: ${value} from "${eventStr.substring(0, 100)}..."`);
    return value;
  }

  // Next, try to find damage values in the format "Tidal Roar Dustfinger Folchart 37922"
  const actionDamageMatch = eventStr.match(/([A-Za-z\s]+)\s+([A-Za-z\s]+)\s+(\d+)/);

  if (actionDamageMatch && actionDamageMatch[3]) {
    const value = parseInt(actionDamageMatch[3], 10);
    console.log(`Extracted unmitigated damage from action pattern: ${value} from "${eventStr.substring(0, 100)}..."`);
    return value;
  }

  // Also check for direct damage values (without the U: prefix)
  const directDamageMatch = eventStr.match(/(\d+)\s+(?:\([^)]*\))?\s*(?:damage|$)/);

  if (directDamageMatch && directDamageMatch[1]) {
    const value = parseInt(directDamageMatch[1], 10);
    console.log(`Extracted unmitigated damage from direct pattern: ${value} from "${eventStr.substring(0, 100)}..."`);
    return value;
  }

  return null;
};

// Test the function
const damage = extractUnmitigatedDamage(testEvent);
console.log(`Extracted damage: ${damage}`);
