/**
 * Mirrors `USER_ROLES` in `backend/src/modules/users/users.types.ts`, most to
 * least privileged. Roles come from the signed-in user, so the two lists have
 * to agree — a role the backend issues that is missing here has no permissions.
 */
export type Role = "owner" | "admin" | "agent" | "viewer";
export type LeadStage = "New" | "Contacted" | "Qualified" | "Proposal" | "Won" | "Lost";
export type Health = "Strong" | "Watch" | "At risk";
export type PermissionAction = "lead:create" | "lead:edit" | "lead:move" | "team:invite" | "team:manage" | "settings:edit" | "customer:edit";

export interface Lead { id: string; name: string; company: string; email: string; value: number; stage: LeadStage; source: string; owner: string; lastContact: string; note: string }
export interface Customer { id: string; name: string; company: string; segment: "Enterprise" | "Growth" | "Private"; health: Health; value: number; contact: string; email: string; since: string }
export interface TeamMember { id: string; name: string; email: string; role: Role; initials: string; active: boolean }
export interface Activity { id: string; text: string; person: string; time: string; kind: "deal" | "call" | "note" | "email" }
export interface Task { id: string; title: string; due: string; done: boolean; priority: "High" | "Normal" }

export const stages: LeadStage[] = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
export const roles: { value: Role; label: string }[] = [
  { value: "owner", label: "Owner" }, { value: "admin", label: "Admin" },
  { value: "agent", label: "Agent" }, { value: "viewer", label: "Viewer" },
];

export const leads: Lead[] = [
  { id:"L-1048", name:"Elena Rossi", company:"Atelier Rossi", email:"elena@atelierrossi.co", value:185000, stage:"Proposal", source:"Referral", owner:"Maya Chen", lastContact:"Today, 9:42", note:"Reviewing the revised portfolio proposal with her partners." },
  { id:"L-1047", name:"Marcus Reed", company:"Northline Capital", email:"marcus@northline.co", value:320000, stage:"Qualified", source:"Website", owner:"Jon Bell", lastContact:"Yesterday", note:"Interested in a phased engagement beginning in Q4." },
  { id:"L-1046", name:"Priya Shah", company:"Calico House", email:"priya@calicohouse.com", value:96000, stage:"Contacted", source:"Event", owner:"Maya Chen", lastContact:"Sep 4", note:"Introduced at the Founders' Table dinner." },
  { id:"L-1045", name:"Theo Martin", company:"Forma Studio", email:"theo@forma.studio", value:142000, stage:"New", source:"Organic", owner:"Sam Rivera", lastContact:"Sep 4", note:"Inbound request for a multi-location rollout." },
  { id:"L-1044", name:"Sofia Laurent", company:"Maison Laurent", email:"sofia@laurent.fr", value:278000, stage:"Won", source:"Referral", owner:"Maya Chen", lastContact:"Sep 2", note:"Agreement signed. Handoff scheduled for Monday." },
  { id:"L-1043", name:"Noah Williams", company:"Common Ground", email:"noah@commonground.io", value:74000, stage:"Lost", source:"Outbound", owner:"Jon Bell", lastContact:"Aug 29", note:"Timing moved to next year; keep in nurture." },
  { id:"L-1042", name:"Amara Okafor", company:"Noma Collective", email:"amara@noma.co", value:210000, stage:"Qualified", source:"Partner", owner:"Sam Rivera", lastContact:"Aug 28", note:"Decision committee meeting booked for Friday." },
  { id:"L-1041", name:"Lucas Meyer", company:"Field Notes", email:"lucas@fieldnotes.de", value:118000, stage:"New", source:"Website", owner:"Jon Bell", lastContact:"Aug 27", note:"Downloaded the enterprise guide and requested a call." },
];

export const customers: Customer[] = [
  { id:"C-201", name:"Sofia Laurent", company:"Maison Laurent", segment:"Enterprise", health:"Strong", value:278000, contact:"Sofia Laurent", email:"sofia@laurent.fr", since:"Mar 2024" },
  { id:"C-202", name:"Avery Brooks", company:"Cedar & Stone", segment:"Growth", health:"Strong", value:164000, contact:"Avery Brooks", email:"avery@cedarstone.co", since:"Jul 2024" },
  { id:"C-203", name:"Inez Silva", company:"Lumen Works", segment:"Enterprise", health:"Watch", value:226000, contact:"Inez Silva", email:"inez@lumenworks.com", since:"Oct 2023" },
  { id:"C-204", name:"Daniel Kim", company:"Onda Partners", segment:"Private", health:"Strong", value:89000, contact:"Daniel Kim", email:"daniel@onda.partners", since:"Jan 2025" },
  { id:"C-205", name:"Leila Haddad", company:"Archive Office", segment:"Growth", health:"At risk", value:132000, contact:"Leila Haddad", email:"leila@archiveoffice.co", since:"Nov 2024" },
  { id:"C-206", name:"Hugo Bernard", company:"Kindred Hotels", segment:"Enterprise", health:"Strong", value:405000, contact:"Hugo Bernard", email:"hugo@kindredhotels.com", since:"May 2023" },
];

// Names and roles match the accounts created by `backend/prisma/seed.ts`, so a
// seeded sign-in lands on a team list that already contains the signed-in user.
export const team: TeamMember[] = [
  { id:"U-1", name:"Maya Chen", email:"owner@maison.co", role:"owner", initials:"MC", active:true },
  { id:"U-2", name:"Jon Bell", email:"admin@maison.co", role:"admin", initials:"JB", active:true },
  { id:"U-3", name:"Sam Rivera", email:"agent@maison.co", role:"agent", initials:"SR", active:true },
  { id:"U-4", name:"Ana Moreau", email:"viewer@maison.co", role:"viewer", initials:"AM", active:true },
];
export const activities: Activity[] = [
  { id:"A1", text:"Proposal moved to final review", person:"Elena Rossi", time:"18 min ago", kind:"deal" },
  { id:"A2", text:"Call notes added", person:"Marcus Reed", time:"1 hr ago", kind:"note" },
  { id:"A3", text:"Discovery call completed", person:"Priya Shah", time:"3 hrs ago", kind:"call" },
  { id:"A4", text:"Follow-up email opened", person:"Theo Martin", time:"Yesterday", kind:"email" },
];
export const tasks: Task[] = [
  { id:"T1", title:"Send revised proposal to Elena", due:"Today", done:false, priority:"High" },
  { id:"T2", title:"Prepare Northline discovery brief", due:"Today", done:false, priority:"Normal" },
  { id:"T3", title:"Confirm Friday committee call", due:"Tomorrow", done:false, priority:"Normal" },
  { id:"T4", title:"Archive August pipeline report", due:"Sep 8", done:true, priority:"Normal" },
];
export const pipelineData = [
  { month:"Apr", pipeline:620, revenue:184 }, { month:"May", pipeline:760, revenue:225 },
  { month:"Jun", pipeline:710, revenue:268 }, { month:"Jul", pipeline:910, revenue:294 },
  { month:"Aug", pipeline:1040, revenue:338 }, { month:"Sep", pipeline:1280, revenue:412 },
];
export const sourceData = [
  { name:"Referral", value:38 }, { name:"Website", value:27 }, { name:"Events", value:19 }, { name:"Outbound", value:16 },
];
const permissions: Record<Role, PermissionAction[]> = {
  owner:["lead:create","lead:edit","lead:move","team:invite","team:manage","settings:edit","customer:edit"],
  admin:["lead:create","lead:edit","lead:move","team:invite","team:manage","settings:edit","customer:edit"],
  agent:["lead:create","lead:edit","lead:move","customer:edit"],
  viewer:[],
};
export function can(role: Role, action: PermissionAction) { return permissions[role].includes(action); }
export const permissionRows: { label:string; action: PermissionAction }[] = [
  {label:"Create leads",action:"lead:create"},{label:"Edit leads",action:"lead:edit"},{label:"Move pipeline cards",action:"lead:move"},
  {label:"Edit customers",action:"customer:edit"},{label:"Invite team members",action:"team:invite"},{label:"Manage roles",action:"team:manage"},{label:"Edit workspace settings",action:"settings:edit"},
];
