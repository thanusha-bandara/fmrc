import { getTestSchema } from '../../api/testSchemas';

// Cached by schema_id (not by test) since many tests share one schema (e.g. all 9 Highland
// replicates) -- once any one of them has been fetched, opening another reuses it with no
// extra network call.
const cacheBySchemaId = new Map();

export async function loadSchemaForTest(test) {
  if (!test?.schema_id) return null;
  if (cacheBySchemaId.has(test.schema_id)) return cacheBySchemaId.get(test.schema_id);

  const schema = await getTestSchema(test.test_id);
  cacheBySchemaId.set(schema.schema_id, schema);
  return schema;
}
