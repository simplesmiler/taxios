export namespace MultiType {
    export type Text = string;
}

export interface MultiType {
    version: "1";
    routes: {
        "/v1/test": {
            POST: {};
        };
    };
}
