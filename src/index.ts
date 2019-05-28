import fs from 'fs-extra';
import path from 'path';
import template from '@babel/template';
import { writeNpmPkgSync } from './writeNpmPkgSync';
import * as t from 'babel-types';
const cacheNpmPkgMap: { [key: string]: boolean } = {};
const ROLLUP_HELPER = 'rollupPluginBabelHelpers.js';

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
}

interface INpmPkgOptions extends IOptions {
	filename: string;
}

export default function resolveModule(types) {
	const PLUGIN_NAME = 'babel-plugin-copy-npm';
	let options: INpmPkgOptions;

	return {
		name: PLUGIN_NAME,
		pre(file) {
			const { filename, envName, cwd } = file.opts;
			const plugin = file.opts.plugins.find((item) => item.key === PLUGIN_NAME);
			options = {
				filename,
				envName,
				cwd,
				...plugin.options
			};
		},
		visitor: {
			ImportDeclaration(path) {
				let npmPkgName = path.node.source.value;
				const specifiers = path.node.specifiers;
				const name = path.node.specifiers[0].local.name;
				if (npmPkgName.includes(ROLLUP_HELPER)) {
					return;
				}
				if (isNpmPkg(npmPkgName)) {
					npmPkgName = resolveModulePath(npmPkgName, options);

					// 由于import会检测依赖存不存在，如果直接改包路径，会报错
					if (options.loose) {
						path.node.source.value = npmPkgName;
						return;
					}

					let importNode = '';
					if (!t.isImportDefaultSpecifier(specifiers[0])) {
						const params = specifiers.join(',');
						importNode = template.statement.ast`var { ${params} } = require("${npmPkgName}")`;
					} else {
						importNode = template.statement.ast`var ${name} = require("${npmPkgName}")`;
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

function resolveModulePath(npmpkgName: string, options: INpmPkgOptions) {
	const { npmDir, rootDir, outputDir, cwd, filename, exclude } = options;
	const outputDirPath = path.join(cwd, outputDir);
	const dependenceDirPath = path.join(cwd, 'node_modules');
	const npmDirPath = path.join(cwd, outputDir, npmDir);
	let inputNpmPkgPath = path.join(dependenceDirPath, npmpkgName);
	// 从packagejson读取

	const packageJson = path.join(inputNpmPkgPath, 'package.json');
	if (fs.existsSync(packageJson)) {
		const main = require(packageJson).main;
		const mainEntry = path.join(inputNpmPkgPath, main);
		const mainEntryWithIndexJS = path.join(inputNpmPkgPath, main + '.js');

		if (fs.existsSync(mainEntry)) {
			inputNpmPkgPath = path.join(inputNpmPkgPath, main);
		} else if (fs.existsSync(mainEntryWithIndexJS)) {
			inputNpmPkgPath = path.join(inputNpmPkgPath, main + '.js');
		}
	} else {
		let tempPathWithJS = `${inputNpmPkgPath}.js`;
		let tempPathWithIndexJS = `${inputNpmPkgPath}${path.sep}index.js`;
		let tempPathWithNameJS = `${inputNpmPkgPath}${path.sep}${npmpkgName}.min.js`;
		if (fs.existsSync(tempPathWithJS)) {
			inputNpmPkgPath += '.js';
		} else if (fs.existsSync(tempPathWithIndexJS)) {
			inputNpmPkgPath += '/index.js';
		} else if (fs.existsSync(tempPathWithNameJS)) {
			inputNpmPkgPath += `/${npmpkgName}.min.js`;
		}
	}
	const outputNpmPkgPath = path.join(npmDirPath, `${npmpkgName}.js`);
	if (!fs.existsSync(outputDirPath)) {
		fs.mkdirSync(outputDirPath);
	}
	if (!fs.existsSync(npmDirPath)) {
		fs.mkdirSync(npmDirPath);
	}

	if (!cacheNpmPkgMap[npmpkgName]) {
		cacheNpmPkgMap[npmpkgName] = true;
		writeNpmPkgSync(
			{
				input: inputNpmPkgPath,
				output: {
					file: outputNpmPkgPath,
					format: options.format || 'umd',
					strict: !!options.strict, // default false
					name: npmpkgName
				}
			},
			{
				deep: options.deep,
				rootDir,
				outputDir,
				npmDir,
				exclude,
				minify: options.minify
			}
		);
	}
	let outputFilePath = path.dirname(filename).replace(/\\/gm, '/').replace(new RegExp(`\\b${rootDir}\\b`), outputDir);
	let relativeRequirePath = path.relative(outputFilePath, outputNpmPkgPath).replace(/\\/g, '/');
	if (/^./.test(relativeRequirePath)) {
		relativeRequirePath = './' + relativeRequirePath;
	}
	return relativeRequirePath;
}

const isNpmPkg = function(name) {
	if (/^(\.|\/)/.test(name)) {
		return false;
	}
	return true;
};
