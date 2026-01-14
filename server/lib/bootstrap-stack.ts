import * as cdk from "aws-cdk-lib";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";
import * as path from "path";

export interface BootstrapStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  codebuildSecurityGroup: ec2.SecurityGroup;
}

export class BootstrapStack extends cdk.Stack {
  public readonly appDockerImage: ecr_assets.DockerImageAsset;
  public readonly vpc: ec2.Vpc;
  public readonly appSecurityGroup: ec2.SecurityGroup;
  public readonly taskExecutionRole: iam.Role;
  public readonly taskAppRole: iam.Role;
  public readonly ecsPoolCluster: ecs.Cluster;
  public readonly s3TemplateBucket: s3.Bucket;
  public readonly dbPoolSecurityGroup: ec2.SecurityGroup;
  public readonly dbPoolDatabase: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props: BootstrapStackProps) {
    super(scope, id, props);

    this.appDockerImage = new ecr_assets.DockerImageAsset(this, "AppImage", {
      directory: path.join(__dirname, "../../website/survey_sample"),
    });

    this.appSecurityGroup = new ec2.SecurityGroup(this, "AppSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for ECS cluster",
    });

    this.appSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP traffic"
    );

    this.appSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic"
    );

    this.taskExecutionRole = new iam.Role(this, "TaskExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ],
    });

    this.taskAppRole = new iam.Role(this, "AppTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    this.s3TemplateBucket = new s3.Bucket(this, "TenantTemplatesBucket", {
      bucketName: `tenant-templates-bucket-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    new s3deploy.BucketDeployment(this, "DeployTenantTemplates", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../templates"))],
      destinationBucket: this.s3TemplateBucket,
    });

    this.ecsPoolCluster = new ecs.Cluster(this, "EcsPoolCluster", {
      vpc: props.vpc,
      clusterName: "django-pool-cluster",
    });

    this.dbPoolSecurityGroup = new ec2.SecurityGroup(
      this,
      "PoolDatabaseSecurityGroup",
      {
        vpc: props.vpc,
        allowAllOutbound: true,
        description: "Security group for Pool Database",
      }
    );

    this.dbPoolSecurityGroup.addIngressRule(
      this.appSecurityGroup,
      ec2.Port.tcp(3306),
      "Allow MySQL access from App Security Group"
    );

    this.dbPoolSecurityGroup.addIngressRule(
      props.codebuildSecurityGroup,
      ec2.Port.tcp(3306),
      "Allow MySQL access from CodeBuild Security Group"
    );

    this.dbPoolDatabase = new rds.DatabaseInstance(this, "AppPoolDatabase", {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE4_GRAVITON,
        ec2.InstanceSize.MICRO
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [this.dbPoolSecurityGroup],
      instanceIdentifier: "app-pool-database",
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP2,
      publiclyAccessible: true,
      credentials: rds.Credentials.fromGeneratedSecret("admin", {
        secretName: "pool-database-secret",
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
      multiAz: false,
    });

    const secretArn = this.dbPoolDatabase.secret?.secretArn;

    if (secretArn) {
      this.taskAppRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:DescribeSecret",
          ],
          resources: [secretArn],
        })
      );
    }

    new cdk.CfnOutput(this, "AppEcrRepositoryUri", {
      value: this.appDockerImage.imageUri,
      description: "ECR repository URI",
      exportName: "AppEcrRepositoryUri",
    });

    new cdk.CfnOutput(this, "AppEcrRepositoryName", {
      value: this.appDockerImage.repository.repositoryName,
      description: "ECR repository name",
      exportName: "AppEcrRepositoryName",
    });

    new cdk.CfnOutput(this, "AppSecurityGroupId", {
      value: this.appSecurityGroup.securityGroupId,
      description: "ID of the App security group",
      exportName: "AppSecurityGroupId",
    });

    new cdk.CfnOutput(this, "DatabaseSecurityGroupId", {
      value: this.dbPoolSecurityGroup.securityGroupId,
      description: "ID of the Database security group",
      exportName: "DatabaseSecurityGroupId",
    });

    new cdk.CfnOutput(this, "TaskExecutionRoleArn", {
      value: this.taskExecutionRole.roleArn,
      description: "ARN of Task Execution Role",
      exportName: "TaskExecutionRoleArn",
    });

    new cdk.CfnOutput(this, "AppTaskRoleArn", {
      value: this.taskAppRole.roleArn,
      description: "ARN of App Task Role",
      exportName: "AppTaskRoleArn",
    });

    new cdk.CfnOutput(this, "TenantTemplatesBucketName", {
      value: this.s3TemplateBucket.bucketName,
      description: "Name of tenant templates bucket",
      exportName: "TenantTemplatesBucketName",
    });

    new cdk.CfnOutput(this, "EcsPoolClusterName", {
      value: this.ecsPoolCluster.clusterName,
      description: "ECS Pool Cluster Name",
      exportName: "EcsPoolClusterName",
    });

    new cdk.CfnOutput(this, "PoolDatabaseSecretName", {
      value: this.dbPoolDatabase.secret?.secretName ?? "",
      description: "Pool Database Secret Name",
      exportName: "PoolDatabaseSecretName",
    });
  }
}
