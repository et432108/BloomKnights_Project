import { currency, monthsLabel, percent, ratio, shortDate } from "@/lib/format";

describe("currency", () => {
  it("formats whole-dollar USD", () => {
    expect(currency(4000)).toBe("$4,000");
    expect(currency(0)).toBe("$0");
  });

  it("guards against non-finite input", () => {
    expect(currency(NaN)).toBe("$0");
    expect(currency(Infinity)).toBe("$0");
  });
});

describe("percent", () => {
  it("rounds to a whole percent", () => {
    expect(percent(22)).toBe("22%");
    expect(percent(24.6)).toBe("25%");
  });
});

describe("ratio", () => {
  it("clamps to 0..1", () => {
    expect(ratio(50, 100)).toBe(0.5);
    expect(ratio(150, 100)).toBe(1);
    expect(ratio(10, 0)).toBe(0);
  });
});

describe("shortDate", () => {
  it("formats an ISO date", () => {
    expect(shortDate("2026-07-11T00:00:00Z")).toMatch(/Jul\s+1[01],\s+2026/);
  });

  it("returns a dash for an invalid date", () => {
    expect(shortDate("not-a-date")).toBe("—");
  });
});

describe("monthsLabel", () => {
  it("labels payoff horizons", () => {
    expect(monthsLabel(0)).toBe("Paid off");
    expect(monthsLabel(4)).toBe("4 mo");
    expect(monthsLabel(12)).toBe("1 yr");
    expect(monthsLabel(16)).toBe("1 yr 4 mo");
  });
});
