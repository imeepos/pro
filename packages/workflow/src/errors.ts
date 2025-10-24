import { IAstStates } from "./types";

export class WorkflowError extends Error {
    constructor(
        message: string,
        public readonly state: IAstStates,
        public readonly workflowId?: string
    ) {
        super(message);
        this.name = 'WorkflowError';
    }
}
