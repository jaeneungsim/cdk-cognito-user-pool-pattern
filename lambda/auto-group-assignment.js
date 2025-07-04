const { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
    /**
     * Lambda function to automatically assign users to groups during Cognito User Pool registration.
     * This function is triggered by Cognito User Pool Post-Confirmation event.
     */
    
    const userPoolId = event.userPoolId;
    const username = event.userName;
    
    try {
        // Determine group based on user attributes
        // Check if user has custom attributes or use email domain logic
        let assignedGroup = 'buyer'; // default
        
        // Check user attributes from the event
        if (event.request && event.request.userAttributes) {
            const userAttributes = event.request.userAttributes;
            
            // If user has a custom attribute 'custom:user_type', use it
            if (userAttributes['custom:user_type']) {
                assignedGroup = userAttributes['custom:user_type'];
            }
            // Otherwise, use email domain logic as fallback
            else if (userAttributes.email) {
                const email = userAttributes.email.toLowerCase();
                // Simple logic: if email contains 'seller' or certain domains, assign to seller group
                if (email.includes('seller') || email.includes('vendor') || email.includes('supplier')) {
                    assignedGroup = 'seller';
                } else {
                    assignedGroup = 'buyer';
                }
            }
        }
        
        // Ensure the group is valid
        if (!['buyer', 'seller'].includes(assignedGroup)) {
            assignedGroup = 'buyer'; // fallback to buyer
        }
        
        // Add user to the selected group
        const command = new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username: username,
            GroupName: assignedGroup
        });
        
        await cognitoClient.send(command);
        
        console.log(`Successfully assigned user ${username} to group ${assignedGroup}`);
        
        // Return the event unchanged (required for Cognito triggers)
        return event;
        
    } catch (error) {
        console.error('Error assigning user to group:', error);
        // Return the event unchanged even on error to not block user registration
        return event;
    }
};