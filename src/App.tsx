import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "./auth-client";

type Item = { id: number; text: string; created_at: string };

export function App() {
  const { data: session, isPending } = authClient.useSession();
  if (location.pathname === "/reset-password") return <ResetPassword />;
  if (isPending) return <p className="muted">Loading…</p>;
  return session ? <Items email={session.user.email} /> : <AuthForm />;
}

function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: email.split("@")[0] })
        : mode === "login"
          ? await authClient.signIn.email({ email, password })
          : await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setBusy(false);
    if (error) return setError(error.message ?? "Something went wrong");
    if (mode === "forgot") setNotice("If this email has an account, a reset link is on its way.");
  }

  return (
    <main>
      <h1>{mode === "signup" ? "Create an account" : mode === "login" ? "Log in" : "Reset your password"}</h1>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {mode !== "forgot" && (
          <input type="password" placeholder="Password (8+ characters)" value={password} minLength={8}
            onChange={(e) => setPassword(e.target.value)} required />
        )}
        <button disabled={busy}>{mode === "signup" ? "Sign up" : mode === "login" ? "Log in" : "Send reset link"}</button>
        {error && <p className="error">{error}</p>}
        {notice && <p className="muted">{notice}</p>}
      </form>
      <p className="row">
        {mode !== "login" && <button className="link" onClick={() => setMode("login")}>Log in</button>}
        {mode !== "signup" && <button className="link" onClick={() => setMode("signup")}>Create an account</button>}
        {mode !== "forgot" && <button className="link" onClick={() => setMode("forgot")}>Forgot password?</button>}
      </p>
    </main>
  );
}

function ResetPassword() {
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    if (error) return setError(error.message ?? "This link no longer works");
    setDone(true);
  }

  if (done) return <p>Password changed. <a href="/">Log in</a></p>;
  return (
    <main>
      <h1>Choose a new password</h1>
      <form onSubmit={submit}>
        <input type="password" placeholder="New password (8+ characters)" value={password} minLength={8}
          onChange={(e) => setPassword(e.target.value)} required />
        <button>Save password</button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}

function Items({ email }: { email: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/items").then((r) => r.json() as Promise<Item[]>).then(setItems);
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/items", { method: "POST", body: JSON.stringify({ text }) });
    const body = (await res.json()) as Item & { error: string };
    if (!res.ok) return setError(body.error);
    setItems([body, ...items]);
    setText("");
    setError("");
  }

  return (
    <main>
      <p className="row">
        <span className="muted">Logged in as {email}</span>
        <button className="link" onClick={() => authClient.signOut()}>Log out</button>
      </p>
      <h1>My items</h1>
      <form className="row" onSubmit={add}>
        <input placeholder="New item" value={text} onChange={(e) => setText(e.target.value)} />
        <button>Add</button>
      </form>
      {error && <p className="error">{error}</p>}
      {items.length === 0 ? <p className="muted">No items yet.</p> : <ul>{items.map((i) => <li key={i.id}>{i.text}</li>)}</ul>}
    </main>
  );
}
