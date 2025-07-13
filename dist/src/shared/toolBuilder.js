import { z } from 'zod';
import { logger } from './log';
const toolRegistry = new Map();
function isOk(res) {
    return res.ok;
}
function formatResponse(response) {
    // Handle ToolResponse format
    if ('ok' in response) {
        if (isOk(response)) {
            const dataToLog = 'data' in response ? response.data : null;
            const message = ('message' in response && response.message) ||
                (dataToLog && dataToLog.message) ||
                'Operation successful';
            const content = [
                { type: 'text', text: message },
            ];
            // Only add data if it exists and isn't redundant with message
            if (dataToLog !== null && dataToLog !== undefined) {
                content.push({ type: 'text', text: JSON.stringify(dataToLog, null, 2) });
            }
            return { content };
        }
        else {
            let errorMessage = 'An error occurred';
            if ('error' in response && response.error) {
                errorMessage =
                    response.error instanceof Error
                        ? response.error.message
                        : String(response.error);
            }
            const content = [{ type: 'text', text: errorMessage }];
            if ('details' in response && response.details) {
                if (response.details.formattedDetails) {
                    content.push({
                        type: 'text',
                        text: `Details: ${response.details.formattedDetails}`,
                    });
                }
                const diagnosticInfo = {
                    status: response.details.status,
                    code: response.details.code,
                    requestId: response.details.requestId,
                };
                if (Object.values(diagnosticInfo).some((val) => val !== undefined)) {
                    content.push({
                        type: 'text',
                        text: `Diagnostic Info: ${JSON.stringify(diagnosticInfo)}`,
                    });
                }
            }
            return { content, isError: true };
        }
    }
    return {
        content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    };
}
function isBrokerApiError(error) {
    return (error &&
        typeof error === 'object' &&
        (error.name === 'BrokerError' ||
            error.constructor?.name === 'BrokerError' ||
            error.name === 'SchwabApiError' ||
            error.constructor?.name === 'SchwabApiError'));
}
function isAuthError(error) {
    return (error &&
        typeof error === 'object' &&
        (error.name === 'SchwabAuthError' ||
            error.constructor?.name === 'SchwabAuthError'));
}
export function toolError(message, details) {
    const error = message instanceof Error ? message : new Error(String(message));
    let enhancedDetails = { ...details };
    if (isBrokerApiError(error) || isAuthError(error)) {
        const apiError = error;
        enhancedDetails = {
            ...enhancedDetails,
            status: apiError.status,
            code: apiError.code,
            parsedError: apiError.parsedError,
        };
        if (typeof apiError.getRequestId === 'function') {
            enhancedDetails.requestId = apiError.getRequestId();
        }
        if (typeof apiError.getFormattedDetails === 'function') {
            enhancedDetails.formattedDetails = apiError.getFormattedDetails();
        }
    }
    logger.error('Tool error', {
        message: error.message, // Log only message to avoid large objects in primary log
        details: enhancedDetails,
        stack: error.stack,
    });
    return { ok: false, error, details: enhancedDetails };
}
export function toolSuccess({ data, message, source, }) {
    const count = Array.isArray(data) ? data.length : 1;
    logger.debug(`Tool success: ${source}`, {
        dataPreview: Array.isArray(data) ? `Array of ${count} items` : typeof data,
        count,
    });
    return { ok: true, data, message };
}
export function createTool(client, server, { name, description, schema, handler, }) {
    // Populate the internal toolRegistry
    toolRegistry.set(name, { schema, handler });
    logger.info(`[ToolBuilder] Added tool '${name}' to internal toolRegistry.`);
    // Keep individual tool registration with McpServer for potential direct calls
    // or if the dispatcher logic is ever removed.
    logger.info(`[ToolBuilder] Registering tool with McpServer for direct call: '${name}'.`);
    server.tool(name, description, schema instanceof z.ZodObject ? schema.shape : {}, async (args) => {
        try {
            logger.info(`[ToolBuilder] Direct invocation of tool: ${name}`);
            let parsedInput;
            try {
                parsedInput = schema.parse(args);
            }
            catch (validationError) {
                logger.error(`Input validation error in direct tool: ${name}`, {
                    validationError: validationError instanceof Error
                        ? validationError.message
                        : String(validationError),
                    argsReceived: args,
                });
                return formatResponse(toolError('Invalid input for direct tool call.', {
                    details: validationError instanceof Error
                        ? validationError.message
                        : String(validationError),
                }));
            }
            const result = await handler(parsedInput, client);
            return formatResponse(result);
        }
        catch (error) {
            logger.error(`Unexpected error in direct tool: ${name}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            return formatResponse(toolError(error instanceof Error
                ? error
                : new Error('Unknown error in direct tool call'), { source: name }));
        }
    });
    // The log from `createTool` in the original plan was inside the `createTool` that takes `name, schema, handler`
    // The message "Registered tool with McpServer: '${name}' using schema definition." is a bit redundant now
    // as we have a more specific log above for direct call registration.
    // Let's stick to the specific logs for clarity.
}
//# sourceMappingURL=toolBuilder.js.map