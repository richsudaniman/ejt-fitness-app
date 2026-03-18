import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all active trainer assignments
    const assignments = await base44.asServiceRole.entities.TrainerClientAssignment.filter({ is_active: true });
    
    const results = [];
    
    for (const assignment of assignments) {
      try {
        // Update each client's assigned_trainer_id
        await base44.asServiceRole.entities.User.update(assignment.client_id, {
          assigned_trainer_id: assignment.trainer_id
        });
        results.push({ client_id: assignment.client_id, status: 'success' });
      } catch (err) {
        results.push({ client_id: assignment.client_id, status: 'error', message: err.message });
      }
    }

    return Response.json({ 
      message: 'Sync completed',
      total: assignments.length,
      results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});