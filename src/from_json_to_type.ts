/**
 * util to create a simple type definition from a json file
 * NOTE: this implementation supports only: string, boolean, number and nested plain object composed
 * with previous types
 */

import * as fs from "fs";
import _ from "lodash";
import * as path from "path";
import * as prettier from "prettier";

const args = process.argv;

if (args.length < 3) {
  console.error("please provide a file to process");
  process.exit(1);
}
const fileToProcess = path.join(__dirname, args[2]);
if (!fs.existsSync(fileToProcess)) {
  console.error("the provided file to process doesn't exist!");
  process.exit(1);
}

const Type2Codec = new Map<string, string>();
Type2Codec.set("string", "t.string");
Type2Codec.set("boolean", "t.boolean");
Type2Codec.set("number", "t.number");

const convertoObjectToType = (
  // tslint:disable-next-line: no-any
  obj: any,
  mapping: Map<string, string> = Type2Codec
): string => {
  const keys = Object.keys(obj);
  return keys.reduce((acc, curr, idx) => {
    const last = idx === keys.length - 1;
    if (_.isPlainObject(obj[curr])) {
      const nested = convertoObjectToType(obj[curr]);
      // assume all fields are required
      return `${acc}\n${curr}: t.interface({${nested}})${last ? "" : ","}`;
    }
    const valueType = typeof obj[curr];
    if (!mapping.has(valueType)) {
      console.error(`${valueType} is not supported!`);
      process.exit(1);
    }
    return `${acc}\n${curr}: ${mapping.get(valueType)}${last ? "" : ","}`;
  }, "");
};

// try to parse the given file
try {
  const content = fs.readFileSync(fileToProcess);
  const obj = JSON.parse(content.toString());
  const co = convertoObjectToType(obj);
  const name = _.upperFirst(_.camelCase(path.basename(fileToProcess, ".json")));
  const comment = `/**
  * Do not edit this file it is auto-generated by io-service-metadata / update_markdown_data_definitions.ts
  */
 /* tslint:disable */\n\n`;
  const header = `import * as t from "io-ts";\n`;
  const codec = `const ${name} = t.interface({${co}})\n`;
  const typeCoded = `export type ${name} = t.TypeOf<typeof ${name}>;`;
  const fileContent = prettier.format(
    comment.concat(header).concat(codec).concat(typeCoded),
    {
      parser: "typescript",
    }
  );
  const fileToWrite = path.join(__dirname, "../definitions", `${name}.ts`);
  fs.writeFileSync(fileToWrite, fileContent);
  console.log(`type ${name} create successfully in ${fileToWrite}`);
} catch (e) {
  console.error(e);
}