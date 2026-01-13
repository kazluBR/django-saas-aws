import * as sbt from "@cdklabs/sbt-aws";
import * as cdk from "aws-cdk-lib";
import { PolicyDocument, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as fs from "fs";
import * as path from "path";

export interface ApplicationPlaneProps extends cdk.StackProps {
  eventManager: sbt.IEventManager;
}

export class ApplicationPlaneStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly codebuildSecurityGroup: ec2.SecurityGroup;
  public readonly codeBuildDockerImage: ecr_assets.DockerImageAsset;

  constructor(scope: cdk.App, id: string, props: ApplicationPlaneProps) {
    super(scope, id, props);

    const natInstanceProvider = ec2.NatProvider.instanceV2({
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.NANO
      ),
      defaultAllowedTraffic: ec2.NatTrafficDirection.OUTBOUND_ONLY,
    });

    this.vpc = new ec2.Vpc(this, "AppVpc", {
      cidr: "10.0.0.0/16",
      maxAzs: 2,
      natGatewayProvider: natInstanceProvider,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "PrivateSubnet",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    natInstanceProvider.connections.allowFrom(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.allTraffic(),
      "Allow all traffic from VPC to NAT"
    );

    this.codebuildSecurityGroup = new ec2.SecurityGroup(
      this,
      "CodeBuildSecurityGroup",
      {
        vpc: this.vpc,
        description: "Security Group for CodeBuild",
        allowAllOutbound: true,
      }
    );

    this.codeBuildDockerImage = new ecr_assets.DockerImageAsset(
      this,
      "CodeBuildImage",
      {
        directory: path.join(__dirname, "../codebuild"),
      }
    );

    const loadPolicy = (filePath: string): PolicyDocument => {
      const policyJson = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return new PolicyDocument({
        statements: policyJson.statements.map(
          (stmt: any) =>
            new PolicyStatement({
              actions: stmt.actions,
              resources: stmt.resources,
              effect: stmt.effect === "ALLOW" ? Effect.ALLOW : Effect.DENY,
            })
        ),
      });
    };

    const deprovisioningScriptJobProps: sbt.TenantLifecycleScriptJobProps = {
      permissions: loadPolicy("./policies/deprovisioning-policy.json"),
      script: fs.readFileSync("../scripts/deprovisioning.sh", "utf8"),
      environmentStringVariablesFromIncomingEvent: ["tenantName", "tier"],
      environmentVariablesToOutgoingEvent: {
        tenantData: ["tenantStatus"],
        tenantRegistrationData: ["registrationStatus"],
      },
      eventManager: props.eventManager,
      projectProps: {
        vpc: this.vpc,
        securityGroups: [this.codebuildSecurityGroup],
        subnetSelection: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        environment: {
          buildImage: codebuild.LinuxArmBuildImage.fromEcrRepository(
            this.codeBuildDockerImage.repository,
            this.codeBuildDockerImage.imageTag
          ),
          computeType: codebuild.ComputeType.SMALL,
        },
      },
    };

    const provisioningScriptJobProps: sbt.TenantLifecycleScriptJobProps = {
      permissions: loadPolicy("./policies/provisioning-policy.json"),
      script: fs.readFileSync("../scripts/provisioning.sh", "utf8"),
      environmentStringVariablesFromIncomingEvent: [
        "tenantName",
        "email",
        "tier",
      ],
      environmentVariablesToOutgoingEvent: {
        tenantData: ["tenantStatus", "tenantAppUrl"],
        tenantRegistrationData: ["registrationStatus"],
      },
      eventManager: props.eventManager,
      projectProps: {
        vpc: this.vpc,
        securityGroups: [this.codebuildSecurityGroup],
        subnetSelection: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        environment: {
          buildImage: codebuild.LinuxArmBuildImage.fromEcrRepository(
            this.codeBuildDockerImage.repository,
            this.codeBuildDockerImage.imageTag
          ),
          computeType: codebuild.ComputeType.SMALL,
        },
      },
    };

    const provisioningJobScript: sbt.ProvisioningScriptJob =
      new sbt.ProvisioningScriptJob(
        this,
        "provisioningJobScript",
        provisioningScriptJobProps
      );

    const deprovisioningJobScript: sbt.DeprovisioningScriptJob =
      new sbt.DeprovisioningScriptJob(
        this,
        "deprovisioningJobScript",
        deprovisioningScriptJobProps
      );

    new sbt.CoreApplicationPlane(this, "CoreApplicationPlane", {
      eventManager: props.eventManager,
      scriptJobs: [provisioningJobScript, deprovisioningJobScript],
    });

    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      description: "ID of the VPC",
      exportName: "VpcId",
    });

    this.vpc.publicSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PublicSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        description: `ID of public subnet ${index + 1}`,
        exportName: `PublicSubnet${index + 1}Id`,
      });
    });

    this.vpc.privateSubnets.forEach((subnet, index) => {
      new cdk.CfnOutput(this, `PrivateSubnet${index + 1}Id`, {
        value: subnet.subnetId,
        description: `ID of private subnet ${index + 1}`,
        exportName: `PrivateSubnet${index + 1}Id`,
      });
    });

    new cdk.CfnOutput(this, "CodeBuildSecurityGroupId", {
      value: this.codebuildSecurityGroup.securityGroupId,
      description: "ID of the CodeBuild security group",
      exportName: "CodebuildSecurityGroupId",
    });
  }
}
