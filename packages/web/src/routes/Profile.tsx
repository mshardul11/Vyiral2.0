import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../state/auth";

export function Profile() {
  const { user, loading, update, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [status, setStatus] = useState("");
  useEffect(() => { if (user) { setName(user.name); setTitle(user.title); } }, [user]);
  if (loading) return <div className="loading-screen">Loading your profile…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  async function save(event: FormEvent) { event.preventDefault(); setStatus("Saving…"); try { await update(name, title); setStatus("Profile saved."); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not save."); } }
  return <div className="profile-page"><nav className="nav wrap"><Link className="wordmark" to="/"><span>V</span> VYIRAL</Link><Link className="nav__cta" to="/app">Back to studio →</Link></nav><main className="profile-card"><span className="kicker">YOUR VYIRAL PROFILE</span><div className="profile-card__avatar">{user.name[0]?.toUpperCase()}</div><h1>{user.name}</h1><p>{user.email}</p><form onSubmit={save}><label>DISPLAY NAME<input value={name} onChange={e => setName(e.target.value)} minLength={2} required/></label><label>PROFESSIONAL TITLE<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Product design leader" maxLength={100}/></label><button type="submit">SAVE PROFILE →</button><span className="profile-status" role="status">{status}</span></form><div className="profile-meta"><span>MEMBER SINCE</span><b>{new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b></div><button className="profile-logout" onClick={() => void logout()}>Sign out</button></main></div>;
}
