"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const template_1 = __importDefault(require("@babel/template"));
const writeNpmPkgSync_1 = require("./writeNpmPkgSync");
const t = __importStar(require("babel-types"));
const cacheNpmPkgMap = {};
const ROLLUP_HELPER = 'rollupPluginBabelHelpers.js';
const CACHE_NPM_FILE = path_1.default.join(process.cwd(), '.cache-npm');
let cacheNpmData = [];
let hasReadCacheFile = false;
function resolveModule(types) {
    const PLUGIN_NAME = 'babel-plugin-copy-npm';
    let options;
    return {
        name: PLUGIN_NAME,
        pre(file) {
            const { filename, envName, cwd } = file.opts;
            const pluginOptions = file.opts.plugins.find((item) => item.key === PLUGIN_NAME).options;
            options = Object.assign({ filename,
                envName,
                cwd }, pluginOptions);
            if (pluginOptions.cache && !hasReadCacheFile) {
                hasReadCacheFile = true;
                if (!fs_extra_1.default.existsSync(CACHE_NPM_FILE)) {
                    fs_extra_1.default.writeFileSync(CACHE_NPM_FILE, '[]');
                    cacheNpmData = [];
                }
                else {
                    try {
                        cacheNpmData = JSON.parse(fs_extra_1.default.readFileSync(CACHE_NPM_FILE, 'utf8'));
                        cacheNpmData.forEach((item) => {
                            cacheNpmPkgMap[item.name] = true;
                        });
                    }
                    catch (error) {
                        throw new Error('读取缓存出错，请删除根目录下的.cache-npm');
                    }
                }
            }
        },
        visitor: {
            ImportDeclaration(path) {
                let npmPkgName = path.node.source.value;
                const specifiers = path.node.specifiers;
                if (npmPkgName.includes(ROLLUP_HELPER)) {
                    return;
                }
                if (isNpmPkg(npmPkgName)) {
                    npmPkgName = resolveModulePath(npmPkgName, options);
                    if (options.loose) {
                        path.node.source.value = npmPkgName;
                        return;
                    }
                    let importNode = '';
                    if (specifiers.length === 0) {
                        importNode = template_1.default.statement.ast `require("${npmPkgName}")`;
                    }
                    else {
                        const name = path.node.specifiers[0].local.name;
                        if (!t.isImportDefaultSpecifier(specifiers[0])) {
                            const params = specifiers.join(',');
                            importNode = template_1.default.statement.ast `var { ${params} } = require("${npmPkgName}")`;
                        }
                        else {
                            importNode = template_1.default.statement.ast `var ${name} = require("${npmPkgName}")`;
                        }
                    }
                    path.replaceWith(importNode);
                }
            },
            CallExpression(astPath) {
                const { node } = astPath;
                const callee = node.callee;
                if (callee.name === 'require') {
                    const args = node.arguments;
                    const npmPkgName = args[0].value;
                    if (npmPkgName.includes(ROLLUP_HELPER)) {
                        return;
                    }
                    if (isNpmPkg(npmPkgName)) {
                        args[0].value = resolveModulePath(npmPkgName, options);
                    }
                }
            }
        }
    };
}
exports.default = resolveModule;
function resolveModulePath(npmpkgName, options) {
    const { npmDir, rootDir, outputDir, cwd, filename, exclude } = options;
    const outputDirPath = path_1.default.join(cwd, outputDir);
    const dependenceDirPath = path_1.default.join(cwd, 'node_modules');
    const npmDirPath = path_1.default.join(cwd, outputDir, npmDir);
    let inputNpmPkgPath = path_1.default.join(dependenceDirPath, npmpkgName);
    const packageJson = path_1.default.join(inputNpmPkgPath, 'package.json');
    if (fs_extra_1.default.existsSync(packageJson)) {
        const main = require(packageJson).main;
        if (main) {
            const mainEntry = path_1.default.join(inputNpmPkgPath, main);
            const mainEntryWithIndexJS = path_1.default.join(inputNpmPkgPath, main + '.js');
            if (fs_extra_1.default.existsSync(mainEntry)) {
                inputNpmPkgPath = path_1.default.join(inputNpmPkgPath, main);
            }
            else if (fs_extra_1.default.existsSync(mainEntryWithIndexJS)) {
                inputNpmPkgPath = path_1.default.join(inputNpmPkgPath, main + '.js');
            }
        }
    }
    else {
        let tempPathWithJS = `${inputNpmPkgPath}.js`;
        let tempPathWithIndexJS = `${inputNpmPkgPath}${path_1.default.sep}index.js`;
        let tempPathWithNameJS = `${inputNpmPkgPath}${path_1.default.sep}${npmpkgName}.min.js`;
        if (fs_extra_1.default.existsSync(tempPathWithJS)) {
            inputNpmPkgPath += '.js';
        }
        else if (fs_extra_1.default.existsSync(tempPathWithIndexJS)) {
            inputNpmPkgPath += '/index.js';
        }
        else if (fs_extra_1.default.existsSync(tempPathWithNameJS)) {
            inputNpmPkgPath += `/${npmpkgName}.min.js`;
        }
    }
    const outputNpmPkgPath = path_1.default.join(npmDirPath, `${npmpkgName}.js`);
    if (!fs_extra_1.default.existsSync(outputDirPath)) {
        fs_extra_1.default.mkdirSync(outputDirPath);
    }
    if (!fs_extra_1.default.existsSync(npmDirPath)) {
        fs_extra_1.default.mkdirSync(npmDirPath);
    }
    if (!cacheNpmPkgMap[npmpkgName]) {
        cacheNpmPkgMap[npmpkgName] = true;
        if (options.cache) {
            cacheNpmData.push({
                name: npmpkgName,
                time: new Date().toLocaleString()
            });
            fs_extra_1.default.writeFile(CACHE_NPM_FILE, JSON.stringify(cacheNpmData));
        }
        writeNpmPkgSync_1.writeNpmPkgSync({
            input: inputNpmPkgPath,
            output: {
                file: outputNpmPkgPath,
                format: options.format || 'umd',
                strict: !!options.strict,
                name: npmpkgName
            }
        }, {
            deep: options.deep,
            rootDir,
            outputDir,
            npmDir,
            exclude,
            minify: options.minify
        });
    }
    let outputFilePath = path_1.default.dirname(filename).replace(/\\/gm, '/').replace(new RegExp(`\\b${rootDir}\\b`), outputDir);
    let relativeRequirePath = path_1.default.relative(outputFilePath, outputNpmPkgPath).replace(/\\/g, '/');
    if (/^./.test(relativeRequirePath)) {
        relativeRequirePath = './' + relativeRequirePath;
    }
    return relativeRequirePath;
}
const isNpmPkg = function (name) {
    if (/^(\.|\/)/.test(name)) {
        return false;
    }
    return true;
};
