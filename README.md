# Typescript NPM package template

[![Test](https://github.com/WarstekHUN/typescript-npm-package-template/actions/workflows/test.yml/badge.svg)](https://github.com/WarstekHUN/typescript-npm-package-template/actions/workflows/test.yml)
![Static Badge](https://img.shields.io/badge/License%20-%20MIT%20-%20brightgreen)

<img src=".coverage-badges/badge-statements.svg">
<img src=".coverage-badges/badge-branches.svg">
<img src=".coverage-badges/badge-functions.svg">
<img src=".coverage-badges/badge-lines.svg">

### Based on <a href="https://github.com/tomchen/example-typescript-package" target="_blank" rel="noopener noreferrer">Tom Chen's amazing template</a>

## Features
- Building for severeal enviroments:
  - ESM
  - CommonJS
  - UMD
- Your to be published package'll can be ran both in browsers and with NodeJS
  - Tested on:
    - NodeJS: 16.x | 17.x | 18.x
    - Webpack: 5
    - (Qwik: 1.26)
- Creates *d.ts* by default
- Supports tests with coverage with JEST
  - Outputs coverage badges automatically on build
- Github Actions tests

## Usage
- After cloning the repo simply run `npm install` to install the required dependencies.
- Configurate package.json for your needs
- Write your code
- Publish your package!

### *It is really that simple!*

## Detailed Usage
- All the tests are located in the ./test folder.
  - You can run them with:
    - `npm run test` for simple testing
    - `npm run test:cov` for coverage testing. Will also open the coverage test results in your default browser.
- Format youre code with Prettier:
  - `npm run format:fix`: Automatically fixes formatting.
  - `npm run format:check`: "Does not fix, only checks if fixing is needed, outputs results"
- Build your project with:
  - `npm run build`: Builds the whole project 
  - `npm run build:esm`: Builds only the ESM version
  - `npm run build:cjs`: Builds only the CommonJS version
  - `npm run build:umd`: Builds only the UMD version
  - `npm run build:types`: Builds only the types (d.ts)
- Incrementing package version, creating commit:
  - `npm run comver`: 
    - Increments version automatically.
    - Asks for new package version or level of incrementing
      - Just like using *npm version*. Default: patch
      - Asks for custom commit message. Default: incremented version number

## Try your package before publishing
### Try it before publishing

Run:

```bash
npm link
```

[npm link](https://docs.npmjs.com/cli/v6/commands/npm-link) will create a symlink in the global folder, which may be **{prefix}/lib/node_modules/example-typescript-package** or **C:\Users\<username>\AppData\Roaming\npm\node_modules\example-typescript-package**.

Create an empty folder elsewhere, you don't even need to `npm init` (to generate **package.json** *because your linked package won't show up in package.json*). Open the folder with VS Code, open a terminal and just run:

```bash
npm link typescript-npm-package-template
```

This will create a symbolic link from globally-installed example-typescript-package to **node_modules/** of the current folder. Then you'll be able to import your project by using its name property's value from **package.json**

```ts
import { Num } from 'typescript-npm-package-template';
console.log(new Num(5).add(new Num(6)).val() === 11)
```

## Publishing your package
### Manual publishing to NPM

Log in:

```bash
npm adduser
```

And publish:

```bash
npm publish
```

### Using a Github Release (CI):
- Publish your package to NPM and Github Packages at the same time!
  
#### Publishing to NPM
Follow [npm's official](https://docs.npmjs.com/creating-and-viewing-access-tokens) instruction to create an npm token. Choose "Publish" from the website, or use `npm token create` without argument with the CLI.
**If you use 2FA**, then make sure it's enabled for authorization only instead of authorization and publishing **(Edit Profile -> Modify 2FA)**.

On the page of your newly created or existing GitHub repo, click **Settings** -> **Secrets** -> **New repository secret**, the Name should be `NPM_TOKEN`` and the Value should be your npm token.
### Publishing to Github Packages
The default configuration of this example package **assumes you publish package with an unscoped name to npm**. GitHub Packages must be named with a scope name such as "@tomchen/example-typescript-package".

Change `scope: '@warstekhun'` to your own scope in **.github/workflows/publish.yml**, also change `addscope` in **package.json**.

If you want to publish your package with a scoped name, change the name property in **package.json** and the scope from *@warstekhun* to yours at **.github/workflows/publish.yml:47**.

<!-- If you publish package with a scoped name to npm, change the name to something like "@tomchen/example-typescript-package" in **package.json**, and remove the `- run: npm run addscope` line in **.github/workflows/publish.yml** -->

If you publish your package to npm only, and don't want to publish to GitHub Packages, then delete the lines from `- name: Setup .npmrc file to publish to GitHub Packages` to the end of the file in **.github/workflows/publish.yml**.

(You might have noticed `secret.GITHUB_TOKEN` in **.github/workflows/publish.yml**. You don't need to set up a secret named `GITHUB_TOKEN` actually, it is [automatically created](https://docs.github.com/en/free-pro-team@latest/actions/reference/authentication-in-a-workflow#about-the-github_token-secret))


## References
- [Creating and publishing unscoped public packages - npm docs](https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages)
- [npm-publish - npm docs](https://docs.npmjs.com/cli/v6/commands/npm-publish)
- [Publishing - TypeScript docs](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)
- [Publishing Node.js packages - GitHub Docs](https://docs.github.com/en/free-pro-team@latest/actions/guides/publishing-nodejs-packages)

Also, because this template project is a remastered version of Tom Scott's, if you want to publish a Python package, you should definetly start your project with his [Example PyPI (Python Package Index) Package & Tutorial / Instruction / Workflow for 2021](https://github.com/tomchen/example_pypi_package) template.