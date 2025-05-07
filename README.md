# epsilon-lyrae

`epsilon-lyrae` is a proof-of-concept tool for checking field access in a subset of Vega specifications.
It is the result of my bachelor thesis.

## Downloading the repository
```
git clone --recursive-submodules $REPO_URL
```

## Building
This is a TypeScript project.
You may build it using [`yarn`](https://yarnpkg.com/getting-started/install).
This project was developed with yarn v1.22.22.

First, install the required dependencies:
```
yarn install
```

You may then build the project with
```
yarn build
```

To build and run the project, use
```
yarn start < path/to/spec.vg.json
```

### Docker image
Alternatively, if you don't want to build the project yourself,
you can use the prebuilt Docker image [here](TODO).

## Usage
The program expects a Vega specification on standard input.

You may run an already built project with
```
yarn start-cached < path/to/spec.vg.json
```
