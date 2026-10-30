import { fireEvent, render, screen } from "@testing-library/react-native";
import OptionPicker from "../OptionPicker";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

describe("OptionPicker", () => {
  it("renders every option and marks the selected one", () => {
    render(<OptionPicker options={options} value="b" onChange={() => {}} />);
    expect(screen.getByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByText("Gamma")).toBeTruthy();

    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
  });

  it("reports the tapped value", () => {
    const onChange = jest.fn();
    render(<OptionPicker options={options} value="a" onChange={onChange} />);
    fireEvent.press(screen.getByText("Gamma"));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("works in the wrapping layout too", () => {
    const onChange = jest.fn();
    render(<OptionPicker options={options} value="a" onChange={onChange} wrap />);
    fireEvent.press(screen.getByText("Beta"));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});
