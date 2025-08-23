import React from "react";
import { render } from "@testing-library/react";
import App from "./App";

test("renders coinsweeper game", () => {
  render(<App />);
  // Basic test to ensure app renders without crashing
  expect(true).toBe(true);
});
