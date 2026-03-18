import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active assignments
    const assignments = await base44.asServiceRole.entities.TrainerClientAssignment.list();
    const activeAssignments = assignments.filter(a => a.is_active);

    // Update each client's User record with their trainer ID
    const updates = [];
    for (const assignment of activeAssignments) {
      try {
        await base44.asServiceRole.entities.User.update(assignment.client_id, {
          assigned_trainer_id: assignment.trainer_id
        });
        updates.push({ client_id: assignment.client_id, trainer_id: assignment.trainer_id, status: 'success' });
      } catch (error) {
        updates.push({ client_id: assignment.client_id, error: error.message, status: 'failed' });
      }
    }

    return Response.json({ 
      message: 'Sync complete',
      total: activeAssignments.length,
      results: updates
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});