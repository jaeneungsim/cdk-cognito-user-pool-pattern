#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CognitoStack, FrontendStack } from '../lib/cdk-cognito-user-pool-pattern-stack';

const app = new cdk.App();

// Cognito Stack
const cognitoStack = new CognitoStack(app, 'CognitoStack', {
  env: { region: 'ap-southeast-2' },
});

// Frontend Stack
const frontendStack = new FrontendStack(app, 'FrontendStack', {
  env: { region: 'ap-southeast-2' },
});

// Add dependency to ensure Cognito stack deploys first
frontendStack.addDependency(cognitoStack);