import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tasks as seedTasks, type Lead, type LeadStage, type Property, type Role } from "@/data/crm";
import { fetchProperties } from "@/lib/api/properties";
import { fetchLeads, updateLead } from "@/lib/api/leads";
import { fetchAssignableAgents, type ApiUser } from "@/lib/api/users";
import { fetchMyRegion, type Region } from "@/lib/api/regions";
import { useAuth } from "@/lib/auth/auth-context";

type Theme = "light" | "dark";
interface CrmContextValue { theme:Theme; setTheme:(theme:Theme)=>void; role:Role|null; railCollapsed:boolean; setRailCollapsed:(v:boolean)=>void; leads:Lead[]; leadsStatus:"loading"|"ready"|"error"; leadsError:string|null; setLeadStage:(id:string,stage:LeadStage,value?:number)=>Promise<void>; upsertLead:(lead:Lead)=>void; reloadLeads:()=>void; agents:ApiUser[]; properties:Property[]; propertiesStatus:"loading"|"ready"|"error"; propertiesError:string|null; upsertProperty:(property:Property)=>void; reloadProperties:()=>void; myRegion:Region|null; tasks:typeof seedTasks; toggleTask:(id:string)=>void }
const CrmContext = createContext<CrmContextValue | null>(null);
export function CrmProvider({children}:{children:ReactNode}) {
  const [theme,setThemeState]=useState<Theme>("light");
  const [railCollapsed,setRailCollapsed]=useState(false); const [tasks,setTasks]=useState(seedTasks);
  const [agents,setAgents]=useState<ApiUser[]>([]); const [leads,setLeads]=useState<Lead[]>([]); const [leadsStatus,setLeadsStatus]=useState<"loading"|"ready"|"error">("loading"); const [leadsError,setLeadsError]=useState<string|null>(null); const [leadsNonce,setLeadsNonce]=useState(0);
  // Properties are fetched rather than seeded — the public website reads the
  // same rows.
  const [properties,setProperties]=useState<Property[]>([]); const [propertiesStatus,setPropertiesStatus]=useState<"loading"|"ready"|"error">("loading"); const [propertiesError,setPropertiesError]=useState<string|null>(null); const [propertiesNonce,setPropertiesNonce]=useState(0);
  // The role is the signed-in user's, not a local preference — null while the
  // session is still being restored, which `can()` reads as no permissions.
  const {user,token}=useAuth(); const role:Role|null=user?.role ?? null;
  // The signed-in user's own region, for the header. Null for owners and
  // system admins, who work across every region.
  const [myRegion,setMyRegion]=useState<Region|null>(null);
  useEffect(()=>{ if(!token){ setMyRegion(null); return; }
    let cancelled=false;
    fetchMyRegion(token).then(region=>{ if(!cancelled) setMyRegion(region); }).catch(()=>{ if(!cancelled) setMyRegion(null); });
    return()=>{cancelled=true};
  },[token,user?.regionId]);
  useEffect(()=>{ const saved=window.localStorage.getItem("maison-theme") as Theme | null; const next=saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"); setThemeState(next); document.documentElement.classList.toggle("dark",next==="dark"); },[]);
  // Reads are public on the API, but this waits for a session anyway and sends
  // its token: the API then narrows the list to the user's region, so a
  // regional user never holds another region's listings.
  useEffect(()=>{ if(!token){ setProperties([]); setPropertiesStatus("loading"); return; }
    let cancelled=false; setPropertiesStatus("loading");
    fetchProperties(token)
      .then(page=>{ if(cancelled) return; setProperties(page.items); setPropertiesError(null); setPropertiesStatus("ready"); })
      .catch((error:unknown)=>{ if(cancelled) return; setPropertiesError(error instanceof Error?error.message:"Could not load properties"); setPropertiesStatus("error"); });
    return()=>{cancelled=true};
  },[token,propertiesNonce]);
  // Leads are private, so this waits for a session — unlike properties,
  // whose reads are public.
  useEffect(()=>{ if(!token){ setLeads([]); setLeadsStatus("loading"); return; }
    let cancelled=false; setLeadsStatus("loading");
    fetchLeads(token)
      .then(page=>{ if(cancelled) return; setLeads(page.items); setLeadsError(null); setLeadsStatus("ready"); })
      .catch((error:unknown)=>{ if(cancelled) return; setLeadsError(error instanceof Error?error.message:"Could not load leads"); setLeadsStatus("error"); });
    return()=>{cancelled=true};
  },[token,leadsNonce]);
  // Who a lead can be assigned to. Fetched once a session exists, alongside
  // the leads themselves; an empty roster just leaves the picker empty.
  useEffect(()=>{ if(!token){ setAgents([]); return; }
    let cancelled=false;
    fetchAssignableAgents(token).then(list=>{ if(!cancelled) setAgents(list); }).catch(()=>{ if(!cancelled) setAgents([]); });
    return()=>{cancelled=true};
  },[token]);
  const setTheme=(next:Theme)=>{setThemeState(next);document.documentElement.classList.toggle("dark",next==="dark");window.localStorage.setItem("maison-theme",next)};
  const value=useMemo(()=>({theme,setTheme,role,railCollapsed,setRailCollapsed,leads,leadsStatus,leadsError,setLeadStage:async(id:string,stage:LeadStage,value?:number)=>{
      if(!token) throw new Error("Your session has expired — sign in again");
      // Optimistic: the card moves under the cursor, and snaps back if the
      // server refuses.
      const previous=leads;
      setLeads(v=>v.map(l=>l.id===id?{...l,stage,...(value===undefined?{}:{value})}:l));
      try{ const saved=await updateLead(id,{stage,...(value===undefined?{}:{value})},token); setLeads(v=>v.map(l=>l.id===id?saved:l)); }
      catch(error){ setLeads(previous); throw error; }
    },upsertLead:(lead:Lead)=>setLeads(v=>{const exists=v.some(l=>l.id===lead.id);return exists?v.map(l=>l.id===lead.id?lead:l):[lead,...v]}),reloadLeads:()=>setLeadsNonce(n=>n+1),agents,properties,propertiesStatus,propertiesError,upsertProperty:(property:Property)=>setProperties(v=>{const exists=v.some(p=>p.id===property.id);return exists?v.map(p=>p.id===property.id?property:p):[property,...v]}),reloadProperties:()=>setPropertiesNonce(n=>n+1),myRegion,tasks,toggleTask:(id:string)=>setTasks(v=>v.map(t=>t.id===id?{...t,done:!t.done}:t))}),[theme,role,railCollapsed,agents,leads,leadsStatus,leadsError,token,properties,propertiesStatus,propertiesError,myRegion,tasks]);
  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}
export function useCrm(){const value=useContext(CrmContext);if(!value)throw new Error("useCrm must be used within CrmProvider");return value}
