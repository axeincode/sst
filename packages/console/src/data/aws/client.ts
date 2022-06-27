import { useMemo } from "react";
import { useAuth, useSSL } from "../global";
import { Client } from "@aws-sdk/smithy-client";
import { RegionInputConfig } from "@aws-sdk/config-resolver";
import { RetryInputConfig } from "@aws-sdk/middleware-retry";
import { AwsAuthInputConfig } from "@aws-sdk/middleware-signing";
import { FetchHttpHandler } from "@aws-sdk/fetch-http-handler";
import {} from "@aws-sdk/smithy-client";

type Config = RegionInputConfig & RetryInputConfig & AwsAuthInputConfig;

class CustomHandler extends FetchHttpHandler {
  private readonly ssl: boolean;
  constructor(ssl: boolean) {
    super();
    this.ssl = ssl;
  }
  handle(req: any, opts: any) {
    const { protocol, hostname, path } = req;
    req.protocol = this.ssl ? "https:" : "http:";
    // TODO: can remove this ternary after some time
    req.hostname = this.ssl ? "localhost:13557" : "localhost:12557";
    req.path = `/proxy/${protocol}//${hostname}${path}`;
    return super.handle(req, opts);
  }
}

export function useClient<C extends Client<any, any, any, any>>(
  svc: new (config: Config) => C
) {
  const [ssl] = useSSL();
  const auth = useAuth();
  return useMemo(
    () =>
      new svc({
        ...auth.data!,
        // @ts-ignore
        requestHandler: new CustomHandler(ssl),
        maxAttempts: 3,
      }) as C,
    [auth.data]
  );
}
