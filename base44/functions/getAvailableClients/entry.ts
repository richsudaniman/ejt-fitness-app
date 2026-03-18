import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to list all users (trainers can't list users directly)
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Filter to only clients (not admins or trainers)
    const clients = allUsers.filter(u => 
      u.role !== 'admin' && 
      u.user_type !== 'trainer' && 
      u.role !== 'trainer'
    );

    // Get all active trainer-client assignments
    const assignments = await base44.asServiceRole.entities.TrainerClientAssignment.filter({ is_active: true });

    return Response.json({ 
      clients,
      assignments,
      trainerId: user.id
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});