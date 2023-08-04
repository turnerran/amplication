import { parentPort, workerData } from "worker_threads";
import {
  DTOs,
  Entity,
  EntityDTOs,
  EntityEnumDTOs,
  NamedClassDeclaration,
} from "@amplication/code-gen-types";
import { getEnumFields } from "../../utils/entity";
import { createEnumName } from "../prisma/create-prisma-schema-fields";
import { createCreateInput } from "./dto/create-create-input";
import { createEntityDTO } from "./dto/create-entity-dto";
import { createEnumDTO } from "./dto/create-enum-dto";
import { createUpdateInput } from "./dto/create-update-input";
import { createWhereInput } from "./dto/create-where-input";
import { createWhereUniqueInput } from "./dto/create-where-unique-input";
import { createCountArgs } from "./dto/graphql/count/create-count-args";
import { createCreateArgs } from "./dto/graphql/create/create-create-args";
import { createDeleteArgs } from "./dto/graphql/delete/create-delete-args";
import { createEntityListRelationFilter } from "./dto/graphql/entity-list-relation-filter/create-entity-list-relation-filter";
import { createFindManyArgs } from "./dto/graphql/find-many/create-find-many-args";
import { createFindOneArgs } from "./dto/graphql/find-one/create-find-one-args";
import { createOrderByInput } from "./dto/graphql/order-by-input/order-by-input";
import { createUpdateArgs } from "./dto/graphql/update/create-update-args";
import { createCreateNestedManyDTOs } from "./dto/nested-input-dto/create-nested";
import { createUpdateManyWithoutInputDTOs } from "./dto/nested-input-dto/update-nested";
import { inspect } from "util";
import { parse, stringify } from "flatted";
const createEntityDTOs = async (entity: Entity): Promise<EntityDTOs> => {
  const entityDTO = createEntityDTO(entity);
  const createInput = createCreateInput(entity);
  const updateInput = createUpdateInput(entity);
  const whereInput = createWhereInput(entity);
  const whereUniqueInput = createWhereUniqueInput(entity);
  const createArgs = await createCreateArgs(entity, createInput);
  const orderByInput = await createOrderByInput(entity);
  const deleteArgs = await createDeleteArgs(entity, whereUniqueInput);
  const countArgs = await createCountArgs(entity, whereInput);
  const findManyArgs = await createFindManyArgs(
    entity,
    whereInput,
    orderByInput
  );
  const findOneArgs = await createFindOneArgs(entity, whereUniqueInput);
  const updateArgs = await createUpdateArgs(
    entity,
    whereUniqueInput,
    updateInput
  );
  const listRelationFilter = await createEntityListRelationFilter(
    entity,
    whereInput
  );
  const dtos: EntityDTOs = {
    entity: entityDTO,
    createInput,
    updateInput,
    whereInput,
    whereUniqueInput,
    deleteArgs,
    countArgs,
    findManyArgs,
    findOneArgs,
    orderByInput,
    listRelationFilter,
  };
  if (createArgs) {
    dtos.createArgs = createArgs;
  }
  if (updateArgs) {
    dtos.updateArgs = updateArgs;
  }
  return dtos;
};

const createEntityEnumDTOs = (entity: Entity): EntityEnumDTOs => {
  const enumFields = getEnumFields(entity);
  return Object.fromEntries(
    enumFields.map((field) => {
      const enumDTO = createEnumDTO(field, entity);
      return [createEnumName(field, entity), enumDTO];
    })
  );
};

const createToManyDTOs = (entity: Entity): NamedClassDeclaration[] => {
  const allCreateNestedManyWithoutInput = createCreateNestedManyDTOs(entity);
  const allUpdateManyWithoutInput = createUpdateManyWithoutInputDTOs(entity);
  return [...allCreateNestedManyWithoutInput, ...allUpdateManyWithoutInput];
};

const processData = async (entities: Entity[]): Promise<DTOs> => {
  const entitiesDTOsMap = await Promise.all(
    entities.map(async (entity) => {
      const entityDTOs = await createEntityDTOs(entity);
      const entityEnumDTOs = createEntityEnumDTOs(entity);
      const toManyDTOs = createToManyDTOs(entity);
      const dtos = {
        ...entityDTOs,
        ...entityEnumDTOs,
        ...toManyDTOs,
      };
      return [entity.name, dtos];
    })
  );
  return Object.fromEntries(entitiesDTOsMap);
};

parentPort.on("message", async (workerData) => {
  const result = await processData(workerData);

  // eslint-disable-next-line no-console
  console.debug(
    "result",
    inspect(result, {
      depth: 10,
      colors: true,
      compact: true,
    })
  );
  // return the result to main thread.
  parentPort.postMessage(result);
});
