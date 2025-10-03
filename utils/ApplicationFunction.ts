import {
  NodejsFunctionProps,
  NodejsFunction,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { LocalFunction } from "./LocalFunction";

const STAGE = process.env.STAGE ?? "local";

export function ApplicationFunction(
  scope: Construct,
  id: string,
  props: NodejsFunctionProps
) {
  if (STAGE === "local") {
    return LocalFunction(scope, id, props);
  }
  return new NodejsFunction(scope, id, props);
}
