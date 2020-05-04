import chalk from "chalk";
import request from "request";
import {
  decodeMunicipality,
  parseCsvMunicipality
} from "../utils/municipality";
import { ITALIAN_MUNICIPALITIES_URL } from "../config";
import { SerializableMunicipality } from "../types/SerializableMunicipality";
import { serializeMunicipalityToJson } from "./serialize_municipality";

const parserOption = {
  delimiter: ";",
  from_line: 4,
  skip_empty_lines: true,
  skip_lines_with_error: true,
  trim: true
};

export const exportCurrentMunicipalities = async () => {
  const options = {
    encoding: "latin1",
    url: ITALIAN_MUNICIPALITIES_URL
  };

  console.log(
    "[1/2] Requesting Municipalities data from:",
    chalk.blueBright(ITALIAN_MUNICIPALITIES_URL)
  );

  // tslint:disable-next-line: no-any
  request.get(options, async (error: Error, _: request.Response, body: any) => {
    if (error) {
      console.log(
        "some error occurred while retrieving data",
        chalk.red(error.message)
      );
      return;
    }
    console.log(chalk.gray("[2/2]"), "Generating municipalities JSON...");
    const buffer = Buffer.from(body);

    const csvContent = buffer.toString();
    // parse the content string in csv records
    parseCsvMunicipality(csvContent, parserOption, async result => {
      if (result.isLeft()) {
        console.log(
          "some error occurred while parsing data:",
          chalk.red(result.value.message)
        );
        return;
      }
      // process each csv record with generateJsonFiles function
      return Promise.all(
        result.value.map(r => {
          decodeMunicipality(r).map(municipality =>
            serializeMunicipalityToJson(<SerializableMunicipality>{
              municipality: municipality,
              codiceCatastale: r[18]
            })
          );
        })
      );
    });
  });
};
