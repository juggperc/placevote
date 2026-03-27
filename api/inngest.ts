import { serve } from 'inngest/node';
import { inngest } from './_inngest.js';
import { processUpload } from './_process-upload.js';
import { buildOntology } from './_build-ontology.js';
import { computeFriction } from './_compute-friction.js';

export const config = {
  runtime: 'nodejs',
};

export default serve({
  client: inngest,
  functions: [processUpload, buildOntology, computeFriction],
});
