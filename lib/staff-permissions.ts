export const operationModules = ['psychometrics','feedback360','pdl','nom035','climate','studies','candidates'] as const;
export type OperationModule = typeof operationModules[number];
export type OperationPermission = 'view'|'operate'|'reports';
