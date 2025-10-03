import { Runtime, Function, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { hash } from "crypto";
import { readFileSync } from "fs";
import { basename, resolve } from "path";

export function LocalFunction(
  scope: Construct,
  id: string,
  props: NodejsFunctionProps
) {
  const hotReloadBucket = Bucket.fromBucketName(
    scope,
    `HotReloadingBucket-${id}`,
    "hot-reload"
  );

  if (!props.entry) throw new Error("Entry point is required");

  const fileName = basename(props.entry, ".ts");
  const handler = props.handler ?? "handler";
  const runtime = props.runtime || Runtime.NODEJS_18_X;

  return new Function(scope, id, {
    ...props,
    code: Code.fromBucket(
      hotReloadBucket,
      resolve(__dirname, "../lambdas/build"),
      hash("sha256", readFileSync(props.entry))
    ),
    runtime,
    handler: `${fileName}.${handler}`,
  });
}
