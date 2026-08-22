import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import { axiosClient } from "../lib/api";
import { useDialog } from "../context/DialogContext";

// ─── MOVE THE INPUT COMPONENT OUTSIDE THE PARENT ───────────────────────
const Input = ({ label, k, type = "text", ph, values, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs tracking-widest uppercase font-semibold text-zinc-500">{label}</label>
    <input
      type={type}
      value={values[k] || ""}
      onChange={e => onChange(k, e.target.value)}
      placeholder={ph}
      className="bg-zinc-800 border border-white/5 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500 transition-colors placeholder:text-zinc-600 w-full box-border"
    />
  </div>
);

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alert: showAlert, prompt } = useDialog();

  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("LISTENER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [values, setValues] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
    bio: "",
    location: "",
    isMadrassa: false
  });

  const { login, register } = useAuth();
  const handleInputChange = (key, value) => setValues(prev => ({ ...prev, [key]: value }));

  const fromPath = location.state?.from?.pathname || sessionStorage.getItem("noor_return_to") || "/";

  const submit = async (e) => {
    // PREVENT PAGE REFRESH
    if (e) e.preventDefault();

    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(values.email, values.password);
      } else {
        await register({ ...values, role });
      }

      navigate(fromPath, { replace: true });
      sessionStorage.removeItem("noor_return_to");
    } catch (e) {
      // Extract error message from Axios response if available, or fallback
      const errMsg = e.response?.data?.error || e.response?.data?.message || e.message || "An error occurred";
      setError(errMsg);
    } finally {
      setBusy(false);
    }
  };

  const recoverPassword = async () => {
    const email = await prompt("We’ll prepare password recovery for this account.", {
      title: "Recover password",
      label: "Account email",
      inputType: "email",
      placeholder: "you@example.com",
      confirmLabel: "Continue",
    });
    if (!email?.trim()) return;
    try {
      const response = await axiosClient.post("/auth/forgot-password", { email: email.trim() });
      if (!response.resetToken) {
        await showAlert(response.message, { title: "Recovery requested" });
        return;
      }
      const newPassword = await prompt("A local reset token was created. Enter a new password with at least 8 characters.", {
        title: "Reset password",
        label: "New password",
        inputType: "password",
        confirmLabel: "Reset password",
        validate: (value) => value.length >= 8,
      });
      if (!newPassword) return;
      await axiosClient.post("/auth/reset-password", { token: response.resetToken, newPassword });
      await showAlert("Your password was reset. You can now sign in.", { title: "Password reset" });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <p className="text-emerald-400 text-3xl font-semibold tracking-wide mb-1" style={{ fontFamily: "'Cinzel',serif" }}>نـور · Noor</p>
          <p className="text-xs tracking-widest text-zinc-600 uppercase">Islamic Audio</p>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-8">

          {/* Toggle Tab Row */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5 mb-6">
            {[["login", "Sign in"], ["register", "Create account"]].map(([m, l]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer border-0 ${
                  mode === m ? "bg-zinc-700 text-zinc-100" : "bg-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Form wrapper with onSubmit handling */}
          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === "register" && (
              <>
                {/* Role Tier Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs tracking-widest uppercase font-semibold text-zinc-500">I am a</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["LISTENER", "Listener", "ti-headphones"],
                      ["ARTIST", "Artist / Madrassa", "ti-microphone"]
                    ].map(([r, l, ic]) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                          role === r
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-white/5 bg-zinc-800 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <i className={`ti ${ic} text-base`} />
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <Input label="Display name" k="displayName" ph="How you'll appear on Noor" values={values} onChange={handleInputChange} />
                <Input label="Username" k="username" ph="lowercase_only" values={values} onChange={handleInputChange} />

                {role === "ARTIST" && (
                  <>
                    <Input label="Bio (optional)" k="bio" ph="Tell listeners about yourself" values={values} onChange={handleInputChange} />
                    <Input label="Location (optional)" k="location" ph="e.g. Dar es Salaam" values={values} onChange={handleInputChange} />
                    <label className="flex items-center gap-3 cursor-pointer mt-1 select-none">
                      <input
                        type="checkbox"
                        checked={values.isMadrassa}
                        onChange={e => handleInputChange("isMadrassa", e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer bg-zinc-800 border-white/5"
                      />
                      <span className="text-sm text-zinc-300">This is a Madrassa account</span>
                    </label>
                  </>
                )}
              </>
            )}

            {/* Shared Identity Fields */}
            <Input
              label={mode === "login" ? "Username or Email" : "Email address"}
              k="email"
              type={mode === "login" ? "text" : "email"}
              ph={mode === "login" ? "you@example.com or user123" : "you@example.com"}
              values={values}
              onChange={handleInputChange}
            />

            <Input label="Password" k="password" type="password" ph="••••••••" values={values} onChange={handleInputChange} />
            {mode === "login" && (
              <button type="button" onClick={recoverPassword} className="self-end bg-transparent border-0 text-xs text-emerald-400 cursor-pointer">
                Forgot password?
              </button>
            )}

            {/* Error Message Anchor Banner */}
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 my-1">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white text-sm font-semibold py-3 rounded-lg border-0 cursor-pointer transition-colors mt-2"
            >
              {busy ? <Spinner /> : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
