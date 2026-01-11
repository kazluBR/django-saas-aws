#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ControlPlaneStack } from "../lib/control-plane-stack";
import { ApplicationPlaneStack } from "../lib/app-plane-stack";

const app = new cdk.App();
const controlPlaneStack = new ControlPlaneStack(app, "ControlPlaneStack");
new ApplicationPlaneStack(app, "AppPlaneStack", {
  eventManager: controlPlaneStack.eventManager,
});
