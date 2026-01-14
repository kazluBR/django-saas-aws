# django-saas-aws

A Django survey application converted to a multi-tenant SaaS platform using AWS SaaS Builder Toolkit (SBT).

## Overview

This project demonstrates how to transform a traditional Django application into a fully-managed SaaS solution on AWS. It uses the AWS SaaS Builder Toolkit to handle tenant provisioning, isolation, and lifecycle management with support for multiple tiers (basic and advanced).

## Architecture

The solution consists of four main components:

- **Control Plane**: Manages tenant lifecycle, onboarding, and offboarding
  - Cognito authentication for tenant management
  - API Gateway for tenant registration and management
  - EventBridge for event-driven architecture
  - System admin user provisioning
- **Application Plane**: Handles tenant provisioning/deprovisioning via CodeBuild jobs
  - VPC with public/private subnets and NAT instances
  - CodeBuild projects for provisioning and deprovisioning
  - Bash scripts to create/destroy tenant resources
  - CloudFormation stack orchestration per tenant
- **Bootstrap Plane**: Creates shared infrastructure resources used across all tenants
  - S3 bucket for CloudFormation templates
  - Shared RDS MySQL database for basic tier tenants
  - ECS cluster for pooled resources
  - Docker image repository (ECR) for the Django application
  - IAM roles and security groups
- **Website**: Django survey application containerized with Docker

## Prerequisites

- AWS Account with appropriate permissions
- Node.js 20+
- Python 3.13+
- AWS CDK CLI
- Docker

## Project Structure

```
.
├── server/                    # CDK infrastructure code
│   ├── bin/                   # CDK app entry point
│   ├── lib/                   # Stack definitions
│   │   ├── app-plane-stack.ts
│   │   ├── bootstrap-stack.ts
│   │   └── control-plane-stack.ts
│   ├── policies/              # IAM policies for provisioning
│   ├── templates/             # CloudFormation templates for tenants
│   └── codebuild/             # Docker image for CodeBuild
├── scripts/                   # Provisioning/deprovisioning scripts
│   ├── provisioning.sh
│   ├── deprovisioning.sh
│   └── sbt-aws.sh
├── website/                   # Django application
│   └── survey_sample/
│       ├── survey_project/    # Django project settings
│       ├── surveys/           # Survey app
│       └── requirements.txt
└── .github/workflows/         # CI/CD pipeline
```

## Technology Stack

- **Infrastructure**: AWS CDK (TypeScript), CloudFormation
- **Backend**: Django 5.2, Python 3.13
- **Database**: MySQL (RDS for advanced tier, shared pool for basic tier)
- **Compute**: ECS Fargate, Application Load Balancer
- **Networking**: VPC with public/private subnets, NAT instances
- **CI/CD**: GitHub Actions, AWS CodeBuild
- **SaaS Framework**: AWS SaaS Builder Toolkit (@cdklabs/sbt-aws)

## Tenant Tiers

### Basic Tier

- Shared database (separate schema per tenant)
- Cost-optimized resources

### Advanced Tier

- Dedicated RDS instance per tenant
- Enhanced isolation and performance

## Getting Started

### 1. Install Dependencies

```bash
cd server
npm install
npm run build
```

### 2. Configure AWS Credentials

```bash
aws configure
```

### 3. Bootstrap CDK

```bash
npx cdk bootstrap -c adminEmail=<your-email>
```

### 4. Plan Infrastructure

```bash
npx cdk diff --all -c adminEmail=<your-email>
```

### 5. Deploy Infrastructure

```bash
npx cdk deploy --all --require-approval never -c adminEmail=<your-email>
```

## Deployment

### Manual Deployment

```bash
cd server
npm run build
npx cdk deploy --all -c adminEmail=<admin@example.com>
```

### CI/CD with GitHub Actions

The project includes a GitHub Actions workflow for automated deployment:

1. Follow this [doc](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) to configure a github actions OIDC Provider on AWS

2. Configure repository secrets:

   - `AWS_ROLE_ARN`: IAM role for OIDC authentication
   - `ADMIN_EMAIL`: Administrator email address

3. Trigger deployment via workflow dispatch

## Tenant Provisioning

Tenants are provisioned automatically through the SBT event-driven architecture:

1. Tenant registration triggers provisioning workflow
2. CodeBuild job executes provisioning script
3. CloudFormation stack creates tenant resources
4. Application URL is returned to tenant

## Tenant Management

The `sbt-aws.sh` script provides a CLI for managing tenants and users:

### Initial Setup

```bash
# Configure the script with your Control Plane stack (Use the password received in the admin_email)
./scripts/sbt-aws.sh configure ControlPlaneStack <admin_email>

# Refresh authentication tokens
./scripts/sbt-aws.sh refresh-tokens
```

### Tenant Operations

```bash
# Create tenant registrations
./scripts/sbt-aws.sh create-tenant-basic-registration
./scripts/sbt-aws.sh create-tenant-advanced-registration

# Get tenant registration details
./scripts/sbt-aws.sh get-tenant-registration <tenant_registration_id>
./scripts/sbt-aws.sh get-all-tenant-registrations [limit] [next_token]

# Update tenant registration
./scripts/sbt-aws.sh update-tenant-registration <tenant_registration_id> <key> <value>

# Delete tenant registration
./scripts/sbt-aws.sh delete-tenant-registration <tenant_registration_id>

# Get tenant information
./scripts/sbt-aws.sh get-tenant <tenant_id>
./scripts/sbt-aws.sh get-all-tenants [limit] [next_token]
```

### User Operations

```bash
# Create a new user
./scripts/sbt-aws.sh create-user

# Get user details
./scripts/sbt-aws.sh get-user <user_id>
./scripts/sbt-aws.sh get-all-users [limit] [next_token]

# Update user
./scripts/sbt-aws.sh update-user <user_id> <user_role> <user_email>

# Delete user
./scripts/sbt-aws.sh delete-user <user_id>
```

## Development

### Django Application

```bash
cd website/survey_sample
pip install -r requirements.txt
python manage.py loaddata initial_surveys
python manage.py runserver
```

## Cleanup

To completely remove all infrastructure and tenant resources:

```bash
./scripts/cleanup.sh <admin_email>
```

This script will:

1. Delete all tenant registrations and their CloudFormation stacks
2. Remove all ECR images from the repository
3. Destroy all CDK stacks (Bootstrap, Control Plane, Application Plane)
4. Delete the Cognito User Pool

## Key Features

- Multi-tenant architecture with tenant isolation
- Automated tenant provisioning and deprovisioning
- Tier-based resource allocation
- Event-driven lifecycle management
- Infrastructure as Code with AWS CDK
- Containerized Django application
- VPC networking with NAT instances for cost optimization

## License

See [LICENSE](LICENSE) file for details.

## Resources

- [AWS SaaS Builder Toolkit](https://github.com/awslabs/sbt-aws)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Django Documentation](https://docs.djangoproject.com/)
