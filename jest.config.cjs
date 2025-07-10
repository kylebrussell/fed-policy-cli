// jest.config.cjs
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // Override the tsconfig.json to transpile to CommonJS for testing
        tsconfig: {
          module: "commonjs"
        }
      }
    ]
  }
};