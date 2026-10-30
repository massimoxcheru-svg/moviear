import { fireEvent, render, screen } from "@testing-library/react-native";
import RatingPicker from "../RatingPicker";

describe("RatingPicker", () => {
  it("shows ten stars and the prompt when nothing is rated", () => {
    render(<RatingPicker value={null} onChange={() => {}} />);
    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.getByText("Tap a star to rate")).toBeTruthy();
  });

  it("shows the current score", () => {
    render(<RatingPicker value={7} onChange={() => {}} />);
    expect(screen.getByText("7 / 10")).toBeTruthy();
    expect(screen.getByLabelText("7 out of 10")).toBeChecked();
  });

  it("selects a star, and clears when the same star is tapped again", () => {
    const onChange = jest.fn();
    render(<RatingPicker value={4} onChange={onChange} />);

    fireEvent.press(screen.getByLabelText("9 out of 10"));
    expect(onChange).toHaveBeenLastCalledWith(9);

    fireEvent.press(screen.getByLabelText("4 out of 10"));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
