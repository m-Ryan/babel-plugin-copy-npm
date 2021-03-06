import * as rollup from 'rollup';
import { uglify } from 'rollup-plugin-uglify';
const babel = require('rollup-plugin-babel');
const path = require('path');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
import fs from 'fs-extra';
export interface IwriteOptions {
	deep: boolean;
	rootDir: string;
	outputDir: string;
	npmDir: string;
	exclude: string[];
	minify: boolean;
}
export function writeNpmPkgSync(config, writeOptions: IwriteOptions) {
	config = {
		...config,
		onwarn: function(warning) {
			if (warning.code === 'THIS_IS_UNDEFINED') {
				return;
			}
			console.warn(warning.message);
		},
		plugins: [
			babel({
				presets: [
					[
						'@babel/env',
						{
							modules: false
						}
					]
				]
			})
		]
	};
	if (writeOptions.deep) {
		config.external = (id) => {
			if (!id.includes('rollupPluginBabelHelpers')) {
				return true;
			}
			return !/^(\.|\/)/.test(id);
		};
		config.plugins = [
			babel({
				presets: [
					[
						'@babel/env',
						{
							modules: false
						}
					]
				],
				plugins: [ [ path.join(path.dirname(__filename), 'index.js'), Object.assign({}, writeOptions) ] ]
			})
		];
	} else {
		const babelOptions: any = {
			presets: [
				[
					'@babel/env',
					{
						modules: false
					}
				]
			],
			plugins: [ 'transform-node-env-inline' ]
		};
		config.plugins = [ nodeResolve(), commonjs(), babel(babelOptions) ];
	}
	if (writeOptions.minify) {
		config.plugins.push(uglify());
	}
	let output = config.output;
	let { file } = output;
	return rollup
		.rollup(config)
		.then((bundle) => bundle.generate(output))
		.then((rst) => {
			mkdirsSync(path.dirname(file));
			fs.writeFileSync(file, rst.output[0].code);
		})
		.catch((e) => {
			console.log(e);
		});
}

function mkdirsSync(dirname: string) {
	if (fs.existsSync(dirname)) {
		return true;
	} else {
		if (mkdirsSync(path.dirname(dirname))) {
			fs.mkdirSync(dirname);
			return true;
		}
	}
}
