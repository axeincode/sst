import Conf from "conf";
import { BinaryLike, createHash, randomBytes } from "crypto";
import { postPayload } from "./post-payload.js";
import { getRawProjectId } from "./project-id.js";
import { getEnvironmentData } from "./environment.js";
import { cyan } from "colorette";

const TELEMETRY_API = "https://telemetry.sst.dev/events";
const TELEMETRY_KEY_ENABLED = "telemetry.enabled";
const TELEMETRY_KEY_NOTIFY_DATE = "telemetry.notifiedAt";
const TELEMETRY_KEY_ID = `telemetry.anonymousId`;

type EventContext = {
  anonymousId: string;
  projectId: string;
  sessionId: string;
};

type CliFailedEvent = {
  rawCommand: string;
  duration: number;
  errorName: string;
  errorMessage: string;
};

type CliSucceededEvent = {
  rawCommand: string;
  duration: number;
};

const conf = initializeConf();
const sessionId = randomBytes(32).toString("hex");
const projectId = hash(getRawProjectId());
const anonymousId = getAnonymousId();

notify();

export function enable(): void {
  conf && conf.set(TELEMETRY_KEY_ENABLED, true);
}

export function disable(): void {
  conf && conf.set(TELEMETRY_KEY_ENABLED, false);
}

export function isEnabled(): boolean {
  if (!conf) {
    return false;
  }

  return conf.get(TELEMETRY_KEY_ENABLED, true) !== false;
}

export function trackCli(command: string) {
  return record("CLI_COMMAND", { command });
}

export function trackCliFailed(event: CliFailedEvent) {
  return record("CLI_COMMAND_FAILED", event);
}

export function trackCliSucceeded(event: CliSucceededEvent) {
  return record("CLI_COMMAND_SUCCEEDED", event);
}

export function trackCliDevError(event: CliFailedEvent) {
  return record("CLI_COMMAND_DEV_ERROR", event);
}

export function trackCliDevRunning(event: CliSucceededEvent) {
  return record("CLI_COMMAND_DEV_RUNNING", event);
}

function initializeConf() {
  try {
    // @ts-expect-error
    return new Conf({ projectName: "sst" });
  } catch (_) {
    return null;
  }
}

function notify() {
  if (!conf || willNotRecord()) {
    return;
  }

  // Do not notify if user has been notified before.
  if (conf.get(TELEMETRY_KEY_NOTIFY_DATE) !== undefined) {
    return;
  }
  conf.set(TELEMETRY_KEY_NOTIFY_DATE, Date.now().toString());

  console.log(
    `${cyan(
      "Attention"
    )}: SST now collects completely anonymous telemetry regarding usage. This is used to guide SST's roadmap.`
  );
  console.log(
    `You can learn more, including how to opt-out of this anonymous program, by heading over to:`
  );
  console.log("https://docs.sst.dev/anonymous-telemetry");
  console.log();
}

function willNotRecord() {
  return !isEnabled() || !!process.env.SST_TELEMETRY_DISABLED;
}

async function record(name: string, properties: any): Promise<any> {
  if (willNotRecord()) {
    return Promise.resolve();
  }

  const context: EventContext = {
    anonymousId,
    projectId,
    sessionId,
  };

  try {
    await postPayload(TELEMETRY_API, {
      context,
      environment: getEnvironmentData(),
      events: [
        {
          name,
          properties,
        },
      ],
    });
  } catch {}
}

function getAnonymousId(): string {
  const val = conf && conf.get(TELEMETRY_KEY_ID);
  if (val) {
    return val as string;
  }

  const generated = randomBytes(32).toString("hex");
  conf && conf.set(TELEMETRY_KEY_ID, generated);
  return generated;
}

function hash(payload: BinaryLike): string {
  return createHash("sha256").update(payload).digest("hex");
}
