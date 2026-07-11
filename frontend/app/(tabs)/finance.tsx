import { useMemo, useState } from "react";
import { Link } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useAuthStore } from "@/store/useAuthStore";
import { useFinanceStore } from "@/store/useFinanceStore";
import { currency, ratio, shortDate } from "@/lib/format";
import { remainingBalance } from "@/lib/debt";
import {
  ALLOCATION_TOTAL,
  allocationAmount,
  clampPercent,
  isValidAllocations,
} from "@/lib/allocations";
import type { Allocations, Debt, FixedExpense, SavingsGoal } from "@/types";

/**
 * Unified Finance screen. Everything the user can own — income & allocations,
 * debts, savings goals, and fixed expenses — lives here with inline add / edit /
 * delete, replacing the old per-entity tabs. Edits go through the store actions
 * which persist to Firestore and mirror into local state.
 */

const INPUT =
  "rounded-lg border border-gray-200 px-3 py-2 text-gray-900 dark:border-gray-600 dark:text-white";

/** Parse a user-typed number, returning NaN for blanks so callers can validate. */
const num = (s: string): number => (s.trim() === "" ? NaN : Number(s));

// ---- shared bits -----------------------------------------------------------

function SectionHeader({
  title,
  onAdd,
  addLabel,
}: {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="font-headline text-xl font-bold text-on-surface dark:text-white">
        {title}
      </Text>
      {onAdd && (
        <Pressable
          onPress={onAdd}
          className="flex-row items-center gap-1 rounded-full bg-primary px-3 py-1.5 active:opacity-80"
        >
          <MaterialIcons name="add" size={16} color="#fff" />
          <Text className="text-sm font-semibold text-white">
            {addLabel ?? "Add"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** Row action buttons: Edit + a two-step (confirm) Delete that works on web. */
function RowActions({
  onEdit,
  onDelete,
  busy,
}: {
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (busy) return <ActivityIndicator color="#0d631b" />;

  if (confirming) {
    return (
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onDelete}
          className="rounded-full bg-error px-3 py-1.5 active:opacity-80"
        >
          <Text className="text-xs font-semibold text-white">Delete</Text>
        </Pressable>
        <Pressable
          onPress={() => setConfirming(false)}
          className="rounded-full border border-gray-300 px-3 py-1.5 active:opacity-60 dark:border-gray-600"
        >
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            Cancel
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-1">
      <Pressable onPress={onEdit} className="rounded-full p-2 active:bg-surface-container">
        <MaterialIcons name="edit" size={18} color="#40493d" />
      </Pressable>
      <Pressable
        onPress={() => setConfirming(true)}
        className="rounded-full p-2 active:bg-surface-container"
      >
        <MaterialIcons name="delete-outline" size={18} color="#ba1a1a" />
      </Pressable>
    </View>
  );
}

function SaveCancel({
  onSave,
  onCancel,
  saving,
  saveLabel = "Save",
  disabled,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  saveLabel?: string;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row gap-2">
      <Pressable
        disabled={saving || disabled}
        onPress={onSave}
        className={`flex-1 rounded-full px-4 py-2.5 active:opacity-80 ${
          disabled ? "bg-gray-300 dark:bg-gray-700" : "bg-primary"
        }`}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center text-sm font-semibold text-white">
            {saveLabel}
          </Text>
        )}
      </Pressable>
      <Pressable
        disabled={saving}
        onPress={onCancel}
        className="rounded-full border border-gray-300 px-4 py-2.5 active:opacity-60 dark:border-gray-600"
      >
        <Text className="text-center text-sm font-semibold text-gray-600 dark:text-gray-300">
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}

// ---- Income & allocations --------------------------------------------------

type BucketKey = "debtTargetPercent" | "savingsTargetPercent" | "funMoneyPercent";
const BUCKETS: { key: BucketKey; label: string; color: string }[] = [
  { key: "debtTargetPercent", label: "🗡️ Debt", color: "text-debt" },
  { key: "savingsTargetPercent", label: "🌱 Savings", color: "text-savings" },
  { key: "funMoneyPercent", label: "🎉 Fun money", color: "text-fun" },
];

function IncomeAllocationsCard() {
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setAllocations = useAuthStore((s) => s.setAllocations);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [income, setIncome] = useState("");
  const [values, setValues] = useState<Record<BucketKey, string>>({
    debtTargetPercent: "0",
    savingsTargetPercent: "0",
    funMoneyPercent: "0",
  });

  const parsed = useMemo<Allocations>(
    () => ({
      debtTargetPercent: clampPercent(Number(values.debtTargetPercent)),
      savingsTargetPercent: clampPercent(Number(values.savingsTargetPercent)),
      funMoneyPercent: clampPercent(Number(values.funMoneyPercent)),
    }),
    [values]
  );
  const total =
    parsed.debtTargetPercent + parsed.savingsTargetPercent + parsed.funMoneyPercent;
  const valid = isValidAllocations(parsed);
  const incomeValue = Number(income);
  const incomeValid = income.trim() !== "" && incomeValue >= 0;

  if (!profile) return null;

  const startEdit = () => {
    setIncome(String(profile.monthlyIncome || ""));
    setValues({
      debtTargetPercent: String(profile.allocations.debtTargetPercent ?? 0),
      savingsTargetPercent: String(profile.allocations.savingsTargetPercent ?? 0),
      funMoneyPercent: String(profile.allocations.funMoneyPercent ?? 0),
    });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!incomeValid) return setError("Enter an income of 0 or more.");
    if (!valid)
      return setError(
        `Percentages must add up to ${ALLOCATION_TOTAL}% (currently ${total}%).`
      );
    setError(null);
    setSaving(true);
    try {
      // Persist income first, then allocations (which validates the split).
      await updateProfile({ monthlyIncome: incomeValue });
      await setAllocations(parsed);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-headline text-xl font-bold text-on-surface dark:text-white">
          Income &amp; Plan
        </Text>
        {!editing && (
          <Pressable
            onPress={startEdit}
            className="rounded-full p-2 active:bg-surface-container"
          >
            <MaterialIcons name="edit" size={18} color="#40493d" />
          </Pressable>
        )}
      </View>

      {!editing ? (
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              Monthly income
            </Text>
            <Text className="font-display text-2xl font-bold text-primary">
              {currency(profile.monthlyIncome)}
            </Text>
          </View>
          <View className="gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
            {BUCKETS.map(({ key, label, color }) => (
              <View key={key} className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-700 dark:text-gray-300">
                  {label}
                </Text>
                <Text className={`text-sm font-semibold ${color}`}>
                  {profile.allocations[key]}% ·{" "}
                  {currency(allocationAmount(profile.monthlyIncome, profile.allocations[key]))}/mo
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View className="gap-3">
          <LabeledField label="Monthly income">
            <TextInput
              value={income}
              onChangeText={setIncome}
              keyboardType="decimal-pad"
              placeholder="e.g. 4500"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
          {BUCKETS.map(({ key, label, color }) => (
            <LabeledField key={key} label={label}>
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={values[key]}
                  onChangeText={(t) =>
                    setValues((v) => ({ ...v, [key]: t.replace(/[^0-9]/g, "") }))
                  }
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  className={`flex-1 ${INPUT}`}
                />
                <Text className={`w-28 text-right text-xs font-semibold ${color}`}>
                  {currency(allocationAmount(incomeValid ? incomeValue : 0, parsed[key]))}/mo
                </Text>
              </View>
            </LabeledField>
          ))}
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-500 dark:text-gray-400">Total</Text>
            <Text
              className={`text-xs font-bold ${valid ? "text-savings" : "text-debt"}`}
            >
              {total}% {valid ? "✓" : `(needs ${ALLOCATION_TOTAL}%)`}
            </Text>
          </View>
          {error && <Text className="text-sm text-debt">{error}</Text>}
          <SaveCancel
            onSave={() => void save()}
            onCancel={() => setEditing(false)}
            saving={saving}
            disabled={!valid || !incomeValid}
          />
        </View>
      )}
    </Card>
  );
}

// ---- Debts -----------------------------------------------------------------

type DebtDraft = {
  name: string;
  totalBalance: string;
  apr: string;
  minimumPayment: string;
  currentProgress: string;
  isRequired: boolean;
};

const debtDraftFrom = (d: Debt): DebtDraft => ({
  name: d.name,
  totalBalance: String(d.totalBalance),
  apr: String(d.aprPercent ?? d.interestRate),
  minimumPayment: String(d.minimumPayment),
  currentProgress: String(d.currentProgress),
  isRequired: d.isRequired ?? false,
});

const emptyDebtDraft: DebtDraft = {
  name: "",
  totalBalance: "",
  apr: "",
  minimumPayment: "",
  currentProgress: "0",
  isRequired: false,
};

function DebtForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  error,
  saveLabel,
}: {
  draft: DebtDraft;
  setDraft: (d: DebtDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  saveLabel: string;
}) {
  return (
    <View className="gap-3">
      <LabeledField label="Name">
        <TextInput
          value={draft.name}
          onChangeText={(t) => setDraft({ ...draft, name: t })}
          placeholder="e.g. Visa"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </LabeledField>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <LabeledField label="Total balance">
            <TextInput
              value={draft.totalBalance}
              onChangeText={(t) => setDraft({ ...draft, totalBalance: t })}
              keyboardType="decimal-pad"
              placeholder="4000"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
        <View className="flex-1">
          <LabeledField label="APR %">
            <TextInput
              value={draft.apr}
              onChangeText={(t) => setDraft({ ...draft, apr: t })}
              keyboardType="decimal-pad"
              placeholder="22.99"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <LabeledField label="Minimum payment">
            <TextInput
              value={draft.minimumPayment}
              onChangeText={(t) => setDraft({ ...draft, minimumPayment: t })}
              keyboardType="decimal-pad"
              placeholder="120"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
        <View className="flex-1">
          <LabeledField label="Paid so far">
            <TextInput
              value={draft.currentProgress}
              onChangeText={(t) => setDraft({ ...draft, currentProgress: t })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
      </View>
      <Pressable
        onPress={() => setDraft({ ...draft, isRequired: !draft.isRequired })}
        className="flex-row items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600"
      >
        <Text className="flex-1 pr-2 text-sm text-gray-900 dark:text-white">
          Required payment (mortgage, car loan)
        </Text>
        <View
          className={`h-6 w-11 rounded-full ${
            draft.isRequired ? "bg-brand" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <View
            className={`m-0.5 h-5 w-5 rounded-full bg-white ${draft.isRequired ? "ml-5" : ""}`}
          />
        </View>
      </Pressable>
      {error && <Text className="text-sm text-debt">{error}</Text>}
      <SaveCancel
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
        saveLabel={saveLabel}
      />
    </View>
  );
}

/** Validate + build a debt patch from a draft. Returns an error string or the patch. */
function debtPatchFromDraft(
  draft: DebtDraft
): { error: string } | Partial<Omit<Debt, "id" | "userId">> {
  if (draft.name.trim() === "") return { error: "Give the debt a name." };
  const totalBalance = num(draft.totalBalance);
  const rate = num(draft.apr);
  const minimumPayment = num(draft.minimumPayment);
  const currentProgress = num(draft.currentProgress);
  if (!(totalBalance > 0)) return { error: "Enter a balance greater than 0." };
  if (!(rate >= 0)) return { error: "Enter a valid APR." };
  if (!(minimumPayment >= 0)) return { error: "Enter a valid minimum payment." };
  if (!(currentProgress >= 0)) return { error: "Enter a valid paid-so-far amount." };
  return {
    name: draft.name.trim(),
    totalBalance,
    interestRate: rate,
    aprPercent: rate,
    minimumPayment,
    currentProgress: Math.min(currentProgress, totalBalance),
    isRequired: draft.isRequired,
  };
}

function DebtRow({ debt }: { debt: Debt }) {
  const updateDebt = useFinanceStore((s) => s.updateDebt);
  const removeDebt = useFinanceStore((s) => s.removeDebt);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DebtDraft>(() => debtDraftFrom(debt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = remainingBalance(debt);
  const r = ratio(debt.currentProgress, debt.totalBalance);

  const save = async () => {
    const result = debtPatchFromDraft(draft);
    if ("error" in result) return setError(result.error);
    setError(null);
    setBusy(true);
    try {
      await updateDebt(debt.id, result);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await removeDebt(debt.id);
    } catch {
      setBusy(false);
    }
  };

  return (
    <Card>
      {editing ? (
        <DebtForm
          draft={draft}
          setDraft={setDraft}
          onSave={() => void save()}
          onCancel={() => setEditing(false)}
          saving={busy}
          error={error}
          saveLabel="Save changes"
        />
      ) : (
        <View className="gap-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {debt.name}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {currency(remaining)} left · {debt.aprPercent ?? debt.interestRate}% APR ·
                min {currency(debt.minimumPayment)}
                {debt.isRequired ? " · required" : ""}
              </Text>
            </View>
            <RowActions
              onEdit={() => {
                setDraft(debtDraftFrom(debt));
                setError(null);
                setEditing(true);
              }}
              onDelete={() => void del()}
              busy={busy}
            />
          </View>
          <ProgressBar value={r} color="bg-debt" />
        </View>
      )}
    </Card>
  );
}

// ---- Savings ---------------------------------------------------------------

type SavingsDraft = {
  title: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string; // YYYY-MM-DD
};

const isoToDateInput = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

const savingsDraftFrom = (g: SavingsGoal): SavingsDraft => ({
  title: g.title,
  targetAmount: String(g.targetAmount),
  currentAmount: String(g.currentAmount),
  targetDate: isoToDateInput(g.targetDate),
});

const emptySavingsDraft: SavingsDraft = {
  title: "",
  targetAmount: "",
  currentAmount: "0",
  targetDate: "",
};

function SavingsForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  error,
  saveLabel,
}: {
  draft: SavingsDraft;
  setDraft: (d: SavingsDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  saveLabel: string;
}) {
  return (
    <View className="gap-3">
      <LabeledField label="Title">
        <TextInput
          value={draft.title}
          onChangeText={(t) => setDraft({ ...draft, title: t })}
          placeholder="e.g. Emergency fund"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </LabeledField>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <LabeledField label="Target amount">
            <TextInput
              value={draft.targetAmount}
              onChangeText={(t) => setDraft({ ...draft, targetAmount: t })}
              keyboardType="decimal-pad"
              placeholder="5000"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
        <View className="flex-1">
          <LabeledField label="Saved so far">
            <TextInput
              value={draft.currentAmount}
              onChangeText={(t) => setDraft({ ...draft, currentAmount: t })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
      </View>
      <LabeledField label="Target date (YYYY-MM-DD)">
        <TextInput
          value={draft.targetDate}
          onChangeText={(t) => setDraft({ ...draft, targetDate: t })}
          placeholder="2026-12-31"
          placeholderTextColor="#9CA3AF"
          className={INPUT}
        />
      </LabeledField>
      {error && <Text className="text-sm text-debt">{error}</Text>}
      <SaveCancel
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
        saveLabel={saveLabel}
      />
    </View>
  );
}

function savingsPatchFromDraft(
  draft: SavingsDraft
): { error: string } | Partial<Omit<SavingsGoal, "id" | "userId">> {
  if (draft.title.trim() === "") return { error: "Give the goal a title." };
  const targetAmount = num(draft.targetAmount);
  const currentAmount = num(draft.currentAmount);
  if (!(targetAmount > 0)) return { error: "Enter a target greater than 0." };
  if (!(currentAmount >= 0)) return { error: "Enter a valid saved amount." };
  const d = new Date(draft.targetDate);
  if (draft.targetDate.trim() === "" || Number.isNaN(d.getTime()))
    return { error: "Enter a valid target date (YYYY-MM-DD)." };
  return {
    title: draft.title.trim(),
    targetAmount,
    currentAmount,
    targetDate: d.toISOString(),
  };
}

function SavingsRow({ goal }: { goal: SavingsGoal }) {
  const updateSavingsGoal = useFinanceStore((s) => s.updateSavingsGoal);
  const removeSavingsGoal = useFinanceStore((s) => s.removeSavingsGoal);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SavingsDraft>(() => savingsDraftFrom(goal));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const r = ratio(goal.currentAmount, goal.targetAmount);

  const save = async () => {
    const result = savingsPatchFromDraft(draft);
    if ("error" in result) return setError(result.error);
    setError(null);
    setBusy(true);
    try {
      await updateSavingsGoal(goal.id, result);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await removeSavingsGoal(goal.id);
    } catch {
      setBusy(false);
    }
  };

  return (
    <Card>
      {editing ? (
        <SavingsForm
          draft={draft}
          setDraft={setDraft}
          onSave={() => void save()}
          onCancel={() => setEditing(false)}
          saving={busy}
          error={error}
          saveLabel="Save changes"
        />
      ) : (
        <View className="gap-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {goal.title}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {currency(goal.currentAmount)} of {currency(goal.targetAmount)} · by{" "}
                {shortDate(goal.targetDate)}
              </Text>
            </View>
            <RowActions
              onEdit={() => {
                setDraft(savingsDraftFrom(goal));
                setError(null);
                setEditing(true);
              }}
              onDelete={() => void del()}
              busy={busy}
            />
          </View>
          <ProgressBar value={r} color="bg-savings" />
        </View>
      )}
    </Card>
  );
}

// ---- Fixed expenses --------------------------------------------------------

type ExpenseDraft = { name: string; amount: string };
const expenseDraftFrom = (e: FixedExpense): ExpenseDraft => ({
  name: e.name,
  amount: String(e.amount),
});
const emptyExpenseDraft: ExpenseDraft = { name: "", amount: "" };

function ExpenseForm({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  error,
  saveLabel,
}: {
  draft: ExpenseDraft;
  setDraft: (d: ExpenseDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  saveLabel: string;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        <View className="flex-1">
          <LabeledField label="Name">
            <TextInput
              value={draft.name}
              onChangeText={(t) => setDraft({ ...draft, name: t })}
              placeholder="e.g. Rent"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
        <View className="w-32">
          <LabeledField label="Monthly">
            <TextInput
              value={draft.amount}
              onChangeText={(t) => setDraft({ ...draft, amount: t })}
              keyboardType="decimal-pad"
              placeholder="1200"
              placeholderTextColor="#9CA3AF"
              className={INPUT}
            />
          </LabeledField>
        </View>
      </View>
      {error && <Text className="text-sm text-debt">{error}</Text>}
      <SaveCancel
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
        saveLabel={saveLabel}
      />
    </View>
  );
}

function expensePatchFromDraft(
  draft: ExpenseDraft
): { error: string } | Partial<Omit<FixedExpense, "id" | "userId">> {
  if (draft.name.trim() === "") return { error: "Give the expense a name." };
  const amount = num(draft.amount);
  if (!(amount > 0)) return { error: "Enter an amount greater than 0." };
  return { name: draft.name.trim(), amount };
}

function ExpenseRow({ expense }: { expense: FixedExpense }) {
  const updateFixedExpense = useFinanceStore((s) => s.updateFixedExpense);
  const removeFixedExpense = useFinanceStore((s) => s.removeFixedExpense);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ExpenseDraft>(() => expenseDraftFrom(expense));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const result = expensePatchFromDraft(draft);
    if ("error" in result) return setError(result.error);
    setError(null);
    setBusy(true);
    try {
      await updateFixedExpense(expense.id, result);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await removeFixedExpense(expense.id);
    } catch {
      setBusy(false);
    }
  };

  return (
    <Card>
      {editing ? (
        <ExpenseForm
          draft={draft}
          setDraft={setDraft}
          onSave={() => void save()}
          onCancel={() => setEditing(false)}
          saving={busy}
          error={error}
          saveLabel="Save changes"
        />
      ) : (
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {expense.name}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {currency(expense.amount)}/mo
            </Text>
          </View>
          <RowActions
            onEdit={() => {
              setDraft(expenseDraftFrom(expense));
              setError(null);
              setEditing(true);
            }}
            onDelete={() => void del()}
            busy={busy}
          />
        </View>
      )}
    </Card>
  );
}

// ---- Screen ----------------------------------------------------------------

export default function Finance() {
  const profile = useAuthStore((s) => s.profile);
  const debts = useFinanceStore((s) => s.debts);
  const savingsGoals = useFinanceStore((s) => s.savingsGoals);
  const fixedExpenses = useFinanceStore((s) => s.fixedExpenses);
  const addDebt = useFinanceStore((s) => s.addDebt);
  const addSavingsGoal = useFinanceStore((s) => s.addSavingsGoal);
  const addFixedExpense = useFinanceStore((s) => s.addFixedExpense);

  // Add-form drafts (null = closed).
  const [debtDraft, setDebtDraft] = useState<DebtDraft | null>(null);
  const [savingsDraft, setSavingsDraft] = useState<SavingsDraft | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [addBusy, setAddBusy] = useState<null | "debt" | "savings" | "expense">(null);
  const [addError, setAddError] = useState<string | null>(null);

  if (!profile) return null;

  const addNewDebt = async () => {
    if (!debtDraft) return;
    const result = debtPatchFromDraft(debtDraft);
    if ("error" in result) return setAddError(result.error);
    setAddError(null);
    setAddBusy("debt");
    try {
      await addDebt({ userId: profile.uid, ...(result as Omit<Debt, "id" | "userId">) });
      setDebtDraft(null);
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAddBusy(null);
    }
  };

  const addNewSavings = async () => {
    if (!savingsDraft) return;
    const result = savingsPatchFromDraft(savingsDraft);
    if ("error" in result) return setAddError(result.error);
    setAddError(null);
    setAddBusy("savings");
    try {
      await addSavingsGoal({
        userId: profile.uid,
        ...(result as Omit<SavingsGoal, "id" | "userId">),
      });
      setSavingsDraft(null);
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAddBusy(null);
    }
  };

  const addNewExpense = async () => {
    if (!expenseDraft) return;
    const result = expensePatchFromDraft(expenseDraft);
    if ("error" in result) return setAddError(result.error);
    setAddError(null);
    setAddBusy("expense");
    try {
      await addFixedExpense({
        userId: profile.uid,
        ...(result as Omit<FixedExpense, "id" | "userId">),
      });
      setExpenseDraft(null);
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAddBusy(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface dark:bg-gray-900">
      <View className="mx-auto w-full max-w-3xl gap-6 p-4 pb-10">
        {/* Income & plan */}
        <IncomeAllocationsCard />

        {/* Debts */}
        <View>
          <SectionHeader
            title="Debts"
            addLabel="Add debt"
            onAdd={() =>
              setDebtDraft((d) => (d ? null : { ...emptyDebtDraft }))
            }
          />
          <View className="gap-3">
            {debtDraft && (
              <Card>
                <DebtForm
                  draft={debtDraft}
                  setDraft={setDebtDraft}
                  onSave={() => void addNewDebt()}
                  onCancel={() => setDebtDraft(null)}
                  saving={addBusy === "debt"}
                  error={addError}
                  saveLabel="Add debt"
                />
              </Card>
            )}
            {debts.length === 0 && !debtDraft && (
              <Text className="px-1 text-sm text-gray-400">No debts yet.</Text>
            )}
            {debts.map((d) => (
              <DebtRow key={d.id} debt={d} />
            ))}
          </View>
          {debts.length > 0 && (
            <Link href="/(tabs)/debts/plan" asChild>
              <Pressable className="mt-3 flex-row items-center justify-center gap-1 rounded-full border border-primary px-4 py-2.5 active:opacity-70">
                <MaterialIcons name="insights" size={18} color="#0d631b" />
                <Text className="text-sm font-semibold text-primary">
                  View payoff plan
                </Text>
              </Pressable>
            </Link>
          )}
        </View>

        {/* Savings */}
        <View>
          <SectionHeader
            title="Savings goals"
            addLabel="Add goal"
            onAdd={() =>
              setSavingsDraft((d) => (d ? null : { ...emptySavingsDraft }))
            }
          />
          <View className="gap-3">
            {savingsDraft && (
              <Card>
                <SavingsForm
                  draft={savingsDraft}
                  setDraft={setSavingsDraft}
                  onSave={() => void addNewSavings()}
                  onCancel={() => setSavingsDraft(null)}
                  saving={addBusy === "savings"}
                  error={addError}
                  saveLabel="Add goal"
                />
              </Card>
            )}
            {savingsGoals.length === 0 && !savingsDraft && (
              <Text className="px-1 text-sm text-gray-400">
                No savings goals yet.
              </Text>
            )}
            {savingsGoals.map((g) => (
              <SavingsRow key={g.id} goal={g} />
            ))}
          </View>
        </View>

        {/* Fixed expenses */}
        <View>
          <SectionHeader
            title="Fixed expenses"
            addLabel="Add expense"
            onAdd={() =>
              setExpenseDraft((d) => (d ? null : { ...emptyExpenseDraft }))
            }
          />
          <View className="gap-3">
            {expenseDraft && (
              <Card>
                <ExpenseForm
                  draft={expenseDraft}
                  setDraft={setExpenseDraft}
                  onSave={() => void addNewExpense()}
                  onCancel={() => setExpenseDraft(null)}
                  saving={addBusy === "expense"}
                  error={addError}
                  saveLabel="Add expense"
                />
              </Card>
            )}
            {fixedExpenses.length === 0 && !expenseDraft && (
              <Text className="px-1 text-sm text-gray-400">
                No fixed expenses yet.
              </Text>
            )}
            {fixedExpenses.map((e) => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
