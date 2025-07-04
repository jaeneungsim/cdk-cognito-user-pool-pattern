import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { IdentityPool, UserPoolAuthenticationProvider, IdentityPoolProviderUrl } from 'aws-cdk-lib/aws-cognito-identitypool';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

// Cognito Stack
export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: IdentityPool;
  public readonly buyerGroup: cognito.UserPoolGroup;
  public readonly sellerGroup: cognito.UserPoolGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Lambda function for automatic group assignment
    const autoGroupAssignmentLambda = new lambda.Function(this, 'AutoGroupAssignmentLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auto-group-assignment.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    // Create User Pool with best practices
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'cognito-user-pool-pattern',
      signInCaseSensitive: false,
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: 'Verify your email for our app!',
        emailBody: 'Thanks for signing up! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: 'Your verification code is {####}',
      },
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        user_type: new cognito.StringAttribute({
          mutable: true,
        }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      lambdaTriggers: {
        postConfirmation: autoGroupAssignmentLambda,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false, // Set to true in production
    });

    // Create User Pool Client with best practices
    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      userPoolClientName: 'cognito-user-pool-client',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30),
      enableTokenRevocation: true,
    });

    // Create Identity Pool first
    this.identityPool = new IdentityPool(this, 'IdentityPool', {
      identityPoolName: 'cognito-identity-pool-pattern',
      allowUnauthenticatedIdentities: false,
      authenticationProviders: {
        userPools: [
          new UserPoolAuthenticationProvider({
            userPool: this.userPool,
            userPoolClient: this.userPoolClient,
          }),
        ],
      },
    });

    // Create User Pool Groups without IAM roles to avoid circular dependency
    this.buyerGroup = this.userPool.addGroup('BuyerGroup', {
      groupName: 'buyer',
      description: 'Buyer group',
    });

    this.sellerGroup = this.userPool.addGroup('SellerGroup', {
      groupName: 'seller',
      description: 'Seller group',
    });

    // Base S3 permissions for all authenticated users (read operations)
    this.identityPool.authenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:ListAllMyBuckets',
          's3:ListBucket'
        ],
        resources: ['*'],
      })
    );

    // Conditional S3 permissions for buyer group (write operations)
    this.identityPool.authenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:CreateBucket',
          's3:DeleteBucket',
          's3:DeleteObject',
          's3:PutObject'
        ],
        resources: ['*'],
        conditions: {
          'ForAnyValue:StringEquals': {
            'cognito-identity.amazonaws.com:groups': ['buyer']
          }
        }
      })
    );

    // Grant Lambda permissions to add users to groups (using wildcard to avoid circular dependency)
    autoGroupAssignmentLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:AdminAddUserToGroup'],
        resources: ['*'],
      })
    );


    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'CognitoUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'CognitoUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.identityPoolId,
      description: 'Cognito Identity Pool ID',
      exportName: 'CognitoIdentityPoolId',
    });

    new cdk.CfnOutput(this, 'AuthenticatedRoleArn', {
      value: this.identityPool.authenticatedRole.roleArn,
      description: 'Identity Pool Authenticated Role ARN (with group-based permissions)',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });
  }
}

// Frontend Stack - S3 & CloudFront
export class FrontendStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for static website
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 Origin
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(this.bucket);

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });

    // Deploy web assets to S3 with CloudFront invalidation
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('web')],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Website URL',
    });
  }
}
