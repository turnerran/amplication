import { namedTypes } from "ast-types";
import { camelCase } from "camel-case";
import {
  DTOs,
  Entity,
  Module,
  EventNames,
  CreateDTOsParams,
  ModuleMap,
} from "@amplication/code-gen-types";
import { createDTOModule, createDTOModulePath } from "./dto/create-dto-module";
import { createEnumDTOModule } from "./dto/create-enum-dto-module";
import pluginWrapper from "../../plugin-wrapper";
import DsgContext from "../../dsg-context";
import { StaticPool } from "node-worker-threads-pool";
import { chunk } from "lodash";

export async function createDTOModules(dtos: DTOs): Promise<ModuleMap> {
  return pluginWrapper(createDTOModulesInternal, EventNames.CreateDTOs, {
    dtos,
  });
}

/**
 * creating all the DTOs files in the base (only the DTOs)
 *
 */
export async function createDTOModulesInternal({
  dtos,
}: CreateDTOsParams): Promise<ModuleMap> {
  const dtoNameToPath = getDTONameToPath(dtos);
  const moduleMap = new ModuleMap(DsgContext.getInstance.logger);

  const entityDTOs = Object.values(dtos).flatMap((entityDTOs) =>
    Object.values(entityDTOs)
  );

  for (const dto of entityDTOs) {
    const isEnumDTO = namedTypes.TSEnumDeclaration.check(dto);
    let module: Module;
    if (isEnumDTO) {
      module = createEnumDTOModule(dto, dtoNameToPath);
    } else {
      module = createDTOModule(dto, dtoNameToPath);
    }

    await moduleMap.set(module);
  }
  return moduleMap;
}

export function getDTONameToPath(dtos: DTOs): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dtos).flatMap(([entityName, entityDTOs]) =>
      Object.values(entityDTOs).map((dto) => [
        dto.id.name,
        createDTOModulePath(camelCase(entityName), dto.id.name),
      ])
    )
  );
}

// export async function createDTOs(entities: Entity[]): Promise<DTOs> {
//   const threads = Number(process.env.THREADS) || 3;
//   const chunkSize = Math.ceil(entities.length / threads);
//   const chunks = chunk(entities, chunkSize);

//   let dtos: DTOs = {};
//   for (const chunk of chunks) {
//     const worker = new Worker(__dirname + "/worker.js", {
//       workerData: {
//         path: __dirname + "/create-dtos.worker.ts",
//         value: chunk,
//       },
//     });

//     worker.on("message", (message) => {
//       dtos = { ...dtos, ...message };
//     });

//     worker.on("error", (error) => {
//       throw error;
//     });
//     worker.on("exit", (code) => {
//       if (code !== 0) throw new Error(`Worker stopped with exit code ${code}`);
//     });
//   }

//   return dtos;
// }

export async function createDTOs(entities: Entity[]): Promise<DTOs> {
  const threads = Number(process.env.THREADS) || 3;

  const pool = new StaticPool({
    size: threads,
    task: __dirname + "/worker.js",
    workerData: { path: __dirname + "/create-dtos.worker.ts" },
  });

  const chunkSize = Math.ceil(entities.length / threads);
  const chunks = chunk(entities, chunkSize);

  const chunkDtosPromises: Promise<DTOs>[] = [];
  for (const chunk of chunks) {
    chunkDtosPromises.push(pool.exec(chunk));
  }
  const chunkDtos = await Promise.all(chunkDtosPromises);
  pool.destroy().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
  });

  return chunkDtos.reduce((acc, curr) => ({ ...acc, ...curr }), {});
}
