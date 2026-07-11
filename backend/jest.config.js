/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  // Cover application logic only — exclude the tests themselves and the barrel.
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/__tests__/**",
  ],
  coverageDirectory: "coverage",
};
