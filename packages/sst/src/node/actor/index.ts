import { Context } from "../../context/context.js";
import { create } from "../../context/context2.js";
import { SSTError } from "../../util/error.js";

interface Definition {
  type: string;
  properties: Record<string, any>;
}

export class WrongActorError extends SSTError {}

export function createActors<T extends Definition>() {
  type Actors = T | { type: "public"; properties: {} };
  const ctx = create<Actors>("Actors");
  return {
    useActor: ctx.use,
    withActor: ctx.with,
    assertActor<T extends Actors["type"]>(type: T) {
      const actor = ctx.use();
      if (actor.type === type)
        return actor.properties as Extract<Actors, { type: T }>["properties"];
      throw new WrongActorError(
        `Expected actor type "${type} but got "${actor.type}"`
      );
    },
  };
}
