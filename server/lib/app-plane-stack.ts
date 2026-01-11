import * as sbt from "@cdklabs/sbt-aws";
import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";

export interface AppPlaneProps extends cdk.StackProps {
  eventManager: sbt.IEventManager;
}

export class ApplicationPlaneStack extends Stack {
  constructor(scope: Construct, id: string, props: AppPlaneProps) {
    super(scope, id, props);

    new sbt.CoreApplicationPlane(this, "CoreApplicationPlane", {
      eventManager: props.eventManager,
      scriptJobs: [],
    });
  }
}
