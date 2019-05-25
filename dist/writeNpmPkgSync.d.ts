export interface IwriteOptions {
    deep: boolean;
    rootDir: string;
    outputDir: string;
    npmDir: string;
    exclude: string[];
    minify: boolean;
}
export declare function writeNpmPkgSync(config: any, writeOptions: IwriteOptions): Promise<void>;
