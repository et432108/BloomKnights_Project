/** @type {import('jest').Config} */
module.exports = {
  // jsdom gives the tests a browser-like environment (window, document, etc.).
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  // Match the app's "@/..." path alias from tsconfig.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        // Override the app's bundler/ESM settings for the Node-based test run.
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          jsx: "react-jsx",
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/store/**/*.ts",
    "!src/**/*.test.ts",
  ],
};
