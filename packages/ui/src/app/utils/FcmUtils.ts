import { hasKey, testJson } from './GenericUtils';

export type ValidationResult = {
    valid: boolean;
    error?: string;
};

export const validateClientConfig = (value: string): ValidationResult => {
    const data = testJson(value);
    if (!data) return { valid: false, error: 'File is not valid JSON.' };

    if (!hasKey(data, 'project_info')) return { valid: false, error: 'Missing "project_info" key. This may not be a Google Services JSON file.' };
    if (!hasKey(data, 'client')) return { valid: false, error: 'Missing "client" key. This may not be a Google Services JSON file.' };
    if (!hasKey(data, 'configuration_version')) return { valid: false, error: 'Missing "configuration_version" key. This may not be a Google Services JSON file.' };

    return { valid: true };
};

export const validateServerConfig = (value: string): ValidationResult => {
    const data = testJson(value);
    if (!data) return { valid: false, error: 'File is not valid JSON.' };

    if (!hasKey(data, 'project_id')) return { valid: false, error: 'Missing "project_id" key. This may not be a Firebase Admin SDK JSON file.' };
    if (!hasKey(data, 'private_key_id')) return { valid: false, error: 'Missing "private_key_id" key. This may not be a Firebase Admin SDK JSON file.' };
    if (!hasKey(data, 'private_key')) return { valid: false, error: 'Missing "private_key" key. This may not be a Firebase Admin SDK JSON file.' };
    return { valid: true };
};

export const isValidClientConfig = (value: string): boolean => validateClientConfig(value).valid;

export const isValidServerConfig = (value: string): boolean => validateServerConfig(value).valid;

export const isValidFirebaseUrl = (config: NodeJS.Dict<any>): boolean => {
    return config?.project_info?.firebase_url != null;
};