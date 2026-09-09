import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronLeft, ChevronRight, Component, LayoutDashboard, Menu, Moon, Search, Settings, Sun, UserRound, UsersRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useCrm } from "@/lib/crm-context";
import { roles } from "@/data/crm";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const nav = [
  {to:"/",label:"Dashboard",icon:LayoutDashboard}, {to:"/leads",label:"Leads",icon:UserRound},
  {to:"/customers",label:"Customers",icon:UsersRound}, {to:"/team",label:"Team",icon:UsersRound},
  {to:"/settings",label:"Settings",icon:Settings}, {to:"/components",label:"Components",icon:Component},
] as const;
export function AppShell({children}:{children:ReactNode}){
  const {theme,setTheme,role,setRole,railCollapsed,setRailCollapsed}=useCrm(); const [mobile,setMobile]=useState(false);
  const path=useRouterState({select:s=>s.location.pathname}); if(path==="/sign-in"||path==="/register") return <>{children}</>;
  return <div className="min-h-screen bg-background text-foreground">
    {mobile&&<button aria-label="Close navigation" className="fixed inset-0 z-40 bg-overlay md:hidden" onClick={()=>setMobile(false)}/>} 
    <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-300 ${railCollapsed?"w-[76px]":"w-[232px]"} ${mobile?"translate-x-0":"-translate-x-full md:translate-x-0"}`}>
      <div className={`flex h-20 items-center border-b border-sidebar-border ${railCollapsed?"justify-center":"px-5"}`}><Link to="/" aria-label="Maison CRM" className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-foreground font-display text-lg text-background">M</span>{!railCollapsed&&<span><b className="block font-display text-lg font-medium">Maison</b><span className="block text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Client relations</span></span>}</Link></div>
      <nav className="flex-1 space-y-1 p-3">{nav.map(item=>{const Icon=item.icon; const active=item.to==="/"?path==="/":path.startsWith(item.to);return <Link key={item.to} to={item.to} onClick={()=>setMobile(false)} title={railCollapsed?item.label:undefined} className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active?"bg-sidebar-accent text-sidebar-primary":"text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}><Icon className="size-[18px] shrink-0"/>{!railCollapsed&&<span>{item.label}</span>}</Link>})}</nav>
      <div className="border-t border-sidebar-border p-3"><Button variant="ghost" size={railCollapsed?"icon":"default"} className="w-full justify-start" onClick={()=>setRailCollapsed(!railCollapsed)} aria-label={railCollapsed?"Expand navigation":"Collapse navigation"}>{railCollapsed?<ChevronRight/>:<><ChevronLeft/><span>Collapse</span></>}</Button></div>
    </aside>
    <div className={`transition-[padding] duration-300 ${railCollapsed?"md:pl-[76px]":"md:pl-[232px]"}`}>
      <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-7"><Button variant="ghost" size="icon" className="md:hidden" onClick={()=>setMobile(true)}><Menu/><span className="sr-only">Open navigation</span></Button><div className="relative hidden max-w-md flex-1 sm:block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20" placeholder="Search people, companies, deals…"/></div><div className="ml-auto flex items-center gap-2"><Select value={role} onValueChange={value=>setRole(value as typeof role)}><SelectTrigger className="w-[126px] sm:w-[145px]"><SelectValue/></SelectTrigger><SelectContent>{roles.map(r=><SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select><Button variant="ghost" size="icon" onClick={()=>setTheme(theme==="light"?"dark":"light")} title="Toggle theme">{theme==="light"?<Moon/>:<Sun/>}</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative"><Bell/><span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary"/><span className="sr-only">Notifications</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-72"><DropdownMenuLabel>Notifications</DropdownMenuLabel><DropdownMenuSeparator/><DropdownMenuItem className="items-start"><span><b className="block text-xs">Proposal viewed</b><span className="text-xs text-muted-foreground">Elena opened the latest proposal.</span></span></DropdownMenuItem><DropdownMenuItem className="items-start"><span><b className="block text-xs">Task due today</b><span className="text-xs text-muted-foreground">Northline discovery brief.</span></span></DropdownMenuItem></DropdownMenuContent></DropdownMenu><Avatar className="size-9"><AvatarFallback className="bg-primary text-xs text-primary-foreground">MC</AvatarFallback></Avatar></div></header>
      <main className="mx-auto min-h-[calc(100vh-5rem)] max-w-[1500px] p-4 md:p-7 lg:p-9">{children}</main>
    </div>
  </div>
}
