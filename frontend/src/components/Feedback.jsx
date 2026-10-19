export const ErrorMsg = ({ error }) => (error ? <div className="alert error" role="alert">{error}</div> : null);
export const Loading = () => <p className="muted">Loading…</p>;
export const Empty = ({ children }) => <div className="empty">{children}</div>;
