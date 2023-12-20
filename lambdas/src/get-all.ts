import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.TABLE_NAME || "";

const client = new DynamoDBClient({
  endpoint: `${process.env.AWS_ENDPOINT_URL || ""}`,
});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (): Promise<any> => {
  const params = {
    TableName: TABLE_NAME,
  };

  const command = new ScanCommand(params);

  try {
    const response = await docClient.send(command);
    return {
      statusCode: 200,
      body: JSON.stringify(response.Items),
    };
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};
