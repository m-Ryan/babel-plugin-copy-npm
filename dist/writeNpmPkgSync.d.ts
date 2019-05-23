export interface IwriteOptions {
    deep: boolean;
    rootDir: string;
    outputDir: string;
    npmDir: string;
    exclude: string[];
}
export declare function writeNpmPkgSync(config: any, writeOptions: any): Promise<void>;
