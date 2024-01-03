import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { App, Stack, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join, basename } from 'path'
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

const STAGE = process.env.STAGE  ?? 'local'
export class ApiLambdaCrudDynamoDBStack extends Stack {
  constructor(app: App, id: string) {
    super(app, id);

    const dynamoTable = new Table(this, 'items', {
      partitionKey: {
        name: 'itemId',
        type: AttributeType.STRING
      },
      tableName: 'items',

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
          'aws-sdk', // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      depsLockFilePath: join(__dirname, 'lambdas', 'package-lock.json'),
      environment: {
        PRIMARY_KEY: 'itemId',
        TABLE_NAME: dynamoTable.tableName,
      },
      architecture: Architecture.ARM_64,
      runtime: Runtime.NODEJS_18_X,
    }    

    // Create a Lambda function for each of the CRUD operations
    const getOneLambda = ApplicationFunction(this, 'getOneItemFunction', {
      entry: join(__dirname, 'lambdas/src', 'get-one.ts'),
      ...nodeJsFunctionProps,
    });

    const getAllLambda = ApplicationFunction(this, 'getAllItemsFunction', {
      entry: join(__dirname, 'lambdas/src', 'get-all.ts'),
      ...nodeJsFunctionProps,
    });


    const createOneLambda = ApplicationFunction(this, 'createItemFunction', {
      entry: join(__dirname, 'lambdas/src', 'create.ts'),
      ...nodeJsFunctionProps,
    });
    const updateOneLambda = ApplicationFunction(this, 'updateItemFunction', {
      entry: join(__dirname, 'lambdas/src', 'update-one.ts'),
      ...nodeJsFunctionProps,
    });
    const deleteOneLambda = ApplicationFunction(this, 'deleteItemFunction', {
      entry: join(__dirname, 'lambdas/src', 'delete-one.ts'),
      ...nodeJsFunctionProps,
    });

    // Grant the Lambda function read access to the DynamoDB table
    dynamoTable.grantReadWriteData(getAllLambda);
    dynamoTable.grantReadWriteData(getOneLambda);
    dynamoTable.grantReadWriteData(createOneLambda);
    dynamoTable.grantReadWriteData(updateOneLambda);
    dynamoTable.grantReadWriteData(deleteOneLambda);

    // Integrate the Lambda functions with the API Gateway resource
    const getAllIntegration = new LambdaIntegration(getAllLambda);
    const createOneIntegration = new LambdaIntegration(createOneLambda);
    const getOneIntegration = new LambdaIntegration(getOneLambda);
    const updateOneIntegration = new LambdaIntegration(updateOneLambda);
    const deleteOneIntegration = new LambdaIntegration(deleteOneLambda);


    // Create an API Gateway resource for each of the CRUD operations
    const api = new RestApi(this, 'itemsApi', {
      restApiName: 'Items Service'
      // In case you want to manage binary types, uncomment the following
      // binaryMediaTypes: ["*/*"],
    });

    Tags.of(api).add("_custom_id_", "crudapp");

    const items = api.root.addResource('items');
    items.addMethod('GET', getAllIntegration);
    items.addMethod('POST', createOneIntegration);
    addCorsOptions(items);

    const singleItem = items.addResource('{id}');
    singleItem.addMethod('GET', getOneIntegration);
    singleItem.addMethod('PATCH', updateOneIntegration);
    singleItem.addMethod('DELETE', deleteOneIntegration);
    addCorsOptions(singleItem);
  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    // In case you want to use binary media types, uncomment the following line
    // contentHandling: ContentHandling.CONVERT_TO_TEXT,
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    // In case you want to use binary media types, comment out the following line
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}

export function ApplicationFunction(scope: Construct, id: string, props: NodejsFunctionProps ) {
  if (STAGE=== 'local') {
    return LocalFunction(scope, id, props)
  }
  return new NodejsFunction(scope, id, props)
}

export function LocalFunction(scope: Construct, id: string, props: NodejsFunctionProps ) {
  const hotReloadBucket = Bucket.fromBucketName(scope, `HotReloadingBucket-${id}`, 'hot-reload');
  const fileName = basename(props.entry!, '.ts');
  const handler = props.handler ?? 'handler'
  const runtime = props.runtime ||  Runtime.NODEJS_18_X;

  return  new Function(scope, id, {
    ...props,
    code: Code.fromBucket(hotReloadBucket, join(__dirname, 'lambdas/build' )),
    runtime,
    handler: `${fileName}.${handler}`,
  });
}

const app = new App();
new ApiLambdaCrudDynamoDBStack(app, 'ApiLambdaCrudDynamoDBExample');
app.synth();
