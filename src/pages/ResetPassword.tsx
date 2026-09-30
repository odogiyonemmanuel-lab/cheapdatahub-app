import { useState } from "react";
import { supabase } from "@/lib/supabase";
export default function ResetPassword() {
 const [password,setPassword]=useState(""); const [message,setMessage]=useState("");
 async function save(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const {error}=await supabase.auth.updateUser({password}); setMessage(error ? error.message : "Password updated. You can now sign in."); }
 return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4"><form onSubmit={save} className="w-full max-w-md space-y-4 rounded-2xl bg-slate-900 p-6 text-white"><h1 className="text-xl font-bold">Set a new password</h1><label className="block text-sm">New password<input className="mt-2 w-full rounded bg-slate-800 p-3" type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} /></label><button className="w-full rounded bg-emerald-600 p-3">Update password</button>{message && <p>{message}</p>}</form></main>;
}
