/**
 * Find and return a list of existing OPENAPI references
 * @param {string} specsStr - A JSON stringified OPEN API specs.
 * @returns {array} - Array containing a list of References ( "$ref": "#/components/schema/example" )
 */
export function getRefsInsideSpec(specsStr) {
  const regex = /"\$ref":[ ]?"[^"]+"/gi;
  let result, indices = [];
  while ( (result = regex.exec(specsStr)) ) {
    indices.push(result[0]);
  }
  return indices;
}

/**
 * Resolve internal component references (#ref) by replacing them with their actual content
 * @param {object} openApiSpec - A JSON object containing the OPEN-API signature.
 * @returns {object} - JSON object reprensenting the OPEN API SPec without references
 */
export function resolveInternalReferences(openApiSpec) {
  let specs = JSON.parse(JSON.stringify(openApiSpec));
  Object.keys(specs.components).forEach((componentGroupKey) => {
    const rootPath = `#/components/${componentGroupKey}`;
    const componentKeyArray = Object.keys(specs.components[componentGroupKey]);
    if (componentKeyArray.length > 0) {
      componentKeyArray.forEach((componentKey) => {
        // We need to delete the {} around the schema to inject it
        const componentStr = JSON.stringify(specs.components[componentGroupKey][componentKey]).substr(1).slice(0, -1);
        specs = JSON.parse(JSON.stringify(specs).replaceAll(`"$ref":"${rootPath}/${componentKey}"`, componentStr));
      });
    }
  });
  // Ensure no orphan references remain after resolving them
  let remainingRefsList = getRefsInsideSpec(JSON.stringify(specs));
  if (remainingRefsList.length > 0) {
    console.error(`Unresolved references remained in the specs (orphan refs).\n Orphan refs found:\n${remainingRefsList.map(str=>`  => ${str}`).join('\n')}`);
    process.exit(1); // eslint-disable-line
  }

  return specs;
}

/**
 * Transform a path from the OPEN-API format to Fastify format
 * @param {string} path - The path to transform (OPEN-API format).
 * @returns {string} - The path in a Fastify format.
 */
export function transformPath(path) {
  return path.replaceAll('}', '').replaceAll('{', ':');
}

/**
 * Transform a a string to ensure the first letter of a camelCase string is lowercase
 * @param {string} str - String to change
 * @returns {string} - the string in camelCase.
 */
export function createCamelCaseFromStr(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Calculate the key to use to get the parameter from the Fastify manager
 * @param {string} parameterKey - parameter key, defined by OPEN API Specs
 * @returns {string} - the object key to get the parameter inside the handler injected by fastify
 */
export function parseParameterKey(paramKey) {
  if (paramKey === 'path') return 'params';
  if (paramKey === 'query') return 'querystring';
  return paramKey;
}

/**
 * Transform an array of OPEN API parameters in simple JSON Schemas
 * @param {array} parameterArray - List of parameters in an OPEN API format
 * @returns {object} - an object representing the JSON schema for all the given parameters
 */
export function parseParameters(parameterArray) {
  if (!parameterArray) {
    return {};
  }
  const outputParameters = parameterArray.reduce((acc, param) => {
    const key = parseParameterKey(param.in);
    const paramTransformed = {
      [param.name]: {
        ...param.schema,
      },
    };
    if (!acc[key]) {
      acc[key] = {};
    }
    acc[key] = {
      ...acc[key],
      ...paramTransformed,
    };
    return acc;
  }, {});
  Object.keys(outputParameters).forEach((typeParam) => {
    outputParameters[typeParam] = wrapEmptyObjects(outputParameters[typeParam]);
  });
  return outputParameters;
}

/**
 * Filters out all properties containing a property readOnly at true
 * @param {object} schema - JSON Schema, extended by OPEN API Specs
 * @returns {object} - Schema without readOnly properties
 */
export function filterReadOnlyProperties(schema) {
  if (Object.keys(schema).length === 0) { // If the schema is an empty object we return it
    return {};
  }
  let schemaProperties = schema.properties;
  let filteredRequiredProperties = schema.required;
  if (schema.type === 'array') { // if it's an array we go into the items
    schemaProperties = schema.items.properties;
    filteredRequiredProperties = schema.items.required;
  }
  const filteredPropertiesArray = Object.keys(JSON.parse(JSON.stringify(schemaProperties)))
    .filter((propertyKey) => !schemaProperties[propertyKey].readOnly);
  const filteredProperties = filteredPropertiesArray.reduce((acc, propertyKey) => ({
    ...acc,
    [propertyKey]: schemaProperties[propertyKey],
  }), {});
  filteredRequiredProperties = filteredRequiredProperties.filter((propetyKey) => filteredPropertiesArray.includes(propetyKey));
  const filteredSchema = {
    ...schema,
  };
  if (schema.type === 'array') {
    filteredSchema.items.properties = filteredProperties;
    filteredSchema.items.required = filteredRequiredProperties;
  } else {
    filteredSchema.properties = filteredProperties;
    filteredSchema.required = filteredRequiredProperties;
  }
  return filteredSchema;
}

/**
 * Transform a Request Body from an OPEN API Specs to a simple JSON Schema
 * ruling out all readOnly properties
 * @param {object} contentSchema - RequestBody object from an OPEN API Specs
 * @returns {object} - Object wraping the property body, which contains the JSON Schema of the request body
 */
export function parseRequestBody(requestBody) {
  let schema = requestBody?.content;
  if (schema && schema['application/json']) {
    schema = schema['application/json'].schema;
    return { body: filterReadOnlyProperties(schema) };
  }
  return {};
}

/**
 * Filters out all properties containing a property writeOnly at true
 * @param {object} schema - JSON Schema, extended by OPEN API Specs
 * @returns {object} - Schema without writeOnly properties
 */
export function filterWriteOnlyProperties(schema) {
  if (Object.keys(schema).length === 0) { // If the schema is an empty object we return it
    return {};
  }
  let schemaProperties = schema.properties;
  let filteredRequiredProperties = schema.required;
  if (schema.type === 'array') { // if it's an array we go into the items
    schemaProperties = schema.items.properties;
    filteredRequiredProperties = schema.items.required;
  }
  const filteredPropertiesArray = Object.keys(JSON.parse(JSON.stringify(schemaProperties)))
    .filter((propertyKey) => !schemaProperties[propertyKey].writeOnly);
  const filteredProperties = filteredPropertiesArray.reduce((acc, propertyKey) => ({
    ...acc,
    [propertyKey]: schemaProperties[propertyKey],
  }), {});
  if (filteredRequiredProperties) {
    filteredRequiredProperties = filteredRequiredProperties.filter((propetyKey) => filteredPropertiesArray.includes(propetyKey));
  }
  const filteredSchema = { ...schema, };
  if (schema.type === 'array') {
    filteredSchema.items.properties = filteredProperties;
    if (filteredRequiredProperties) {
      filteredSchema.items.required = filteredRequiredProperties;
    }
  } else {
    filteredSchema.properties = filteredProperties;
    if (filteredRequiredProperties) {
      filteredSchema.required = filteredRequiredProperties;
    }
  }
  return filteredSchema;
}

/**
 * Transform the response list defined inside an OPEN API Spec to a list of responses in a Fastify format
 * ruling out all readOnly properties
 * @param {object} responseSpecList - Response Object, defined by OPEN API specs
 * @returns {object} - Response format need by Fastify to validate/filter responses
 */
export function parseResponses(responseSpecList) {
  const reponseSchema = Object.keys(responseSpecList).reduce((acc, responseCode) => {
    const typesOfResponse = responseSpecList[responseCode];
    if (typesOfResponse.content && typesOfResponse.content['application/json']) {
      const responseSchema = typesOfResponse.content['application/json'].schema || {};
      acc[responseCode] = filterWriteOnlyProperties(responseSchema);
    }
    return acc;
  }, {});
  return Object.keys(reponseSchema).length > 0 ? {response: reponseSchema} : {};
}

/**
 * Create the Fastify route part about the method/verb from an OPEN API specs.
 * If the handler defined inside the operationId property of each operation,
 * it will log the error and exit 1
 * @param {object} openAPIMethodSpecList - List of methods of a given path, inside an OPEN API Specs
 * @param {object} handlers - Mixin containing all handlers defined.
 * @returns {array} - The array of all proto-route definitions following Fastify format.
 */
export function parseMethods(openAPIMethodSpecList, handlers) {
  // Handle all non method properties: summary, description, servers, parameters
  const globalParameters = openAPIMethodSpecList.parameters || [];
  const methodsArray = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
  return Object.keys(openAPIMethodSpecList)
    .filter((method) => { return methodsArray.includes(method); })
    .map((method) => {
      console.info(`------Parsing Method: ${method}`); // eslint-disable-line no-console
      const operationId = createCamelCaseFromStr(openAPIMethodSpecList[method].operationId);
      if (!handlers[operationId] || typeof handlers[operationId] !== 'function') {
        /* eslint-disable no-console */
        console.error(`!!! The handler ${operationId} is absent. Implement the handler before trying to start the service`);
        /* eslint-enable no-console */
        process.exit(1); //eslint-disable-line
      }
      const localParameters = openAPIMethodSpecList[method].parameters || [];
      const finalParams = parseParameters(localParameters.concat(globalParameters));
      return {
        method: method.toUpperCase(),
        schema: {
          ...parseParameters(localParameters.concat(globalParameters)),
          ...parseRequestBody(openAPIMethodSpecList[method].requestBody),
          ...parseResponses(openAPIMethodSpecList[method].responses),
        },
        handler: handlers[operationId],
      };
    });
}

/**
 * Create the Fastify route from an OPEN API specs.
 * @param {object} openAPiRawSpecs - an OPEN API Spec
 * @param {object} handlers - Mixin containing all handlers defined.
 * @returns {array} - The array of all route definitions ready to be injected inside Fastify
 */
export default function routesFromOpenApiSpecs(openAPiRawSpecs, handlers) {
  const routes = [];
  console.info('Parsing references'); // eslint-disable-line no-console
  openAPiRawSpecs.components = openAPiRawSpecs.components || {}; // We set the component property at empty if non-existant
  const specs = resolveInternalReferences(openAPiRawSpecs);
  console.info('Parsing routes from the OpenAPI Specs'); // eslint-disable-line no-console
  Object.keys(specs.paths).forEach((path) => {
    const url = transformPath(path);
    console.info(`----Creating Path: ${url}`); // eslint-disable-line no-console
    parseMethods(specs.paths[path], handlers).forEach((routeSpec) => {
      routes.push({
        ...routeSpec,
        url,
      });
    });
  });
  return routes;
}

/**
 * Wrap properties into a JSON Sschema empty object.
 * @param {object} properties - JSON Schema promerties
 * @returns {object} - A well structured object containing the passed properties
 */
export function wrapEmptyObjects(properties) {
  return {
    type: 'object',
    properties: {
      ...properties,
    }
  };
}