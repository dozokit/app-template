import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "./auth-client";
import { Button, Card, Empty, ErrorMessage, Field, Hint, LinkButton, Loading, Note, Page, Row, Table } from "./ui";

const APP = "My app";
type Item = { id: number; text: string; created_at: string };

export function App() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <Loading />;
  return session ? <Items email={session.user.email} /> : <SignIn />;
}

// Sign in with a 6-digit code sent by email (the account is made the first time), or with Google.
function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [google, setGoogle] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const local = /^(localhost|127\.0\.0\.1|.*\.localhost)$/.test(location.hostname);

  useEffect(() => {
    fetch("/api/login-options").then((r) => r.json() as Promise<{ google: boolean }>).then((o) => setGoogle(o.google));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = sent
      ? await authClient.signIn.emailOtp({ email, otp: code.trim() })
      : await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setBusy(false);
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
          <ErrorMessage>{error}</ErrorMessage>
          <Button busy={busy}>{sent ? "Sign in" : "Email me a code"}</Button>
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
