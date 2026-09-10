import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { leads as seedLeads, tasks as seedTasks, type Lead, type LeadStage, type Role } from "@/data/crm";
import { useAuth } from "@/lib/auth/auth-context";

type Theme = "light" | "dark";
interface CrmContextValue { theme:Theme; setTheme:(theme:Theme)=>void; role:Role; railCollapsed:boolean; setRailCollapsed:(v:boolean)=>void; leads:Lead[]; setLeadStage:(id:string,stage:LeadStage)=>void; upsertLead:(lead:Lead)=>void; tasks:typeof seedTasks; toggleTask:(id:string)=>void }
const CrmContext = createContext<CrmContextValue | null>(null);
export function CrmProvider({children}:{children:ReactNode}) {
  const [theme,setThemeState]=useState<Theme>("light");
  const [railCollapsed,setRailCollapsed]=useState(false); const [leads,setLeads]=useState(seedLeads); const [tasks,setTasks]=useState(seedTasks);
  // The role is the signed-in user's, not a local preference — falling back to
  // "viewer" (no permissions) while the session is still being restored.
  const {user}=useAuth(); const role:Role=user?.role ?? "viewer";
  useEffect(()=>{ const saved=window.localStorage.getItem("maison-theme") as Theme | null; const next=saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"); setThemeState(next); document.documentElement.classList.toggle("dark",next==="dark"); },[]);
  const setTheme=(next:Theme)=>{setThemeState(next);document.documentElement.classList.toggle("dark",next==="dark");window.localStorage.setItem("maison-theme",next)};
  const value=useMemo(()=>({theme,setTheme,role,railCollapsed,setRailCollapsed,leads,setLeadStage:(id:string,stage:LeadStage)=>setLeads(v=>v.map(l=>l.id===id?{...l,stage}:l)),upsertLead:(lead:Lead)=>setLeads(v=>{const exists=v.some(l=>l.id===lead.id);return exists?v.map(l=>l.id===lead.id?lead:l):[lead,...v]}),tasks,toggleTask:(id:string)=>setTasks(v=>v.map(t=>t.id===id?{...t,done:!t.done}:t))}),[theme,role,railCollapsed,leads,tasks]);
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}
export function useCrm(){const value=useContext(CrmContext);if(!value)throw new Error("useCrm must be used within CrmProvider");return value}
