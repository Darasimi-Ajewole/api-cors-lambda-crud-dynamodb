# APIGateway with CORS, Lambdas, and CRUD on DynamoDB
<!--BEGIN STABILITY BANNER-->
---

![Stability: Stable](https://img.shields.io/badge/stability-Stable-success.svg?style=for-the-badge)

> **This is a stable example. It should successfully build out of the box**
>
> This examples is built on Construct Libraries marked "Stable" and does not have any infrastructure prerequisites to build.

---
<!--END STABILITY BANNER-->

This an example of an APIGateway with CORS enabled, pointing to five Lambdas executing CRUD operations on a single DynamoDB table.

## Build

To build this app, you need to be in root folder. Then run the following:

```bash
npm install -g aws-cdk
make install
make build-watch
```

This will install the necessary CDK, then this example's dependencies, then the lambda functions' dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy to Localstack

If localstack is not runnning, Run `make up-localstack` to start up localstack, this requires docker installed on Machine.

On a separate terminal, Run `make start`. This will deploy / redeploy your Stack to your localstack environment.

After the deployment you will see the API's URL(http://crudapp.execute-api.localhost.localstack.cloud:4566/prod/), which represents the url you can then use.

## Testing

To create new entries in the DB, run the following:

```bash
curl --request POST \
  --url http://crudapp.execute-api.localhost.localstack.cloud:4566/prod/items \
  --header 'Content-Type: application/json' \
  --data '{"Product":"Cancer treatment","Inventory":10000000000}'

curl --request POST \
     --url http://crudapp.execute-api.localhost.localstack.cloud:4566/prod/items \
     --header 'Content-Type: application/json'   \
     --data '{"Product":"Insulin","Inventory":90000000000}'
```

To fetch all entries:

```bash
curl https://crudapp.execute-api.localhost.localstack.cloud:4566/local/items
```

The above should have an output similar to: `[{"Product":"Cancer treatment"...`

## The Component Structure

The whole component contains:

- An API, with CORS enabled on all HTTP Methods. (Use with caution, for production apps you will want to enable only a certain domain origin to be able to query your API.)
- Lambda pointing to `lambdas/create.ts`, containing code for __storing__ an item  into the DynamoDB table.
- Lambda pointing to `lambdas/delete-one.ts`, containing code for __deleting__ an item from the DynamoDB table.
- Lambda pointing to `lambdas/get-all.ts`, containing code for __getting all items__ from the DynamoDB table.
- Lambda pointing to `lambdas/get-one.ts`, containing code for __getting an item__ from the DynamoDB table.
- Lambda pointing to `lambdas/update-one.ts`, containing code for __updating an item__ in the DynamoDB table.
- A DynamoDB table `items` that stores the data.
- Five `LambdaIntegrations` that connect these Lambdas to the API.
