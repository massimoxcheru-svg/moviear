/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  clearMocks: true,
  setupFiles: ["./jest.setup.js"],
  testPathIgnorePatterns: ["/node_modules/", "/\\.expo/", "/dist/"],
};
