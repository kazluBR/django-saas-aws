#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ControlPlaneStack } from "../lib/control-plane-stack";
import { ApplicationPlaneStack } from "../lib/app-plane-stack";
import { BootstrapStack } from "../lib/bootstrap-stack";

const app = new cdk.App();
const controlPlaneStack = new ControlPlaneStack(app, "ControlPlaneStack");
const appPlaneStack = new ApplicationPlaneStack(app, "AppPlaneStack", {
  eventManager: controlPlaneStack.eventManager,
});
new BootstrapStack(app, "BootstrapStack", {
  vpc: appPlaneStack.vpc,
  codebuildSecurityGroup: appPlaneStack.codebuildSecurityGroup,
});
