import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.assigned_trainer_id) {
      return Response.json({ trainer: null });
    }

    // Use service role to fetch trainer details since regular users can't read other users
    const trainers = await base44.asServiceRole.entities.User.filter({ id: user.assigned_trainer_id });
    const trainer = trainers[0];

    if (!trainer) {
      return Response.json({ trainer: null });
    }

    // Return only necessary public info
    return Response.json({
      trainer: {
        id: trainer.id,
        full_name: trainer.full_name,
        display_name: trainer.display_name,
        profile_photo_url: trainer.profile_photo_url,
        specialties: trainer.specialties || null,
        email: trainer.email
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});