import { z } from 'zod';
/**
 * Schema for validating the approved clients cookie content.
 * Ensures the cookie contains an array of string client IDs.
 */
export declare const ApprovedClientsSchema: z.ZodArray<z.ZodString, "many">;
/**
 * Schema for validating state data.
 * Includes common fields that may be present in the state object.
 */
export declare const StateSchema: z.ZodObject<{
    clientId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    oauthReqInfo: z.ZodOptional<z.ZodObject<{
        responseType: z.ZodString;
        clientId: z.ZodString;
        redirectUri: z.ZodString;
        scope: z.ZodArray<z.ZodString, "many">;
        state: z.ZodString;
        codeChallenge: z.ZodOptional<z.ZodString>;
        codeChallengeMethod: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        state: string;
        scope: string[];
        clientId: string;
        responseType: string;
        redirectUri: string;
        codeChallenge?: string | undefined;
        codeChallengeMethod?: string | undefined;
    }, {
        state: string;
        scope: string[];
        clientId: string;
        responseType: string;
        redirectUri: string;
        codeChallenge?: string | undefined;
        codeChallengeMethod?: string | undefined;
    }>>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    clientId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    oauthReqInfo: z.ZodOptional<z.ZodObject<{
        responseType: z.ZodString;
        clientId: z.ZodString;
        redirectUri: z.ZodString;
        scope: z.ZodArray<z.ZodString, "many">;
        state: z.ZodString;
        codeChallenge: z.ZodOptional<z.ZodString>;
        codeChallengeMethod: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        state: string;
        scope: string[];
        clientId: string;
        responseType: string;
        redirectUri: string;
        codeChallenge?: string | undefined;
        codeChallengeMethod?: string | undefined;
    }, {
        state: string;
        scope: string[];
        clientId: string;
        responseType: string;
        redirectUri: string;
        codeChallenge?: string | undefined;
        codeChallengeMethod?: string | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    clientId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
    oauthReqInfo: z.ZodOptional<z.ZodObject<{
        responseType: z.ZodString;
        clientId: z.ZodString;
        redirectUri: z.ZodString;
        scope: z.ZodArray<z.ZodString, "many">;
        state: z.ZodString;
        codeChallenge: z.ZodOptional<z.ZodString>;
        codeChallengeMethod: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        state: string;
        scope: string[];
        clientId: string;
        responseType: string;
        redirectUri: string;
        codeChallenge?: string | undefined;
        codeChallengeMethod?: string | undefined;
    }, {
        state: string;
        scope: string[];
        clientId: string;
        responseType: string;
        redirectUri: string;
        codeChallenge?: string | undefined;
        codeChallengeMethod?: string | undefined;
    }>>;
}, z.ZodTypeAny, "passthrough">>;
/**
 * Type for the state data
 */
export type StateData = z.infer<typeof StateSchema>;
