import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const DialogContext = createContext(null);

export const useDialog = () => {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialog must be used inside DialogProvider");
  return value;
};

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  const open = useCallback((options) => new Promise((resolve) => {
    setInputValue(options.initialValue ?? "");
    setDialog({ ...options, resolve });
  }), []);

  const close = useCallback((value) => {
    setDialog((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const alert = useCallback((message, options = {}) => open({
    type: "alert",
    title: options.title || "Notice",
    message,
    confirmLabel: options.confirmLabel || "Okay",
  }), [open]);

  const confirm = useCallback((message, options = {}) => open({
    type: "confirm",
    title: options.title || "Please confirm",
    message,
    confirmLabel: options.confirmLabel || "Confirm",
    cancelLabel: options.cancelLabel || "Cancel",
    danger: options.danger,
  }), [open]);

  const prompt = useCallback((message, options = {}) => open({
    type: "prompt",
    title: options.title || "Enter details",
    message,
    label: options.label,
    initialValue: options.initialValue || "",
    inputType: options.inputType || "text",
    placeholder: options.placeholder || "",
    confirmLabel: options.confirmLabel || "Continue",
    cancelLabel: options.cancelLabel || "Cancel",
    validate: options.validate,
  }), [open]);

  const choose = useCallback((message, options = {}) => open({
    type: "choose",
    title: options.title || "Choose an option",
    message,
    options: options.options || [],
    cancelLabel: options.cancelLabel || "Cancel",
  }), [open]);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") close(dialog.type === "confirm" ? false : null);
    };
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, close]);

  const submit = (event) => {
    event.preventDefault();
    if (dialog.type === "prompt") {
      if (dialog.validate && !dialog.validate(inputValue)) return;
      close(inputValue);
      return;
    }
    close(dialog.type === "confirm" ? true : undefined);
  };

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt, choose }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && dialog.type !== "alert") close(dialog.type === "confirm" ? false : null);
        }}>
          <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="noor-dialog-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/50">
            <div className="p-6">
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${dialog.danger ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                <i className={`ti ${dialog.danger ? "ti-alert-triangle" : dialog.type === "choose" ? "ti-playlist" : "ti-info-circle"} text-xl`} />
              </div>
              <h2 id="noor-dialog-title" className="text-lg font-bold text-white">{dialog.title}</h2>
              {dialog.message && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-400">{dialog.message}</p>}

              {dialog.type === "prompt" && (
                <label className="mt-5 block">
                  {dialog.label && <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">{dialog.label}</span>}
                  <input ref={inputRef} type={dialog.inputType} value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder={dialog.placeholder} className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500" />
                </label>
              )}

              {dialog.type === "choose" && (
                <div className="mt-5 max-h-64 space-y-2 overflow-y-auto">
                  {dialog.options.map((option) => (
                    <button key={option.value} type="button" onClick={() => close(option.value)} className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-zinc-950 px-4 py-3 text-left text-sm text-zinc-200 transition-colors hover:border-emerald-500/30 hover:bg-zinc-800">
                      <span className="truncate font-semibold">{option.label}</span>
                      {option.meta && <span className="ml-4 shrink-0 text-xs text-zinc-500">{option.meta}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/5 bg-zinc-950/50 px-6 py-4">
              {dialog.type !== "alert" && (
                <button type="button" onClick={() => close(dialog.type === "confirm" ? false : null)} className="rounded-xl border-0 bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-zinc-700">{dialog.cancelLabel}</button>
              )}
              {dialog.type !== "choose" && (
                <button type="submit" className={`rounded-xl border-0 px-4 py-2.5 text-xs font-bold text-white ${dialog.danger ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>{dialog.confirmLabel}</button>
              )}
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
}
