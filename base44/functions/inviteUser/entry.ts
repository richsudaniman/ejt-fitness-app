import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== INVITE USER FUNCTION STARTED ===');
    
    try {
        const base44 = createClientFromRequest(req);
        console.log('✓ Base44 client created');
        
        // Verify admin access
        let user;
        try {
            user = await base44.auth.me();
            console.log('✓ Current user:', user?.email, 'Role:', user?.role);
        } catch (authError) {
            console.error('✗ Auth error:', authError);
            return Response.json({ error: 'Authentication failed: ' + authError.message }, { status: 401 });
        }
        
        if (!user || user.role !== 'admin') {
            console.log('✗ Unauthorized access attempt');
            return Response.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
        }

        let body;
        try {
            body = await req.json();
            console.log('✓ Request body received:', JSON.stringify(body, null, 2));
        } catch (parseError) {
            console.error('✗ Error parsing request body:', parseError);
            return Response.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { email, full_name, role, phone, bio, specialties, assigned_trainer_id } = body;

        // Validation
        if (!email || !full_name) {
            console.log('✗ Missing required fields');
            return Response.json({ error: 'Email and full name are required' }, { status: 400 });
        }

        const validRoles = ['user', 'trainer', 'admin'];
        if (role && !validRoles.includes(role)) {
            console.log('✗ Invalid role:', role);
            return Response.json({ error: 'Invalid role specified' }, { status: 400 });
        }

        // For clients, trainer assignment is required
        if (role === 'user' && !assigned_trainer_id) {
            console.log('✗ Client without trainer assignment');
            return Response.json({ error: 'Clients must be assigned to a trainer' }, { status: 400 });
        }

        // Build user data
        const userData = {
            email: email.trim(),
            full_name: full_name.trim(),
        };

        // Handle role mapping
        if (role === 'admin') {
            userData.role = 'admin';
            userData.user_type = 'client'; // Default, though not really used for admins
        } else if (role === 'trainer') {
            userData.role = 'user'; // Base44 role
            userData.user_type = 'trainer'; // Custom field
        } else {
            userData.role = 'user'; // Base44 role
            userData.user_type = 'client'; // Custom field
        }

        // Add optional fields
        if (phone && phone.trim()) {
            userData.phone = phone.trim();
        }
        if (bio && bio.trim()) {
            userData.bio = bio.trim();
        }
        if (role === 'trainer' && specialties && specialties.trim()) {
            userData.specialties = specialties.trim();
        }

        console.log('✓ Attempting to create user with data:', JSON.stringify(userData, null, 2));

        // Create user
        let newUser;
        try {
            newUser = await base44.asServiceRole.entities.User.create(userData);
            console.log('✓ User created successfully:', {
                id: newUser.id,
                email: newUser.email,
                role: newUser.role,
                user_type: newUser.user_type
            });
        } catch (createError) {
            console.error('✗ Error creating user:', {
                name: createError.name,
                message: createError.message,
                stack: createError.stack,
                response: createError.response?.data
            });
            return Response.json({ 
                error: 'Failed to create user',
                details: createError.message,
                serverResponse: createError.response?.data
            }, { status: 500 });
        }

        // Handle trainer-specific post-creation tasks
        if (role === 'trainer') {
            try {
                console.log('Sending trainer welcome email...');
                await base44.integrations.Core.SendEmail({
                    from_name: 'EJT Fitness',
                    to: email,
                    subject: 'Welcome to EJT Fitness - Trainer Account Created',
                    body: `Hi ${full_name},

Welcome to EJT Fitness! Your trainer account has been created.

Login Email: ${email}

As a trainer, you can:
- Manage your assigned clients
- Create custom workout and nutrition plans
- Upload exercise videos
- Track client progress
- Send messages and notifications

Please log in to the trainer portal to get started.

Best regards,
EJT Fitness Team`
                });
                console.log('✓ Trainer welcome email sent');
            } catch (emailError) {
                console.error('✗ Error sending trainer email (non-critical):', emailError.message);
            }
        }

        // Handle client-specific post-creation tasks
        if (role === 'user' && assigned_trainer_id) {
            try {
                console.log('Creating trainer-client assignment...');
                const assignment = await base44.asServiceRole.entities.TrainerClientAssignment.create({
                    trainer_id: assigned_trainer_id,
                    client_id: newUser.id,
                    assigned_date: new Date().toISOString().split('T')[0],
                    is_active: true
                });
                console.log('✓ Trainer-client assignment created:', assignment.id);
                
                // Update user with assigned_trainer_id
                await base44.asServiceRole.entities.User.update(newUser.id, {
                    assigned_trainer_id: assigned_trainer_id
                });
                console.log('✓ User updated with trainer assignment');
                
                // Send notification to trainer
                try {
                    const allUsers = await base44.asServiceRole.entities.User.list();
                    const trainer = allUsers.find(u => u.id === assigned_trainer_id);
                    
                    if (trainer?.email) {
                        await base44.integrations.Core.SendEmail({
                            from_name: 'EJT Fitness',
                            to: trainer.email,
                            subject: `New Client Assigned: ${full_name}`,
                            body: `Hi ${trainer.full_name || 'Trainer'},

A new client has been assigned to you:

Client Name: ${full_name}
Client Email: ${email}
${phone ? `Phone: ${phone}` : ''}

Please log in to the trainer portal to start creating their workout and nutrition plans.

Best regards,
EJT Fitness Team`
                        });
                        console.log('✓ Notification sent to trainer');
                    }
                } catch (notifyError) {
                    console.error('✗ Error sending trainer notification (non-critical):', notifyError.message);
                }
                
                // Send welcome email to client
                try {
                    await base44.integrations.Core.SendEmail({
                        from_name: 'EJT Fitness',
                        to: email,
                        subject: 'Welcome to EJT Fitness - Your Fitness Journey Starts Now!',
                        body: `Hi ${full_name},

Welcome to EJT Fitness! Your client account has been created and you've been assigned to your personal trainer.

Login Email: ${email}

Your trainer will be creating a custom workout and nutrition plan for you. You'll receive notifications when your plans are ready.

Best regards,
EJT Fitness Team`
                    });
                    console.log('✓ Welcome email sent to client');
                } catch (emailError) {
                    console.error('✗ Error sending client email (non-critical):', emailError.message);
                }
            } catch (assignError) {
                console.error('✗ Error in client assignment flow:', assignError);
                return Response.json({ 
                    success: true,
                    user: newUser,
                    warning: 'User created but trainer assignment failed: ' + assignError.message,
                    message: `Client account created successfully for ${email}, but there was an issue with the trainer assignment. Please assign manually.`
                }, { status: 200 });
            }
        }

        // Handle admin-specific post-creation tasks
        if (role === 'admin') {
            try {
                console.log('Sending admin welcome email...');
                await base44.integrations.Core.SendEmail({
                    from_name: 'EJT Fitness',
                    to: email,
                    subject: 'Welcome to EJT Fitness - Admin Access Granted',
                    body: `Hi ${full_name},

Welcome to EJT Fitness! Your admin account has been created.

Login Email: ${email}

As an admin, you have full platform access to manage users, trainers, and all content.

Please log in to the admin portal to get started.

Best regards,
EJT Fitness Team`
                });
                console.log('✓ Admin welcome email sent');
            } catch (emailError) {
                console.error('✗ Error sending admin email (non-critical):', emailError.message);
            }
        }

        console.log('=== INVITE USER FUNCTION COMPLETED SUCCESSFULLY ===');
        
        const roleNames = {
            'user': 'Client',
            'trainer': 'Trainer',
            'admin': 'Admin'
        };
        
        return Response.json({ 
            success: true, 
            user: newUser,
            message: `${roleNames[role || 'user']} account created successfully. Welcome email sent to ${email}.` 
        }, { status: 200 });

    } catch (error) {
        console.error('=== INVITE USER FUNCTION FAILED ===');
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        
        return Response.json({ 
            error: 'Internal server error',
            details: error.message,
            type: error.name
        }, { status: 500 });
    }
});