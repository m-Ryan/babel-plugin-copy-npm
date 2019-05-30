# babel-plugin-copy-npm

---

Install
---

```
npm install babel-plugin-copy-npm --dev

```

```
yarn add -D babel-plugin-copy-npm

```

Usage

---

babel({
	"presets": [
		[
			"@babel/env",
			{
				"modules": false
			}
		],
	],
	"plugins": [
		[
			'babel-plugin-copy-npm',
			{
				rootDir: 'src',
				outputDir: 'dist',
				npmDir: 'npm',
				format: 'cjs',
				strict: false,
				minify: true,
				loose: true,
				cache: true
			}
		]
	]
}
)

```js
