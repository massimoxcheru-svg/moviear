import { fireEvent, render, screen } from "@testing-library/react-native";
import ReviewCard from "../ReviewCard";

const review = (overrides: Partial<Review> = {}): Review => ({
  id: "r1",
  author: "someone",
  author_details: { name: "Some One", username: "someone", avatar_path: null, rating: 8 },
  content: "Short and sweet.",
  created_at: "2024-03-12T10:00:00.000Z",
  updated_at: "2024-03-12T10:00:00.000Z",
  url: "https://example.com/r1",
  ...overrides,
});

describe("ReviewCard", () => {
  it("shows the author, date, score and text", () => {
    render(<ReviewCard review={review()} />);
    expect(screen.getByText("Some One")).toBeTruthy();
    expect(screen.getByText("12 March 2024")).toBeTruthy();
    expect(screen.getByText("8/10")).toBeTruthy();
    expect(screen.getByText("Short and sweet.")).toBeTruthy();
    expect(screen.queryByText("Read more")).toBeNull();
  });

  it("falls back to the author field and hides the score when there is none", () => {
    render(
      <ReviewCard
        review={review({
          author: "handle",
          author_details: { name: "", username: "handle", avatar_path: null, rating: null },
        })}
      />,
    );
    expect(screen.getByText("handle")).toBeTruthy();
    expect(screen.queryByText(/\/10/)).toBeNull();
  });

  it("truncates long text and expands on Read more", () => {
    const long = "word ".repeat(120).trim();
    render(<ReviewCard review={review({ content: long })} />);
    expect(screen.queryByText(long)).toBeNull();
    fireEvent.press(screen.getByText("Read more"));
    expect(screen.getByText(long)).toBeTruthy();
    expect(screen.getByText("Show less")).toBeTruthy();
  });
});
