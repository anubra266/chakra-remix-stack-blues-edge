import { createClient } from "edgedb";
import e from "./dbschema/edgeql-js";

const client = createClient();

async function run() {
  const query = e.select(e.datetime_current());
  const result = await query.run(client);
  console.log(result);
}
run();
