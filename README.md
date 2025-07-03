# AWS Cognito User Pool Pattern with CDK

A production-ready AWS CDK pattern demonstrating how to implement user authentication with group-based permissions using Amazon Cognito User Pools and Identity Pools.

## Purpose

This project showcases a standard, secure authentication architecture that demonstrates:
- User registration and authentication flow
- Group-based permission management (buyer/seller roles)
- AWS credentials federation through Identity Pools
- Clean separation between authentication and authorization

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Pool     │────│  Identity Pool   │────│  AWS Resources  │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ • S3 Buckets    │
│ │ buyer group │ │────│ │ Conditional  │ │────│ • DynamoDB      │
│ └─────────────┘ │    │ │ IAM Policies │ │    │ • Lambda        │
│ ┌─────────────┐ │    │ └──────────────┘ │    │ • etc...        │
│ │seller group │ │    │                  │    │                 │
│ └─────────────┘ │    └──────────────────┘    └─────────────────┘
└─────────────────┘

        │                        │                        │
        ▼                        ▼                        ▼
   Authentication           Authorization            Resource Access
   (Who you are)         (What you can do)        (AWS API Calls)
```

### Components

- **Cognito User Pool**: Handles user registration, authentication, and group membership
- **Cognito Identity Pool**: Provides temporary AWS credentials based on user groups
- **IAM Conditional Policies**: Grant different permissions based on group membership
- **CloudFront + S3**: Hosts the demo web application

### Permission Model

| Group  | AWS Permissions | Use Case |
|--------|----------------|----------|
| buyer  | PowerUser (Full access except IAM) | E-commerce buyers, power users |
| seller | ReadOnly (View-only access) | Content creators, limited users |

## When to Use This Pattern

### Ideal For:
- **B2B SaaS applications** with role-based access
- **E-commerce platforms** with buyer/seller distinctions
- **Multi-tenant applications** requiring user segmentation
- **Enterprise applications** needing fine-grained permissions
- **Learning AWS authentication** best practices

### Not Suitable For:
- Simple single-role applications
- Applications not requiring AWS resource access
- High-frequency permission changes
- Complex hierarchical role structures

## Prerequisites

- AWS CLI configured with appropriate permissions
- Node.js 18+ and npm
- AWS CDK CLI (`npm install -g aws-cdk`)
- An AWS account with Cognito and IAM permissions

## Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd cdk-cognito-user-pool-pattern
   npm install
   ```

2. **Configure AWS Profile**
   ```bash
   export AWS_PROFILE=your-profile-name
   ```

3. **Bootstrap CDK (if first time)**
   ```bash
   cdk bootstrap
   ```

4. **Deploy the infrastructure**
   ```bash
   cdk deploy --all
   ```

5. **Note the outputs**
   ```bash
   # Save these values from the deployment output:
   # - CognitoStack.UserPoolId
   # - CognitoStack.UserPoolClientId  
   # - CognitoStack.IdentityPoolId
   # - FrontendStack.WebsiteURL
   ```

## Usage

### 1. Access the Demo Application

Visit the deployed website URL from the CloudFormation outputs:
```
https://your-cloudfront-domain.cloudfront.net
```

### 2. Configure Cognito Settings

On the web interface:
1. Enter the Region: `ap-southeast-2`
2. Paste the User Pool ID from deployment outputs
3. Paste the Client ID from deployment outputs
4. Paste the Identity Pool ID from deployment outputs
5. Click "Initialize Cognito"

### 3. Test User Registration

1. Fill in the registration form
2. Select either "Buyer" or "Seller" group
3. Click "Register User"
4. Check your email for verification code
5. Enter the code and verify

### 4. Test Authentication

1. Login with your credentials
2. Click "Get AWS Credentials" to see temporary AWS credentials
3. Notice different permissions based on your group

### 5. Test Permissions (Optional)

Use the temporary AWS credentials with AWS CLI:

```bash
# Configure temporary credentials
export AWS_ACCESS_KEY_ID=<access-key-from-web-interface>
export AWS_SECRET_ACCESS_KEY=<secret-key-from-web-interface>
export AWS_SESSION_TOKEN=<session-token-from-web-interface>

# Test permissions
aws s3 ls  # Should work for both groups
aws ec2 create-instance  # Should work for buyer, fail for seller
```

## Project Structure

```
├── bin/
│   └── cdk-cognito-user-pool-pattern.ts    # CDK app entry point
├── lib/
│   └── cdk-cognito-user-pool-pattern-stack.ts  # Main stack definitions
├── web/
│   └── index.html                           # Demo web application
├── package.json                             # Dependencies
└── README.md                                # This file
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_PROFILE` | AWS profile to use | (required) |
| `AWS_REGION` | AWS region for deployment | `ap-southeast-2` |

### Customization

To modify user groups or permissions:

1. **Add new groups**: Edit `lib/cdk-cognito-user-pool-pattern-stack.ts`
2. **Change permissions**: Modify the IAM policy statements
3. **Update regions**: Change the region in `bin/` file

## Security Considerations

- **Deletion Protection**: Set to `false` for demo, enable in production
- **Token Expiration**: Configured with reasonable defaults (60min access, 30 days refresh)
- **No Client Secrets**: Uses public client for web applications
- **Conditional Policies**: Permissions granted only when user is in specific group
- **HTTPS Only**: All traffic encrypted in transit

## Cleanup

To avoid ongoing charges:

```bash
cdk destroy --all
```

This will remove all AWS resources created by this pattern.

## Learn More

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [CDK Cognito Examples](https://github.com/aws/aws-cdk/tree/main/packages/aws-cdk-lib/aws-cognito)
- [Identity Pool Role Mapping](https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Note**: This is a demonstration pattern. For production use, review security settings, enable deletion protection, and customize permissions according to your specific requirements.