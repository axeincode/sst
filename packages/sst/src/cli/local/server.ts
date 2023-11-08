import { produceWithPatches, enablePatches } from "immer";
import express from "express";
import fs from "fs/promises";
enablePatches();

import { WebSocketServer, WebSocket } from "ws";
import https from "https";
import http from "http";
import { applyWSSHandler } from "@trpc/server/adapters/ws/dist/trpc-server-adapters-ws.cjs.js";
import { FunctionState, router, State } from "./router.js";
import { WritableDraft } from "immer/dist/internal.js";
import { DendriformPatch, optimise } from "dendriform-immer-patch-optimiser";
import { sync } from "cross-spawn";
import { useProject } from "../../project.js";
import { useBus } from "../../bus.js";
import getPort from "get-port";
import { lazy } from "../../util/lazy.js";

type Opts = {
  key: any;
  cert: any;
  live: boolean;
};

declare module "../../bus.js" {
  interface Events {
    "local.patches": DendriformPatch[];
  }
}

export const useLocalServerConfig = lazy(async () => {
  const port = await getPort({
    port: 13557,
  });

  return {
    port,
    url: `https://console.sst.dev${port !== 13557 ? `?_port=${port}` : ""}`,
  };
});

export async function useLocalServer(opts: Opts) {
  const cfg = await useLocalServerConfig();
  const project = useProject();
  let state: State = {
    app: project.config.name,
    stage: project.config.stage,
    bootstrap: project.config.bootstrap,
    live: opts.live,
    stacks: {
      status: "idle",
    },
    functions: {},
  };

  const rest = express();

  rest.all(`/ping`, (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
    res.header(
      "Access-Control-Allow-Headers",
      req.header("access-control-request-headers")
    );
    res.sendStatus(200);
  });

  rest.all<{
    href: string;
  }>(
    `/proxy*`,
    express.raw({
      type: "*/*",
      limit: "1024mb",
    }),
    (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, PUT, PATCH, POST, DELETE"
      );
      res.header(
        "Access-Control-Allow-Headers",
        req.header("access-control-request-headers")
      );

      if (req.method === "OPTIONS") return res.send();
      const u = new URL(req.url.substring(7));
      const forward = https.request(
        u,
        {
          headers: {
            ...req.headers,
            host: u.hostname,
          },
          method: req.method,
        },
        (proxied) => {
          res.status(proxied.statusCode!);
          for (const [key, value] of Object.entries(proxied.headers)) {
            res.header(key, value);
          }
          proxied.pipe(res);
        }
      );
      if (
        req.method !== "GET" &&
        req.method !== "DELETE" &&
        req.method !== "HEAD" &&
        req.body
      )
        forward.write(req.body);
      forward.end();
      forward.on("error", (e) => {
        console.log(e.message);
      });
    }
  );

  const server = await (async () => {
    const result = sync("mkcert", ["--help"]);
    const KEY_PATH = ".sst/localhost-key.pem";
    const CERT_PATH = ".sst/localhost.pem";
    if (result.status === 0) {
      try {
        await Promise.all([fs.access(KEY_PATH), fs.access(CERT_PATH)]);
      } catch (e) {
        sync("mkcert", ["localhost"], {
          cwd: ".sst",
        });
      }
      const [key, cert] = await Promise.all([
        fs.readFile(KEY_PATH),
        fs.readFile(CERT_PATH),
      ]);
      return https.createServer(
        {
          key: key,
          cert: cert,
        },
        rest
      );
    }

    return http.createServer({}, rest);
  })();

  // Wire up websocket

  const wss = new WebSocketServer({ noServer: true });
  const wss2 = new WebSocketServer({ noServer: true });

  const sockets = new Set<WebSocket>();

  interface Invocation {
    id: string;
    source: string;
    cold: boolean;
    input?: any;
    output?: any;
    errors: {
      id: string;
      error: string;
      message: string;
      stack: { raw: string }[];
    }[];
    report?: {
      duration: number;
      size: number;
      memory: number;
      xray: string;
    };
    start: number;
    end?: number;
    logs: {
      id: string;
      timestamp: number;
      message: string;
    }[];
  }

  let invocations: Invocation[] = [];
  function publish(invocation: Invocation) {
    const index = invocations.findLastIndex((i) => i.id === invocation.id);

    if (index < 0) invocations.push(invocation);
    else invocations[index] = invocation;

    const json = JSON.stringify({
      type: "invocation",
      properties: [invocation],
    });
    [...sockets.values()].map((s) => s.send(json));
  }
  wss2.on("connection", (socket, req) => {
    sockets.add(socket);
    socket.send(
      JSON.stringify({
        type: "cli.dev",
        properties: {
          app: project.config.name,
          stage: project.config.stage,
          region: project.config.region,
        },
      })
    );
    for (const invocation of invocations) {
      socket.send(
        JSON.stringify({
          type: "invocation",
          properties: [invocation],
        })
      );
    }
    socket.on("close", () => {
      sockets.delete(socket);
    });

    socket.on("message", (data) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === "log.cleared") {
        if (parsed.properties.source === "all") {
          invocations = [];
          return;
        }
        invocations = invocations.filter(
          (item) => item.source === parsed.properties.source
        );
      }
    });
  });

  wss.on("connection", (socket, req) => {
    if (req.headers.origin?.endsWith("localhost:3000")) return;
    if (req.headers.origin?.endsWith("localhost:3001")) return;
    if (req.headers.origin?.endsWith("console.serverless-stack.com")) return;
    if (req.headers.origin?.endsWith("console.sst.dev")) return;
    if (req.headers.origin?.endsWith("--sst-console.netlify.app")) return;
    console.log("Rejecting unauthorized connection from " + req.headers.origin);
    socket.terminate();
  });

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/socket") {
      wss2.handleUpgrade(req, socket, head, (socket) => {
        wss2.emit("connection", socket, req);
      });
      return;
    }

    if (req.url === "/") {
      wss.handleUpgrade(req, socket, head, (socket) => {
        wss.emit("connection", socket, req);
      });
      return;
    }

    socket.destroy();
  });

  server.listen(cfg.port);
  const handler = applyWSSHandler({
    wss,
    router,
    createContext() {
      return {
        state,
      };
    },
  });

  const bus = useBus();
  const pending: DendriformPatch[] = [];

  function updateState(cb: (draft: WritableDraft<State>) => void) {
    const [next, patches] = produceWithPatches(state, cb);
    if (!patches.length) return;

    const scheduled = pending.length;
    pending.push(...optimise(state, patches));
    if (!scheduled)
      setTimeout(() => {
        bus.publish("local.patches", pending);
        pending.splice(0, pending.length);
      }, 0);
    state = next as any;
  }
  function updateFunction(
    id: string,
    cb: (draft: WritableDraft<FunctionState>) => void
  ) {
    return updateState((draft) => {
      let func = draft.functions[id];
      if (!func) {
        func = {
          warm: true,
          state: "idle",
          issues: {},
          invocations: [],
        };
        draft.functions[id] = func;
      }
      cb(func);
    });
  }

  bus.subscribe("function.invoked", async (evt) => {
    publish({
      start: Date.now(),
      cold: false,
      input: evt.properties.event,
      id: evt.properties.requestID,
      errors: [],
      logs: [],
      source: evt.properties.functionID,
    });
    updateFunction(evt.properties.functionID, (draft) => {
      if (draft.invocations.length >= 25) draft.invocations.pop();
      draft.invocations.unshift({
        id: evt.properties.context.awsRequestId,
        request: evt.properties.event,
        times: {
          start: Date.now(),
        },
        logs: [],
      });
    });
  });

  bus.subscribe("worker.stdout", (evt) => {
    const invocation = invocations.findLast(
      (i) => i.id === evt.properties.requestID
    );
    if (invocation) {
      invocation.logs.push({
        id: Math.random().toString(),
        message: evt.properties.message,
        timestamp: Date.now(),
      });
      publish(invocation);
    }
    updateFunction(evt.properties.functionID, (draft) => {
      const entry = draft.invocations.find(
        (i) => i.id === evt.properties.requestID
      );
      if (!entry) return;
      entry.logs.push({
        timestamp: Date.now(),
        message: evt.properties.message,
      });
    });
  });

  bus.subscribe("function.success", (evt) => {
    const invocation = invocations.findLast(
      (i) => i.id === evt.properties.requestID
    );
    if (invocation) {
      invocation.end = Date.now();
      invocation.report = {
        duration: invocation.end - invocation.start,
        size: 0,
        xray: "",
        memory: 0,
      };
      invocation.output = evt.properties.body;
      publish(invocation);
    }
    updateFunction(evt.properties.functionID, (draft) => {
      const invocation = draft.invocations.find(
        (x) => x.id === evt.properties.requestID
      );
      if (!invocation) return;
      invocation.response = {
        type: "success",
        data: evt.properties.body,
      };
      invocation.times.end = Date.now();
    });
  });

  bus.subscribe("function.error", (evt) => {
    const invocation = invocations.findLast(
      (i) => i.id === evt.properties.requestID
    );
    if (invocation) {
      invocation.errors.push({
        id: invocation.id,
        error: evt.properties.errorType,
        message: evt.properties.errorMessage,
        stack: (evt.properties.trace || []).map((t) => ({
          raw: t,
        })),
      });
      invocation.end = Date.now();
      invocation.report = {
        duration: invocation.end - invocation.start,
        size: 0,
        xray: "",
        memory: 0,
      };
      publish(invocation);
    }
    updateFunction(evt.properties.functionID, (draft) => {
      const invocation = draft.invocations.find(
        (x) => x.id === evt.properties.requestID
      );
      if (!invocation) return;
      invocation.response = {
        type: "failure",
        error: {
          errorMessage: evt.properties.errorMessage,
          stackTrace: evt.properties.trace || [],
        },
      };
      invocation.times.end = Date.now();
    });
  });

  const result = {
    updateState,
    updateFunction,
  };

  return result;
}
