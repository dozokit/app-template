import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "./auth-client";
import { Button, Card, Empty, ErrorMessage, Field, Hint, HumanCheck, LinkButton, Loading, Note, Page, Row, Table } from "./ui";

const APP = "My app";
type Item = { id: number; text: string; created_at: string };

export function App() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <Loading />;
  if (!session) return <SignIn />;
  return location.pathname === "/account" ? <Account email={session.user.email} /> : <Items email={session.user.email} />;
}

// Sign in with a 6-digit code sent by email (the account is made the first time), or with Google.
function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [google, setGoogle] = useState(false);
  const [turnstile, setTurnstile] = useState<string | null>(null);
  const [human, setHuman] = useState("");
  const [tries, setTries] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const local = /^(localhost|127\.0\.0\.1|.*\.localhost)$/.test(location.hostname);

  useEffect(() => {
    fetch("/api/login-options").then((r) => r.json() as Promise<{ google: boolean; turnstile: string | null }>).then((o) => (setGoogle(o.google), setTurnstile(o.turnstile)));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = sent
      ? await authClient.signIn.emailOtp({ email, otp: code.trim() })
      : await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in", fetchOptions: { headers: { "x-turnstile-token": human } } });
    setBusy(false);
    setTries((n) => n + 1);
    if (error) return setError(error.message ?? "Something went wrong");
    if (!sent) setSent(true);
  }

  return (
    <Page app={APP}>
      <h1>Sign in</h1>
      <Card>
        {google && (
          <>
            <Button type="button" variant="quiet" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}>
              Continue with Google
            </Button>
            <Hint>or with your email:</Hint>
          </>
        )}
        <form onSubmit={submit}>
          <Field label="Email" type="email" name="email" autoComplete="email" value={email} readOnly={sent}
            onChange={(e) => setEmail(e.target.value)} required />
          {sent && (
            <>
              <Note>
                We sent a 6-digit code to {email}. It works for 5 minutes.
                {local && " Running locally, it's in the terminal running the app, or, with Dozokit Apps, on this app's page in the builder."}
              </Note>
              <Field label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6}
                value={code} onChange={(e) => setCode(e.target.value)} required autoFocus />
            </>
          )}
          {turnstile && !sent && <HumanCheck siteKey={turnstile} onToken={setHuman} reset={tries} />}
          <ErrorMessage>{error}</ErrorMessage>
          <Button busy={busy} disabled={Boolean(turnstile && !sent && !human)}>{sent ? "Sign in" : "Email me a code"}</Button>
        </form>
      </Card>
      {sent && (
        <Row>
          <LinkButton onClick={() => (setSent(false), setCode(""))}>Use another email</LinkButton>
        </Row>
      )}
    </Page>
  );
}

function Items({ email }: { email: string }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [more, setMore] = useState(false);
  const page = (before?: number) =>
    fetch(`/api/items${before ? `?before=${before}` : ""}`).then((r) => r.json() as Promise<Item[]>).then((next) => {
      setItems((items) => [...(before ? (items ?? []) : []), ...next]);
      setMore(next.length === 50);
    });
  useEffect(() => void page(), []);

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
      {more && items && (
        <Button variant="quiet" onClick={() => page(items[items.length - 1].id)}>
          Show more
        </Button>
      )}
    </Page>
  );
}

// The user's own account: their data as a file, and deleting the account.
function Account({ email }: { email: string }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function remove(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/account/delete", { method: "POST", body: JSON.stringify({ email: typed }) });
    setBusy(false);
    if (!res.ok) return setError(((await res.json()) as { error: string }).error);
    await authClient.signOut();
    location.href = "/";
  }
  return (
    <Page app={APP} user={email} onLogout={() => authClient.signOut()}>
      <h1>Your account</h1>
      <Card>
        <h2>Your data</h2>
        <Hint>Everything you've saved here, as a file.</Hint>
        <a href="/api/account/export" download>
          Download my data
        </a>
      </Card>
      <Card>
        <h2>Delete my account</h2>
        <Hint>This removes your account and everything you've saved here, for good.</Hint>
        <form onSubmit={remove}>
          <Field label={`Type ${email} to confirm`} name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} required />
          <ErrorMessage>{error}</ErrorMessage>
          <Button variant="danger" busy={busy} disabled={typed.trim().toLowerCase() !== email.toLowerCase()}>
            Delete my account
          </Button>
        </form>
      </Card>
      <a href="/">Back</a>
    </Page>
  );
}
