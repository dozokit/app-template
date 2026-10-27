import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "./auth-client";
import { Button, Card, Empty, ErrorMessage, Field, LinkButton, Loading, Note, Page, Row, Table } from "./ui";

const APP = "My app";
type Item = { id: number; text: string; created_at: string };

export function App() {
  const { data: session, isPending } = authClient.useSession();
  if (location.pathname === "/reset-password") return <ResetPassword />;
  if (isPending) return <Loading />;
  return session ? <Items email={session.user.email} confirmed={session.user.emailVerified} /> : <AuthForm />;
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
    <Page app={APP}>
      <h1>{mode === "signup" ? "Create an account" : mode === "login" ? "Log in" : "Reset your password"}</h1>
      <Card>
        <form onSubmit={submit}>
          <Field label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {mode !== "forgot" && (
            <Field label="Password" type="password" name="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="8 characters or more" value={password} minLength={8} onChange={(e) => setPassword(e.target.value)} required />
          )}
          <ErrorMessage>{error}</ErrorMessage>
          {notice && <Note>{notice}</Note>}
          <Button busy={busy}>{mode === "signup" ? "Sign up" : mode === "login" ? "Log in" : "Send reset link"}</Button>
        </form>
      </Card>
      <Row>
        {mode !== "login" && <LinkButton onClick={() => setMode("login")}>Log in</LinkButton>}
        {mode !== "signup" && <LinkButton onClick={() => setMode("signup")}>Create an account</LinkButton>}
        {mode !== "forgot" && <LinkButton onClick={() => setMode("forgot")}>Forgot password?</LinkButton>}
      </Row>
    </Page>
  );
}

function ResetPassword() {
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (error) return setError(error.message ?? "This link no longer works");
    setDone(true);
  }

  return (
    <Page app={APP}>
      <h1>Choose a new password</h1>
      {done ? (
        <Note>
          Password changed. <a href="/">Log in</a>
        </Note>
      ) : (
        <Card>
          <form onSubmit={submit}>
            <Field label="New password" type="password" name="password" autoComplete="new-password" placeholder="8 characters or more"
              value={password} minLength={8} onChange={(e) => setPassword(e.target.value)} required />
            <ErrorMessage>{error}</ErrorMessage>
            <Button busy={busy}>Save password</Button>
          </form>
        </Card>
      )}
    </Page>
  );
}

function Items({ email, confirmed }: { email: string; confirmed: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/items").then((r) => r.json() as Promise<Item[]>).then(setItems);
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/items", { method: "POST", body: JSON.stringify({ text }) });
    const body = (await res.json()) as Item & { error: string };
    setBusy(false);
    if (!res.ok) return setError(body.error);
    setItems([body, ...(items ?? [])]);
    setText("");
    setError("");
  }

  return (
    <Page app={APP} user={email} onLogout={() => authClient.signOut()}>
      {!confirmed && (
        <Note>
          Check your email to confirm your address.
          {/^(localhost|127\.0\.0\.1|.*\.localhost)$/.test(location.hostname) && " Running locally, the link is in the terminal running the app, or, with Dozokit Apps, on this app's page in the builder."}
        </Note>
      )}
      <h1>My items</h1>
      <form onSubmit={add}>
        <Row>
          <Field label="New item" name="text" value={text} onChange={(e) => setText(e.target.value)} error={error || undefined} />
          <Button busy={busy}>Add</Button>
        </Row>
      </form>
      {items === null ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty>No items yet. Add your first one above.</Empty>
      ) : (
        <Table columns={["Item", "Added"]} rows={items.map((i) => ({ key: i.id, cells: [i.text, new Date(`${i.created_at}Z`).toLocaleDateString()] }))} />
      )}
    </Page>
  );
}
