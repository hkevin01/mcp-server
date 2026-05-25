import { createRequire } from "node:module";

import type { ErrorObject } from "ajv/dist/2020.js";

import commonTypesSchema from "../schemas/commonTypes.json" with { type: "json" };
import jiraSchema from "../schemas/jiraSchema.json" with { type: "json" };
import assuranceSchema from "../schemas/assuranceSchema.json" with { type: "json" };
import searchSchema from "../schemas/searchSchema.json" with { type: "json" };
import customToolSchema from "../schemas/customToolSchema.json" with { type: "json" };
import { ValidationError } from "./errorHandler.js";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default as typeof import("ajv/dist/2020.js").default;
const ajv = new Ajv2020({ allErrors: true, strict: false });

ajv.addFormat("date-time", {
  type: "string",
  validate: (value: string) => !Number.isNaN(Date.parse(value)),
});

for (const schema of [commonTypesSchema, jiraSchema, assuranceSchema, searchSchema, customToolSchema]) {
  ajv.addSchema(schema);
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "validation error"}`.trim())
    .join("; ");
}

export function validateAgainstSchema<T>(schemaId: string, value: unknown): T {
  const validator = ajv.getSchema(schemaId);
  if (!validator) {
    throw new ValidationError(`Unknown schema: ${schemaId}`);
  }

  if (!validator(value)) {
    throw new ValidationError(`Schema validation failed for ${schemaId}`, formatErrors(validator.errors));
  }

  return value as T;
}