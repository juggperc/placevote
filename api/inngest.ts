import { serve } from 'inngest/node';
import { inngest } from './_inngest';
import { processUpload } from './_process-upload';
import { buildOntology } from './_build-ontology';
import { computeFriction } from './_compute-friction';

/**
 * Inngest serve endpoint — Vercel discovers this at /api/inngest.
 * Handles registration (GET) and event dispatch (POST/PUT).
 */
export default serve({
  client: inngest,
  functions: [processUpload, buildOntology, computeFriction],
});
