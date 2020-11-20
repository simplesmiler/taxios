export namespace SkipAdditionalProperties {
    export interface User {
        name?: string;
    }
    export interface ImplicitSkip {
        name?: string;
    }
    export interface ExplicitSkip {
        name?: string;
    }
    export interface ExplicitKeep {
        name?: string;
        [k: string]: unknown;
    }
}

export interface SkipAdditionalProperties {
    version: "1";
    routes: {
        "/v1/roles": {
            GET: {};
        };
    };
}
