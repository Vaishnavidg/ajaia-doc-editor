export type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveStatus({ state }: { state: SaveState }) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "All changes saved"
        : state === "error"
          ? "Failed to save"
          : "";

  return (
    <span
      className={
        "text-xs " + (state === "error" ? "text-red-600" : "text-gray-500")
      }
      aria-live="polite"
    >
      {label}
    </span>
  );
}
