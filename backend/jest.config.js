/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      useESM: true,
      tsconfig: {
        module: "ESNext",
        moduleResolution: "bundler",  // ← era "node10", troca para "bundler"
        esModuleInterop: true,        // ← adiciona isso
        ignoreDeprecations: "6.0",    // ← silencia o warning do TS 6
      },
    }],
  },
};