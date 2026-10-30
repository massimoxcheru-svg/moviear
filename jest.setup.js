// AsyncStorage has no native module under Jest; the official in-memory mock
// stands in for it. Store tests that need a controllable disk replace this
// with their own mock.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
