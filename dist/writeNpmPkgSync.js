"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rollup = __importStar(require("rollup"));
const babel = require('rollup-plugin-babel');
const path = require('path');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const fs_extra_1 = __importDefault(require("fs-extra"));
const rollup_plugin_uglify_1 = require("rollup-plugin-uglify");
function writeNpmPkgSync(config, writeOptions) {
    config = Object.assign({}, config, { onwarn: function (warning) {
            if (warning.code === 'THIS_IS_UNDEFINED') {
                return;
            }
            console.warn(warning.message);
        }, plugins: [
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
        ] });
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
                plugins: [[path.join(path.dirname(__filename), 'index.js'), Object.assign({}, writeOptions)]]
            })
        ];
    }
    else {
        const babelOptions = {
            presets: [
                [
                    '@babel/env',
                    {
                        modules: false
                    }
                ]
            ]
        };
        config.plugins = [nodeResolve(), commonjs(), babel(babelOptions)];
    }
    if (writeOptions.minify) {
        config.plugins.push(rollup_plugin_uglify_1.uglify());
    }
    let output = config.output;
    let { file } = output;
    return rollup
        .rollup(config)
        .then((bundle) => bundle.generate(output))
        .then((rst) => {
        mkdirsSync(path.dirname(file));
        fs_extra_1.default.writeFileSync(file, rst.output[0].code);
    })
        .catch((e) => {
        console.log(e);
    });
}
exports.writeNpmPkgSync = writeNpmPkgSync;
function mkdirsSync(dirname) {
    if (fs_extra_1.default.existsSync(dirname)) {
        return true;
    }
    else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs_extra_1.default.mkdirSync(dirname);
            return true;
        }
    }
}
