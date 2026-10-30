import { fireEvent, render, screen } from "@testing-library/react-native";
import ListFooter from "../ListFooter";
import ErrorState from "../ErrorState";

describe("ListFooter", () => {
  it("renders nothing when idle", () => {
    render(<ListFooter loadingMore={false} error={null} onRetry={() => {}} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/Could not load more/)).toBeNull();
  });

  it("shows the error and retries", () => {
    const onRetry = jest.fn();
    render(<ListFooter loadingMore={false} error={new Error("boom")} onRetry={onRetry} />);
    expect(screen.getByText("Could not load more: boom")).toBeTruthy();
    fireEvent.press(screen.getByRole("button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("prefers the spinner over the error while loading", () => {
    render(<ListFooter loadingMore error={new Error("boom")} onRetry={() => {}} />);
    expect(screen.queryByText(/boom/)).toBeNull();
  });
});

describe("ErrorState", () => {
  it("shows the message and an optional retry", () => {
    const onRetry = jest.fn();
    render(<ErrorState message="No network" onRetry={onRetry} />);
    expect(screen.getByText("No network")).toBeTruthy();
    fireEvent.press(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("hides the button without a handler", () => {
    render(<ErrorState message="No network" />);
    expect(screen.queryByText("Retry")).toBeNull();
  });
});
