import iot from "aws-iot-device-sdk";
import crypto from "crypto";
import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const client = new IoTClient({});
const response = await client.send(
  new DescribeEndpointCommand({ endpointType: "iot:Data-ATS" })
);
const endpoint = response.endpointAddress;

const workerID = crypto.randomBytes(16).toString("hex");
const PREFIX = `/sst/${process.env.SST_APP}/${process.env.SST_STAGE}`;

const ENVIRONMENT_IGNORE: Record<string, true> = {
  SST_DEBUG_ENDPOINT: true,
  SST_DEBUG_SRC_HANDLER: true,
  SST_DEBUG_SRC_PATH: true,
  AWS_LAMBDA_FUNCTION_MEMORY_SIZE: true,
  AWS_LAMBDA_LOG_GROUP_NAME: true,
  AWS_LAMBDA_LOG_STREAM_NAME: true,
  LD_LIBRARY_PATH: true,
  LAMBDA_TASK_ROOT: true,
  AWS_LAMBDA_RUNTIME_API: true,
  AWS_EXECUTION_ENV: true,
  AWS_XRAY_DAEMON_ADDRESS: true,
  AWS_LAMBDA_INITIALIZATION_TYPE: true,
  PATH: true,
  PWD: true,
  LAMBDA_RUNTIME_DIR: true,
  LANG: true,
  NODE_PATH: true,
  TZ: true,
  SHLVL: true,
  _AWS_XRAY_DAEMON_ADDRESS: true,
  _AWS_XRAY_DAEMON_PORT: true,
  AWS_XRAY_CONTEXT_MISSING: true,
  _HANDLER: true,
  _LAMBDA_CONSOLE_SOCKET: true,
  _LAMBDA_CONTROL_SOCKET: true,
  _LAMBDA_LOG_FD: true,
  _LAMBDA_RUNTIME_LOAD_TIME: true,
  _LAMBDA_SB_ID: true,
  _LAMBDA_SERVER_PORT: true,
  _LAMBDA_SHARED_MEM_FD: true,
};

const ENVIRONMENT = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key, _]) => ENVIRONMENT_IGNORE[key] !== true
  )
);

const device = new iot.device({
  protocol: "wss",
  debug: true,
  host: endpoint,
  region: ENVIRONMENT.AWS_REGION,
});
device.on("error", console.log);
device.on("connect", console.log);
device.subscribe(`${PREFIX}/events/${workerID}`, {
  qos: 1,
});

interface Fragment {
  id: string;
  index: number;
  count: number;
  data: string;
}

const fragments = new Map<string, Map<number, Fragment>>();

let onMessage: (evt: any) => void;

device.on("message", async (_topic, buffer: Buffer) => {
  const fragment = JSON.parse(buffer.toString()) as Fragment;
  console.log("Got fragment", fragment.id, fragment.index);
  let pending = fragments.get(fragment.id);
  if (!pending) {
    pending = new Map();
    fragments.set(fragment.id, pending);
  }
  pending.set(fragment.index, fragment);

  if (pending.size === fragment.count) {
    console.log("Got all fragments", fragment.id);
    fragments.delete(fragment.id);
    const data = [...pending.values()]
      .sort((a, b) => a.index - b.index)
      .map((item) => item.data)
      .join("");
    const evt = JSON.parse(data);
    if (evt.type === "pointer") {
      console.log("Got pointer", evt.properties);

      const result = await s3.send(
        new GetObjectCommand({
          Key: evt.properties.key,
          Bucket: evt.properties.bucket,
        })
      );
      const str = await result.Body!.transformToString();
      onMessage(JSON.parse(str));
      await s3.send(
        new DeleteObjectCommand({
          Key: evt.properties.key,
          Bucket: evt.properties.bucket,
        })
      );
      return;
    }
    onMessage(evt);
  }
});

export async function handler(event: any, context: any) {
  const result = await new Promise<any>((r) => {
    const timeout = setTimeout(() => {
      r({
        type: "function.timeout",
      });
    }, 5 * 1000);
    onMessage = (evt) => {
      if (evt.type === "function.ack") {
        if (evt.properties.workerID === workerID) {
          clearTimeout(timeout);
        }
      }
      if (["function.success", "function.error"].includes(evt.type)) {
        if (evt.properties.workerID === workerID) {
          clearTimeout(timeout);
          r(evt);
        }
      }
    };
    for (const fragment of encode({
      type: "function.invoked",
      properties: {
        workerID: workerID,
        requestID: context.awsRequestId,
        functionID: process.env.SST_FUNCTION_ID,
        deadline: context.getRemainingTimeInMillis(),
        event,
        context,
        env: ENVIRONMENT,
      },
    })) {
      device.publish(`${PREFIX}/events`, JSON.stringify(fragment), { qos: 1 });
    }
  });

  console.log("Got result", result.type);

  if (result.type === "function.timeout")
    return {
      statusCode: 500,
      body: "This function is in live debug mode but did not get a response from your machine. If you do have an `sst dev` session running and this is the first time you have ever run SST in this AWS account, it can take 10 minutes for AWS to provision the underlying infrastructure. Check back shortly.",
    };

  if (result.type === "function.success") {
    return result.properties.body;
  }

  if (result.type === "function.error") {
    const error = new Error(result.properties.errorMessage);
    error.stack = result.properties.trace?.join("\n");
    throw error;
  }
}

function encode(input: any) {
  const json = JSON.stringify(input);
  const parts = json.match(/.{1,100000}/g);
  if (!parts) return [];
  const id = Math.random().toString();
  return parts.map((part, index) => ({
    id,
    index,
    count: parts?.length,
    data: part,
  }));
}
