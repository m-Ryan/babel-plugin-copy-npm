export interface IOptions {
    rootDir: string;
    outputDir: string;
    npmDir: string;
    cwd?: string;
    deep?: boolean;
    minify?: boolean;
    strict?: boolean;
    format?: string;
    envName?: string;
    loose?: string;
    exclude: string[];
    cache: boolean;
}
export default function resolveModule(types: any): {
    name: string;
    pre(file: any): void;
    visitor: {
        ImportDeclaration(path: any): void;
        CallExpression(astPath: any): void;
    };
};
