export interface IOptions {
    rootDir: string;
    outputDir: string;
    npmDir: string;
    cwd?: string;
    deep?: boolean;
    envName?: string;
    exclude: string[];
}
export default function resolveModule(types: any): {
    name: string;
    pre(file: any): void;
    visitor: {
        ImportDeclaration(path: any): void;
        CallExpression(astPath: any): void;
    };
};
