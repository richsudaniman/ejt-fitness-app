import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { full_name, bio, specialties, phone, profile_photo_url } = body;

        // Use service role to ensure we have permission to update all fields
        // strictly for the authenticated user
        const updatedUser = await base44.asServiceRole.entities.User.update(user.id, {
            full_name,
            bio,
            specialties,
            phone,
            profile_photo_url
        });

        return Response.json(updatedUser);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});