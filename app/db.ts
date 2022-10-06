import type { TypeSet } from "edgedb/dist/reflection";
import { createClient } from "edgedb";
import type { $infer } from "dbschema/edgeql-js";

import e from "dbschema/edgeql-js";

export type DBKey<T extends TypeSet> = $infer<T> extends Array<any>
  ? $infer<T>[number]
  : number;

export const client = createClient();

export { e };
