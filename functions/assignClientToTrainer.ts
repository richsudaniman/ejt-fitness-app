import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only trainers and admins can assign clients
    const isTrainer = user.user_type === 'trainer' || user.role === 'trainer';
    const isAdmin = user.role === 'admin';
    
    if (!isTrainer && !isAdmin) {
      return Response.json({ error: 'Permission denied' }, { status: 403 });
    }

    const { clientId, trainerId, action } = await req.json();

    if (!clientId) {
      return Response.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Trainers can only assign to themselves
    const effectiveTrainerId = isAdmin ? (trainerId || user.id) : user.id;

    if (action === 'unassign') {
      // Remove trainer assignment from user
      await base44.asServiceRole.entities.User.update(clientId, {
        assigned_trainer_id: null
      });

      // Find and delete active assignment
      const assignments = await base44.asServiceRole.entities.TrainerClientAssignment.filter({
        client_id: clientId,
        trainer_id: effectiveTrainerId,
        is_active: true
      });

      for (const assignment of assignments) {
        await base44.asServiceRole.entities.TrainerClientAssignment.delete(assignment.id);
      }

      return Response.json({ success: true, action: 'unassigned' });
    }

    // Assign action
    // Check if client is already assigned to another trainer
    const existingAssignments = await base44.asServiceRole.entities.TrainerClientAssignment.filter({
      client_id: clientId,
      is_active: true
    });

    // If trainer (not admin), check if assigned to someone else
    if (!isAdmin) {
      const assignedToOther = existingAssignments.find(a => a.trainer_id !== effectiveTrainerId);
      if (assignedToOther) {
        return Response.json({ error: 'Client is already assigned to another trainer' }, { status: 400 });
      }
    }

    // Deactivate any existing assignments for this client
    for (const assignment of existingAssignments) {
      await base44.asServiceRole.entities.TrainerClientAssignment.update(assignment.id, { is_active: false });
    }

    // Update the User entity with the trainer ID
    await base44.asServiceRole.entities.User.update(clientId, {
      assigned_trainer_id: effectiveTrainerId
    });

    // Check if assignment already exists for this trainer
    const myExistingAssignment = existingAssignments.find(a => a.trainer_id === effectiveTrainerId);
    
    if (myExistingAssignment) {
      // Reactivate existing assignment
      await base44.asServiceRole.entities.TrainerClientAssignment.update(myExistingAssignment.id, { is_active: true });
      return Response.json({ success: true, assignment: myExistingAssignment });
    }

    // Create new assignment
    const newAssignment = await base44.asServiceRole.entities.TrainerClientAssignment.create({
      trainer_id: effectiveTrainerId,
      client_id: clientId,
      assigned_date: new Date().toISOString().split('T')[0],
      is_active: true,
    });

    return Response.json({ success: true, assignment: newAssignment });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});