# AWS Cognito User Pool Pattern with CDK

A demonstration project showing how to implement common user authentication and group-based permission patterns encountered in real-world development using AWS CDK.

## Purpose

This project demonstrates how to solve common authentication challenges I've encountered in production environments, showing a simplified implementation approach for:
- User registration and authentication flow
- Automatic group assignment (buyer/seller roles)
- AWS credentials federation through Identity Pools
- Clean separation between authentication and authorization

**Note**: This is a learning-focused implementation designed to illustrate core concepts. For production use, additional security hardening, proper stack separation, and environment-specific configurations are essential.

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
- **Cognito Identity Pool**: Provides temporary AWS credentials with group context
- **IAM Conditional Policies**: Grant different S3 permissions based on group membership
- **CloudFront + S3**: Hosts the demo web application

### Permission Model

| Group  | AWS Permissions | Use Case |
|--------|----------------|----------|
| buyer  | S3 read + write access (create/delete buckets and objects) | E-commerce buyers, power users |
| seller | S3 read-only access (get objects, list buckets) | Content creators, limited users |

**Note**: Users are automatically assigned to buyer or seller groups based on their selection during registration. Group-based permissions are enforced through IAM conditional policies.

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
1. Enter the Region: `your-deployed-region` (e.g., ap-southeast-2, us-east-1)
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
3. Users will be automatically assigned to either buyer or seller groups

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
| `AWS_REGION` | AWS region for deployment | `your-preferred-region` |

### Customization

To modify user groups or permissions:

1. **Add new groups**: Edit `lib/cdk-cognito-user-pool-pattern-stack.ts`
2. **Change permissions**: Modify the IAM policy statements
3. **Update regions**: Change the region in `bin/` file

## Security Considerations

⚠️ **Critical for Production**: This demo uses simplified configurations. For production environments, ensure proper security settings:

- **Deletion Protection**: Currently `false` for easy cleanup → Enable in production
- **Token Expiration**: Uses default values → Adjust based on security requirements
- **Client Secrets**: Public client for web apps → Consider secrets for server-side applications
- **Conditional Policies**: Basic group-based permissions → Implement principle of least privilege
- **HTTPS Only**: All traffic encrypted in transit → Manage SSL/TLS certificates properly
- **Stack Separation**: Single stack for simplicity → Separate Cognito, IAM, and application stacks in production
- **Environment Configuration**: Hardcoded values → Use parameter stores and environment-specific configs

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

**Important**: This is a demonstration pattern for learning purposes. The implementation prioritizes clarity and simplicity over production-ready features. For production deployment, implement proper security controls, stack separation, and environment-specific configurations as outlined in the Security Considerations section.