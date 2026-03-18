import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is a trainer or admin
        const isTrainer = user.user_type === 'trainer' || user.role === 'trainer';
        const isAdmin = user.role === 'admin';

        if (!isTrainer && !isAdmin) {
            return Response.json({ error: 'Only trainers and admins can update client calorie goals' }, { status: 403 });
        }

        const { clientId, calorieTarget } = await req.json();

        if (!clientId || !calorieTarget) {
            return Response.json({ error: 'clientId and calorieTarget are required' }, { status: 400 });
        }

        // Verify trainer has this client assigned (for trainers only, admins can update any)
        if (isTrainer && !isAdmin) {
            const assignments = await base44.asServiceRole.entities.TrainerClientAssignment.filter({
                trainer_id: user.id,
                client_id: clientId,
                is_active: true
            });
            
            if (assignments.length === 0) {
                return Response.json({ error: 'Client not assigned to this trainer' }, { status: 403 });
            }
        }

        // Update the client's calorie target using service role
        await base44.asServiceRole.entities.User.update(clientId, {
            daily_calorie_target: parseInt(calorieTarget)
        });

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});