import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    console.log('=== SEND ANNOUNCEMENT FUNCTION STARTED ===');
    
    try {
        const base44 = createClientFromRequest(req);
        console.log('✓ Base44 client created');
        
        // Verify admin access
        const user = await base44.auth.me();
        console.log('✓ Current user:', user?.email, 'Role:', user?.role);
        
        if (!user || user.role !== 'admin') {
            console.log('✗ Unauthorized access attempt');
            return Response.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
        }

        const body = await req.json();
        console.log('✓ Request body received');

        const { announcementId, title, message, targetAudience } = body;

        if (!title || !message || !targetAudience) {
            console.log('✗ Missing required fields');
            return Response.json({ error: 'Title, message, and target audience are required' }, { status: 400 });
        }

        // Get all users
        console.log('Fetching all users...');
        let allUsers;
        try {
            allUsers = await base44.asServiceRole.entities.User.list();
            console.log(`✓ Found ${allUsers.length} total users`);
        } catch (fetchError) {
            console.error('✗ Error fetching users:', fetchError);
            return Response.json({ 
                error: 'Failed to fetch users: ' + fetchError.message 
            }, { status: 500 });
        }

        // Filter users based on target audience
        let recipients = [];
        if (targetAudience === 'all') {
            recipients = allUsers;
        } else if (targetAudience === 'trainers') {
            recipients = allUsers.filter(u => u.role === 'trainer');
        } else if (targetAudience === 'clients') {
            recipients = allUsers.filter(u => u.role === 'user' || !u.role);
        }

        console.log(`✓ Filtered to ${recipients.length} recipients for audience: ${targetAudience}`);

        // Send emails
        let emailsSent = 0;
        let emailsFailed = 0;

        for (const recipient of recipients) {
            try {
                await base44.integrations.Core.SendEmail({
                    from_name: 'EJT Fitness',
                    to: recipient.email,
                    subject: `📢 ${title}`,
                    body: `Hi ${recipient.full_name || 'there'},

${message}

---
This is a platform announcement from EJT Fitness.

Best regards,
EJT Fitness Team`
                });
                emailsSent++;
                console.log(`✓ Email sent to ${recipient.email}`);
            } catch (emailError) {
                emailsFailed++;
                console.error(`✗ Failed to send email to ${recipient.email}:`, emailError.message);
            }
        }

        console.log(`=== ANNOUNCEMENT SENT: ${emailsSent} success, ${emailsFailed} failed ===`);

        return Response.json({ 
            success: true,
            emailsSent,
            emailsFailed,
            totalRecipients: recipients.length,
            message: `Announcement sent to ${emailsSent} of ${recipients.length} recipients`
        });

    } catch (error) {
        console.error('=== SEND ANNOUNCEMENT FUNCTION FAILED ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        return Response.json({ 
            error: error.message || 'Failed to send announcement',
            details: error.toString(),
            type: error.constructor.name
        }, { status: 500 });
    }
});