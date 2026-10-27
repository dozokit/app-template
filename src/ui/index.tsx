import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import "./ui.css";

// The app's building blocks. Every screen is made of these; a missing one is added here first.

export function Page({ app, user, onLogout, children }: { app: string; user?: string; onLogout?: () => void; children: ReactNode }) {
  return (
    <>
      <header className="ui-top">
        <span className="ui-top-name">{app}</span>
        {user && <span className="ui-top-user">{user}</span>}
        {onLogout && (
          <Button variant="quiet" onClick={onLogout}>
            Log out
          </Button>
        )}
      </header>
      <main className="ui-main">{children}</main>
    </>
  );
}

export const Card = ({ children }: { children: ReactNode }) => <section className="ui-card">{children}</section>;

// main: the one action of a screen; quiet: the others; danger: deletes or cancels something.
export function Button({ variant = "main", busy, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "main" | "quiet" | "danger"; busy?: boolean }) {
  return (
    <button {...props} className={`ui-button ui-button--${variant}`} disabled={props.disabled || busy} aria-busy={busy || undefined}>
      {busy ? "Working…" : children}
    </button>
  );
}

// A button that reads as a link, for small secondary moves ("Forgot password?").
export const LinkButton = (props: ButtonHTMLAttributes<HTMLButtonElement>) => <button type="button" {...props} className="ui-link" />;

export function Field({ label, error, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const id = input.id ?? input.name ?? label;
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...input} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} />
      {error && (
        <span id={`${id}-error`} className="ui-field-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function Table({ columns, rows }: { columns: string[]; rows: { key: string | number; cells: ReactNode[] }[] }) {
  return (
    <table className="ui-table">
      <thead>
        <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>{r.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="ui-empty">{children}</p>;
export const ErrorMessage = ({ children }: { children: ReactNode }) => (children ? <p className="ui-error" role="alert">{children}</p> : null);
export const Hint = ({ children }: { children: ReactNode }) => <p className="ui-muted">{children}</p>;
export const Note = ({ children }: { children: ReactNode }) => <p className="ui-note">{children}</p>;
export const Loading = () => <p className="ui-loading" aria-live="polite">Loading…</p>;
export const Row = ({ children }: { children: ReactNode }) => <div className="ui-row">{children}</div>;
