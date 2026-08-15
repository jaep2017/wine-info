import { NavContent } from "@/components/layout/nav-content";

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <NavContent />
    </aside>
  );
}
