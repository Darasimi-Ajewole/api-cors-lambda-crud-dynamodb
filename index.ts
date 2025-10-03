import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { App, Stack, RemovalPolicy, Tags, CfnOutput } from "aws-cdk-lib";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";
import { ApplicationFunction } from "./utils/ApplicationFunction";
import { addCorsOptions } from "./utils/addCorsOptions";

export class ApiLambdaCrudDynamoDBStack extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    const dynamoTable = new Table(this, "items", {
      partitionKey: {
        name: "itemId",
        type: AttributeType.STRING,
      },
      tableName: "items",

      /**
       *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new table, and it will remain in your account until manually deleted. By setting the policy to
       * DESTROY, cdk destroy will delete the table (even if it has data in it)
       */
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          "aws-sdk", // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, "lambdas", "package-lock.json"),
      environment: {
        PRIMARY_KEY: "itemId",
        TABLE_NAME: dynamoTable.tableName,
      },
      architecture: Architecture.ARM_64,
      runtime: Runtime.NODEJS_LATEST,
    };

    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, "itemsApi", {
      restApiName: "Items Service",
      // In case you want to manage binary types, uncomment the following
      // binaryMediaTypes: ["*/*"],
    });

    Tags.of(api).add("_custom_id_", "crudapp");

    // setup /items/{id} resources and add CORS options
    const items = api.root.addResource("items");
    const singleItem = items.addResource("{id}");

    addCorsOptions(items);
    addCorsOptions(singleItem);

    const lambdas = [
      {
        filename: "get-one.ts",
        functionName: "getOneItemFunction",
        resource: singleItem,
        method: "GET",
      },
      {
        filename: "get-all.ts",
        functionName: "getAllItemsFunction",
        resource: items,
        method: "GET",
      },
      {
        filename: "create.ts",
        functionName: "createItemFunction",
        resource: items,
        method: "POST",
      },
      {
        filename: "update-one.ts",
        functionName: "updateItemFunction",
        resource: singleItem,
        method: "PATCH",
      },
      {
        filename: "delete-one.ts",
        functionName: "deleteItemFunction",
        resource: singleItem,
        method: "DELETE",
      },
    ];

    lambdas.forEach(({ filename, functionName, resource, method }) => {
      const lambdaFunction = ApplicationFunction(this, functionName, {
        entry: join(__dirname, "lambdas/src", filename),
        ...nodeJsFunctionProps,
      });

      dynamoTable.grantReadWriteData(lambdaFunction);
      const integration = new LambdaIntegration(lambdaFunction);

      resource.addMethod(method, integration);

      new CfnOutput(this, `${functionName}Url`, {
        value: `${method} ${api.urlForPath(resource.path)}`,
        description: `URL for ${functionName}`,
      });
    });
  }
}

const app = new App();
new ApiLambdaCrudDynamoDBStack(app, "ApiLambdaCrudDynamoDBExample");
app.synth();
