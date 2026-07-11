import { getFirestore } from "firebase-admin/firestore";
import {
  createPayment,
  getPaymentById,
  listPaymentsByDebt,
  listPaymentsByUser,
  PAYMENTS_COLLECTION,
  validatePaymentInput,
} from "../payments";
import type { PaymentInput } from "../types";

jest.mock("firebase-admin/firestore");
const mockedGetFirestore = getFirestore as jest.MockedFunction<
  typeof getFirestore
>;

function validInput(overrides: Partial<PaymentInput> = {}): PaymentInput {
  return {
    userId: "user-1",
    debtId: "debt-1",
    amount: 250,
    paymentDate: "2026-07-01",
    ...overrides,
  };
}

describe("validatePaymentInput", () => {
  it("accepts a well-formed payment", () => {
    expect(() => validatePaymentInput(validInput())).not.toThrow();
  });

  it("rejects a missing or empty userId", () => {
    expect(() => validatePaymentInput(validInput({ userId: "" }))).toThrow(
      /userId/
    );
  });

  it("rejects a missing debtId", () => {
    expect(() =>
      validatePaymentInput(validInput({ debtId: "  " }))
    ).toThrow(/debtId/);
  });

  it("rejects a non-positive amount", () => {
    expect(() => validatePaymentInput(validInput({ amount: 0 }))).toThrow(
      /amount/
    );
    expect(() => validatePaymentInput(validInput({ amount: -5 }))).toThrow(
      /amount/
    );
  });

  it("rejects an invalid paymentDate", () => {
    expect(() =>
      validatePaymentInput(validInput({ paymentDate: "not-a-date" }))
    ).toThrow(/paymentDate/);
  });

  it("rejects negative principal/interest portions", () => {
    expect(() =>
      validatePaymentInput(validInput({ principalPortion: -1 }))
    ).toThrow(/principalPortion/);
    expect(() =>
      validatePaymentInput(validInput({ interestPortion: -1 }))
    ).toThrow(/interestPortion/);
  });
});

describe("createPayment", () => {
  it("validates, stamps an id + timestamps, and writes an owner-scoped doc", async () => {
    const set = jest.fn().mockResolvedValue(undefined);
    const doc = jest.fn().mockReturnValue({ id: "generated-id", set });
    const collection = jest.fn().mockReturnValue({ doc });
    mockedGetFirestore.mockReturnValue({ collection } as any);

    const payment = await createPayment(
      validInput({ method: "bank_transfer", note: "July payment" }),
      "2026-07-11T00:00:00.000Z"
    );

    expect(collection).toHaveBeenCalledWith(PAYMENTS_COLLECTION);
    expect(payment).toEqual({
      id: "generated-id",
      userId: "user-1",
      debtId: "debt-1",
      amount: 250,
      paymentDate: "2026-07-01",
      method: "bank_transfer",
      note: "July payment",
      principalPortion: undefined,
      interestPortion: undefined,
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-11T00:00:00.000Z",
    });
    expect(set).toHaveBeenCalledWith(payment);
  });

  it("does not touch Firestore when validation fails", async () => {
    const collection = jest.fn();
    mockedGetFirestore.mockReturnValue({ collection } as any);

    await expect(createPayment(validInput({ amount: -1 }))).rejects.toThrow(
      /amount/
    );
    expect(collection).not.toHaveBeenCalled();
  });
});

describe("getPaymentById", () => {
  it("returns the payment when the doc exists", async () => {
    const data = { id: "p1", userId: "user-1" };
    const get = jest.fn().mockResolvedValue({ exists: true, data: () => data });
    const doc = jest.fn().mockReturnValue({ get });
    mockedGetFirestore.mockReturnValue({
      collection: jest.fn().mockReturnValue({ doc }),
    } as any);

    await expect(getPaymentById("p1")).resolves.toEqual(data);
    expect(doc).toHaveBeenCalledWith("p1");
  });

  it("returns null when the doc is missing", async () => {
    const get = jest.fn().mockResolvedValue({ exists: false });
    mockedGetFirestore.mockReturnValue({
      collection: jest.fn().mockReturnValue({ doc: () => ({ get }) }),
    } as any);

    await expect(getPaymentById("nope")).resolves.toBeNull();
  });
});

describe("listPaymentsByUser", () => {
  it("queries by userId, ordered by paymentDate desc", async () => {
    const docs = [{ data: () => ({ id: "p1" }) }, { data: () => ({ id: "p2" }) }];
    const get = jest.fn().mockResolvedValue({ docs });
    const orderBy = jest.fn().mockReturnValue({ get });
    const where = jest.fn().mockReturnValue({ orderBy });
    const collection = jest.fn().mockReturnValue({ where });
    mockedGetFirestore.mockReturnValue({ collection } as any);

    const result = await listPaymentsByUser("user-1");

    expect(where).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(orderBy).toHaveBeenCalledWith("paymentDate", "desc");
    expect(result).toEqual([{ id: "p1" }, { id: "p2" }]);
  });
});

describe("listPaymentsByDebt", () => {
  it("filters by both userId and debtId (ownership enforced in the query)", async () => {
    const get = jest.fn().mockResolvedValue({ docs: [] });
    const orderBy = jest.fn().mockReturnValue({ get });
    const whereDebt = jest.fn().mockReturnValue({ orderBy });
    const whereUser = jest.fn().mockReturnValue({ where: whereDebt });
    const collection = jest.fn().mockReturnValue({ where: whereUser });
    mockedGetFirestore.mockReturnValue({ collection } as any);

    await listPaymentsByDebt("user-1", "debt-1");

    expect(whereUser).toHaveBeenCalledWith("userId", "==", "user-1");
    expect(whereDebt).toHaveBeenCalledWith("debtId", "==", "debt-1");
    expect(orderBy).toHaveBeenCalledWith("paymentDate", "desc");
  });
});
