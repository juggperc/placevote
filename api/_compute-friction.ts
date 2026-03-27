import { eq } from 'drizzle-orm';
import { inngest } from './_inngest.js';
import { db } from './_db.js';
import { ontologyNodes, ontologyEdges, frictionScores } from '../src/lib/schema.js';

export const computeFriction = inngest.createFunction(
  {
    id: 'compute-friction',
    retries: 2,
    onFailure: async ({ event, error }) => {
      const { failedJobs } = await import('../src/lib/schema');
      await db.insert(failedJobs).values({
        eventId: event.data.event.id || 'unknown',
        functionId: 'compute-friction',
        payload: event.data.event.data,
        error: error.message,
      });
    },
    triggers: [
      { event: 'upload/classified' },
      { event: 'friction/recompute' }
    ],
  },
  async ({ event, step }) => {
    const { orgId } = event.data as { orgId: string };
    if (!orgId) throw new Error('Missing orgId');

    // 1. Fetch nodes and edges
    const nodes = await step.run('fetch-nodes', async () => {
      return db.select().from(ontologyNodes).where(eq(ontologyNodes.orgId, orgId));
    });

    const edges = await step.run('fetch-edges', async () => {
      return db.select().from(ontologyEdges).where(eq(ontologyEdges.orgId, orgId));
    });

    if (nodes.length === 0) {
      return { success: true, count: 0, message: 'No nodes found for organization' };
    }

    // 2. Compute friction locally
    const scores = await step.run('compute-scores', async () => {
      const places = nodes.filter((n) => n.type === 'Place');
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      
      const rawScores: {
        placeId: string;
        suburbName: string;
        score: number;
        signalCount: number;
        issues: string[];
      }[] = [];

      let maxRawScore = 0;

      for (const place of places) {
        let negSubmissionCount = 0;
        let complaintSignalCount = 0;
        let projObjectionCount = 0;
        const issues: string[] = [];

        // Find all edges connected to this Place
        const connectedEdges = edges.filter(
          (e) => e.sourceId === place.id || e.targetId === place.id
        );

        for (const edge of connectedEdges) {
          const connectedId = edge.sourceId === place.id ? edge.targetId : edge.sourceId;
          const connectedNode = nodeMap.get(connectedId);
          if (!connectedNode) continue;

          const isNegativeMatch = (text: string) => 
            /negative|oppos|resist|against|complaint|object|issue|risk|poor|concern/i.test(text);

          const nodeTextContent = [
            connectedNode.label,
            JSON.stringify(connectedNode.properties || {})
          ].join(' ');

          // Check Submission nodes
          if (connectedNode.type === 'Submission') {
            if (isNegativeMatch(nodeTextContent) || isNegativeMatch(edge.label)) {
              negSubmissionCount++;
              issues.push(connectedNode.label);
            }
          }
          
          // Check Signal nodes
          else if (connectedNode.type === 'Signal') {
            if (isNegativeMatch(nodeTextContent) || isNegativeMatch(edge.label)) {
              complaintSignalCount++;
              issues.push(connectedNode.label);
            }
          }
          
          // Check Project nodes specifically for objection edges
          else if (connectedNode.type === 'Project') {
            if (isNegativeMatch(edge.label)) {
              projObjectionCount++;
              issues.push(`Objection to: ${connectedNode.label}`);
            }
          }
        }

        const rawScore = (negSubmissionCount * 0.40) + (complaintSignalCount * 0.35) + (projObjectionCount * 0.25);
        if (rawScore > maxRawScore) {
          maxRawScore = rawScore;
        }

        const signalCount = negSubmissionCount + complaintSignalCount + projObjectionCount;
        
        rawScores.push({
          placeId: place.id,
          suburbName: place.label, // Use label as suburb name
          score: rawScore,
          signalCount,
          issues,
        });
      }

      // Normalise 0-100 & extract top issues
      const finalScores = rawScores.map((raw) => {
        const normalisedScore = maxRawScore > 0 ? (raw.score / maxRawScore) * 100 : 0;
        
        // Count issue frequencies
        const counts = raw.issues.reduce((acc, current) => {
          acc[current] = (acc[current] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Take top 3
        const topIssues = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map((entry) => entry[0]);

        return {
          orgId,
          suburbName: raw.suburbName,
          sa2Code: 'NA', // Mocked as NA or could be extracted from properties
          score: normalisedScore,
          signalCount: raw.signalCount,
          topIssues,
        };
      });

      return finalScores;
    });

    // 3. Save to DB
    await step.run('save-scores', async () => {
      // Clean delete existing scores for org to replace natively without Drizzle UPSERT conflicts
      await db.delete(frictionScores).where(eq(frictionScores.orgId, orgId));
      
      if (scores.length > 0) {
        await db.insert(frictionScores).values(scores);
      }
    });

    return { success: true, count: scores.length };
  }
);
