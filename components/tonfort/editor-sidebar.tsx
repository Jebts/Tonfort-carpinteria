"use client"

import { useState } from "react"
import { X, ChevronLeft, Video, Layout, Globe, FileText, Zap, Plus, Edit2, Trash2, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarSection {
  id: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

export function EditorSidebar({ sections, collapsed: controlledCollapsed, onCollapsedChange }: { 
  sections: SidebarSection[]
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(sections[0]?.id ?? null)
  
  const collapsed = controlledCollapsed ?? internalCollapsed
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed

  return (
    <>
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}
      
      <aside suppressHydrationWarning className={cn(
        "fixed left-0 top-0 z-[60] h-[100svh] bg-[#121214] transition-all duration-300",
        collapsed ? "-translate-x-full w-16" : "w-80 translate-x-0"
      )}>
        <div className="flex items-center justify-between gap-3 bg-[#18181b] p-4 pt-16">
          {!collapsed && <span className="font-display text-lg text-white">Editor</span>}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#27272a] text-white transition-colors hover:bg-[#3f3f46]"
            aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-180")} />
          </button>
        </div>
        
        <nav className="no-scrollbar h-[calc(100svh-7rem)] overflow-y-auto p-2">
          {sections.map((section) => (
            <div key={section.id} className="mb-2">
              <button
                onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-white hover:bg-[#27272a] transition-colors"
              >
                {section.icon}
                {!collapsed && <span className="font-medium">{section.label}</span>}
              </button>
              
              {!collapsed && openSection === section.id && (
                <div className="mt-1 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 max-h-[calc(100svh-8rem)] overflow-y-auto pr-2">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
      
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="fixed left-4 top-16 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-[#27272a] text-white transition-colors hover:bg-[#3f3f46]"
          aria-label="Abrir editor"
        >
          <Layout className="h-6 w-6" />
        </button>
      )}
    </>
  )
}