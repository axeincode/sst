import {
  CloudFormationClient,
  DeleteStackCommand,
} from "@aws-sdk/client-cloudformation";
import type { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import { useBus } from "../bus.js";
import { useAWSClient, useAWSProvider } from "../credentials.js";
import { Logger } from "../logger.js";
import { StackDeploymentResult, monitor, isFailed } from "./monitor.js";

export async function removeMany(stacks: CloudFormationStackArtifact[]) {
  await useAWSProvider();
  const bus = useBus();
  const complete = new Set<string>();
  const todo = new Set(stacks.map((s) => s.id));

  const results: Record<string, StackDeploymentResult> = {};

  return new Promise<typeof results>((resolve) => {
    async function trigger() {
      for (const stack of stacks) {
        if (!todo.has(stack.id)) continue;
        Logger.debug("Checking if", stack.id, "can be removed");

        const waiting = stacks.filter((dependant) => {
          if (dependant.id === stack.id) return false;
          if (complete.has(dependant.id)) return false;
          return dependant.dependencies?.some((d) => d.id === stack.id);
        });
        if (waiting.length) {
          Logger.debug(
            "Waiting on",
            waiting.map((s) => s.id)
          );
          continue;
        }

        remove(stack).then((result) => {
          results[stack.id] = result;
          complete.add(stack.id);

          if (isFailed(result.status))
            stacks.forEach((s) => {
              if (todo.delete(s.stackName)) {
                complete.add(s.stackName);
                results[s.id] = {
                  status: "DEPENDENCY_FAILED",
                  outputs: {},
                  errors: {},
                };
                bus.publish("stack.status", {
                  stackID: s.id,
                  status: "DEPENDENCY_FAILED",
                });
              }
            });

          if (complete.size === stacks.length) {
            resolve(results);
          }

          trigger();
        });

        todo.delete(stack.id);
      }
    }

    trigger();
  });
}

export async function remove(
  stack: CloudFormationStackArtifact
): Promise<StackDeploymentResult> {
  Logger.debug("Removing stack", stack.id);
  const cfn = useAWSClient(CloudFormationClient);
  try {
    await cfn.send(
      new DeleteStackCommand({
        StackName: stack.stackName,
      })
    );
    return monitor(stack.stackName);
  } catch (ex: any) {
    return {
      errors: {
        stack: ex.message,
      },
      outputs: {},
      status: "UPDATE_FAILED",
    };
  }
}
