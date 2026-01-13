import * as sbt from "@cdklabs/sbt-aws";
import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";

export class ControlPlaneStack extends Stack {
  public readonly regApiGatewayUrl: string;
  public readonly eventManager: sbt.IEventManager;

  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id, props);

    const adminEmail = this.node.tryGetContext("adminEmail");

    if (!adminEmail) {
      throw new Error(
        "Parameter 'adminEmail' is required. Use: -c adminEmail=sample@domain.com"
      );
    }

    const cognitoAuth = new sbt.CognitoAuth(this, "CognitoAuth", {
      enableAdvancedSecurityMode: false, // only for testing purposes!
      setAPIGWScopes: false, // only for testing purposes!
    });

    const controlPlane = new sbt.ControlPlane(this, "ControlPlane", {
      auth: cognitoAuth,
      systemAdminEmail: adminEmail,
    });

    this.eventManager = controlPlane.eventManager;
    this.regApiGatewayUrl = controlPlane.controlPlaneAPIGatewayUrl;
  }
}
