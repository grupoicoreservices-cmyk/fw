{
  "product": {
    "name": "Firewall Console (pfSense-like) — Premium SOC/NOC UI",
    "platform": "React + Tailwind + shadcn/ui (JS files) + Recharts + lucide-react + framer-motion + react-i18next",
    "brand_attributes": [
      "authoritative",
      "high-signal / low-noise",
      "operator-first (keyboard + density)",
      "premium dark (glass + precision)",
      "trustworthy security tooling"
    ],
    "design_personality": {
      "keywords": [
        "deep-slate near-black",
        "cyan + emerald semantics",
        "glassmorphic surfaces",
        "monospace numerics",
        "subtle grid/noise",
        "data-dense tables",
        "real-time motion cues"
      ],
      "do_not": [
        "No playful illustration, no people photos, no emoji icons",
        "No purple/pink saturated gradients",
        "No centered app container",
        "No heavy glow everywhere (reserve for focus/critical)"
      ]
    }
  },

  "information_architecture": {
    "app_shell": {
      "layout": "Left sidebar (collapsible) + topbar + main content. Primary target 1366×768+. Tablet supported; mobile secondary.",
      "nav_groups": [
        {
          "label": "Overview",
          "items": ["Dashboard"]
        },
        {
          "label": "Network",
          "items": ["Interfaces", "Aliases"]
        },
        {
          "label": "Firewall",
          "items": ["Rules", "NAT"]
        },
        {
          "label": "Services",
          "items": ["VPN", "DHCP", "DNS"]
        },
        {
          "label": "Monitoring",
          "items": ["Logs"]
        },
        {
          "label": "Administration",
          "items": ["Users", "Export"]
        }
      ],
      "topbar": [
        "Global search (IP/host/rule id)",
        "Time range selector (Dashboard/Logs)",
        "Language toggle PT/EN",
        "User menu (profile, logout)"
      ]
    },
    "routes": {
      "/login": "Branded auth",
      "/": "Live dashboard",
      "/firewall": "Rules table + create/edit drawer + reorder",
      "/nat": "Port forwards",
      "/vpn": "OpenVPN/WireGuard tabs",
      "/dhcp": "Server config + leases",
      "/dns": "Resolver + records",
      "/aliases": "Named groups",
      "/interfaces": "Interface cards",
      "/logs": "Live tail viewer",
      "/users": "RBAC management",
      "/export": "Config preview + download"
    },
    "rbac": {
      "roles": {
        "admin": "Full access incl. Users, Export, destructive actions",
        "operator": "Can edit rules/services but cannot manage users",
        "viewer": "Read-only; all form controls disabled; export hidden"
      },
      "ui_patterns": [
        "Viewer mode: show lock icon + tooltip 'Read-only' on disabled actions",
        "Admin-only routes: sidebar item hidden OR visible but gated with 'Insufficient permissions' empty state (choose one consistently)"
      ]
    },
    "bilingual": {
      "implementation": "react-i18next with instant toggle; persist language in localStorage",
      "ui": "Topbar segmented control: PT | EN (no dropdown)"
    }
  },

  "typography": {
    "google_fonts": {
      "ui_sans": {
        "family": "Space Grotesk",
        "weights": [400, 500, 600, 700],
        "usage": "Headings, navigation, labels"
      },
      "mono": {
        "family": "JetBrains Mono",
        "weights": [400, 500, 600],
        "usage": "IPs, ports, MACs, throughput, code previews, log lines"
      }
    },
    "tailwind_mapping": {
      "recommendation": "Set CSS vars and apply via Tailwind config if available; otherwise use utility classes per component.",
      "classes": {
        "heading": "font-[var(--font-sans)] tracking-[-0.02em]",
        "body": "font-[var(--font-sans)]",
        "mono": "font-[var(--font-mono)] tabular-nums"
      }
    },
    "type_scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-sm font-semibold tracking-wide uppercase",
      "body": "text-sm md:text-base",
      "small": "text-xs text-muted-foreground",
      "table": "text-xs md:text-sm",
      "numeric": "text-xs md:text-sm font-mono tabular-nums"
    }
  },

  "color_system": {
    "notes": [
      "Dark theme locked.",
      "Semantics: emerald=allow/ok, red=blocked/down/critical, amber=warning, cyan=info/highlight, slate=neutral/disabled.",
      "Avoid purple; keep accents cyan/emerald with restrained blue for charts only."
    ],
    "tokens_css_vars": {
      "how_to_apply": "Replace /app/frontend/src/index.css :root and .dark tokens with these HSL values. Keep shadcn token names.",
      "dark": {
        "--background": "222 47% 6%",
        "--foreground": "210 40% 98%",
        "--card": "222 44% 8%",
        "--card-foreground": "210 40% 98%",
        "--popover": "222 44% 8%",
        "--popover-foreground": "210 40% 98%",

        "--primary": "188 92% 45%",
        "--primary-foreground": "222 47% 6%",

        "--secondary": "222 28% 14%",
        "--secondary-foreground": "210 40% 98%",

        "--muted": "222 28% 14%",
        "--muted-foreground": "215 20% 70%",

        "--accent": "160 84% 36%",
        "--accent-foreground": "222 47% 6%",

        "--destructive": "0 84% 56%",
        "--destructive-foreground": "210 40% 98%",

        "--border": "222 22% 18%",
        "--input": "222 22% 18%",
        "--ring": "188 92% 45%",

        "--radius": "0.75rem",

        "--chart-1": "188 92% 45%",
        "--chart-2": "160 84% 36%",
        "--chart-3": "43 96% 56%",
        "--chart-4": "0 84% 56%",
        "--chart-5": "215 20% 70%"
      },
      "extra_custom_tokens": {
        "--surface-1": "222 44% 8%",
        "--surface-2": "222 28% 12%",
        "--surface-3": "222 22% 16%",
        "--glass-bg": "222 44% 8% / 0.72",
        "--glass-border": "188 92% 45% / 0.14",
        "--shadow-elev-1": "0 0% 0% / 0.35",
        "--shadow-elev-2": "0 0% 0% / 0.55",
        "--focus-glow": "188 92% 45% / 0.35",
        "--ok": "160 84% 36%",
        "--info": "188 92% 45%",
        "--warn": "43 96% 56%",
        "--bad": "0 84% 56%",
        "--neutral": "215 16% 55%"
      }
    },
    "background_texture": {
      "pattern": "Subtle grid + noise overlay (very low opacity).",
      "css_snippet": "/* apply on main app background wrapper */\n.bg-soc {\n  background-color: hsl(var(--background));\n  background-image:\n    linear-gradient(to right, hsl(222 22% 18% / 0.35) 1px, transparent 1px),\n    linear-gradient(to bottom, hsl(222 22% 18% / 0.35) 1px, transparent 1px);\n  background-size: 48px 48px;\n}\n.bg-soc::before {\n  content: \"\";\n  position: fixed;\n  inset: 0;\n  pointer-events: none;\n  background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"3\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(%23n)\" opacity=\"0.08\"/></svg>');\n  mix-blend-mode: overlay;\n  opacity: 0.35;\n}"
    },
    "gradients": {
      "allowed_usage": [
        "Hero header strip on Dashboard only (max 15–20% viewport height)",
        "Large section background accents behind charts (not behind tables/log text)"
      ],
      "approved_gradients": [
        {
          "name": "noc-scanline",
          "tailwind": "bg-[radial-gradient(1200px_circle_at_20%_0%,hsl(188_92%_45%/0.14),transparent_55%),radial-gradient(900px_circle_at_80%_10%,hsl(160_84%_36%/0.10),transparent_50%)]"
        }
      ]
    }
  },

  "spacing_and_grid": {
    "spacing_scale": {
      "rule": "Use 2–3x more spacing than default dashboards; keep dense tables but airy containers.",
      "tokens": {
        "--space-1": "0.25rem",
        "--space-2": "0.5rem",
        "--space-3": "0.75rem",
        "--space-4": "1rem",
        "--space-5": "1.25rem",
        "--space-6": "1.5rem",
        "--space-8": "2rem",
        "--space-10": "2.5rem",
        "--space-12": "3rem"
      }
    },
    "layout_grid": {
      "desktop": "12-col grid; main content max-w: none (full width), but constrain inner sections to 1440px with px-6/px-8.",
      "kpi_row": "4–6 KPI cards; use responsive: grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4",
      "tables": "Full-width with sticky header; allow horizontal scroll for wide columns"
    }
  },

  "components": {
    "component_path": {
      "shadcn_primary": "/app/frontend/src/components/ui",
      "use_components": [
        "button.jsx",
        "input.jsx",
        "select.jsx",
        "tabs.jsx",
        "table.jsx",
        "badge.jsx",
        "card.jsx",
        "sheet.jsx",
        "drawer.jsx",
        "dialog.jsx",
        "dropdown-menu.jsx",
        "scroll-area.jsx",
        "separator.jsx",
        "tooltip.jsx",
        "switch.jsx",
        "checkbox.jsx",
        "command.jsx",
        "sonner.jsx"
      ]
    },

    "app_shell": {
      "sidebar": {
        "spec": "Fixed left sidebar 264px (collapsed 76px). Group labels uppercase. Active item has left accent bar + subtle cyan wash.",
        "tailwind": {
          "container": "bg-[hsl(var(--surface-1))] border-r border-border/70",
          "item": "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5",
          "item_active": "text-foreground bg-white/6 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-full before:bg-[hsl(var(--info))]"
        },
        "data_testids": {
          "nav": "app-sidebar-nav",
          "item": "sidebar-nav-item-<route>"
        }
      },
      "topbar": {
        "spec": "48–56px height. Left: breadcrumb + page title. Center: global search. Right: time range, language toggle, user menu.",
        "global_search": {
          "component": "Command (cmdk) for quick jump + search",
          "data_testid": "global-command-search"
        },
        "language_toggle": {
          "component": "ToggleGroup (PT/EN)",
          "data_testid": "language-toggle"
        },
        "user_menu": {
          "component": "DropdownMenu",
          "data_testid": "user-menu"
        }
      }
    },

    "kpi_card": {
      "spec": "Card with label, big value (mono), delta chip, tiny sparkline. Click opens detail drawer.",
      "structure": [
        "CardHeader: label + status dot",
        "CardContent: value + unit + sparkline",
        "CardFooter: delta + last updated"
      ],
      "tailwind": {
        "card": "bg-[hsl(var(--surface-1))] border border-border/70 shadow-[0_10px_30px_hsl(var(--shadow-elev-1))]",
        "value": "font-mono text-2xl md:text-3xl tracking-tight",
        "label": "text-xs uppercase tracking-wide text-muted-foreground",
        "sparkline_wrap": "h-10"
      },
      "data_testids": {
        "card": "kpi-card-<metric>",
        "value": "kpi-value-<metric>"
      }
    },

    "chart_card": {
      "spec": "Charts always inside Card with header controls (range, legend toggles). No gradients behind axes labels.",
      "recharts": {
        "rules": [
          "Use stroke colors from --chart-* tokens",
          "Use monospace for tick labels when numeric",
          "Tooltip uses dark glass panel"
        ]
      },
      "data_testids": {
        "card": "chart-card-<name>",
        "range": "chart-range-select"
      }
    },

    "data_table": {
      "spec": "Dense, keyboard-friendly table with sticky header, row hover, row actions, bulk select, column visibility.",
      "tailwind": {
        "wrap": "rounded-xl border border-border/70 bg-[hsl(var(--surface-1))]",
        "header": "sticky top-0 z-10 bg-[hsl(var(--surface-1))] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--surface-1)/0.85)]",
        "row": "hover:bg-white/4 focus-within:bg-white/5",
        "cell": "py-2.5 px-3",
        "mono_cell": "font-mono tabular-nums"
      },
      "row_actions": {
        "pattern": "Rightmost column with ghost icon buttons (edit/duplicate/delete). Show on hover + always visible on keyboard focus.",
        "components": ["Button", "DropdownMenu", "Tooltip"]
      },
      "drag_reorder": {
        "pattern": "Drag handle at far-left (grip icon). While dragging: row gets outline ring-info and slight scale.",
        "library": {
          "name": "@dnd-kit",
          "install": "npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities",
          "notes": "Use handle-only dragging to avoid accidental drags when selecting text."
        },
        "data_testids": {
          "handle": "table-row-drag-handle-<id>",
          "row": "table-row-<id>"
        }
      },
      "bulk_actions": {
        "pattern": "Appears as a floating bar above table when selection > 0.",
        "data_testid": "table-bulk-actions"
      }
    },

    "rule_drawer_sheet": {
      "spec": "Create/Edit firewall rule uses Sheet from right (40% width desktop, full on mobile). Form is grouped: Action, Match, Advanced.",
      "components": ["Sheet", "Form", "Input", "Select", "Switch", "Tabs", "Textarea"],
      "tailwind": {
        "sheet": "w-full sm:max-w-xl lg:max-w-2xl",
        "section": "space-y-3 rounded-lg border border-border/70 bg-white/3 p-4"
      },
      "data_testids": {
        "open": "firewall-rule-create-button",
        "sheet": "firewall-rule-sheet",
        "submit": "firewall-rule-save-button"
      }
    },

    "status_badge": {
      "spec": "Use Badge with semantic variants; include dot + label. Never rely on color alone; include icon.",
      "mapping": {
        "ok": "bg-[hsl(var(--ok)/0.18)] text-[hsl(var(--ok))] border border-[hsl(var(--ok)/0.25)]",
        "info": "bg-[hsl(var(--info)/0.16)] text-[hsl(var(--info))] border border-[hsl(var(--info)/0.25)]",
        "warn": "bg-[hsl(var(--warn)/0.16)] text-[hsl(var(--warn))] border border-[hsl(var(--warn)/0.25)]",
        "bad": "bg-[hsl(var(--bad)/0.16)] text-[hsl(var(--bad))] border border-[hsl(var(--bad)/0.25)]",
        "neutral": "bg-white/6 text-muted-foreground border border-border/70"
      },
      "data_testid": "status-badge-<state>"
    },

    "logs_viewer": {
      "spec": "Live tail console with pause/resume, severity filters, search, and row expand. Use ScrollArea; keep monospace; allow copy.",
      "layout": "Top filter bar + log stream + right detail drawer on row click.",
      "log_line": {
        "tailwind": "font-mono text-xs leading-5 px-3 py-2 border-b border-border/50 hover:bg-white/4",
        "severity_left_bar": "Use a 3px left border color per severity",
        "data_testid": "log-line-<id>"
      },
      "controls": {
        "pause": {"component": "Button", "data_testid": "logs-pause-button"},
        "resume": {"component": "Button", "data_testid": "logs-resume-button"},
        "severity": {"component": "ToggleGroup", "data_testid": "logs-severity-toggle"},
        "search": {"component": "Input", "data_testid": "logs-search-input"}
      }
    },

    "code_preview": {
      "spec": "Export page shows code blocks with copy button + download. Use monospace, line numbers optional.",
      "tailwind": {
        "wrap": "rounded-xl border border-border/70 bg-black/30",
        "code": "font-mono text-xs md:text-sm p-4 overflow-auto",
        "copy_btn": "absolute right-3 top-3"
      },
      "data_testids": {
        "nft_preview": "export-nftables-preview",
        "iptables_preview": "export-iptables-preview",
        "copy": "code-copy-button-<type>",
        "download": "config-download-button-<type>"
      }
    }
  },

  "motion_and_microinteractions": {
    "principles": [
      "Motion communicates state changes (live, updated, selected) — not decoration.",
      "Prefer opacity/blur/position transitions; avoid transform transitions on containers that also animate layout.",
      "Respect prefers-reduced-motion."
    ],
    "framer_motion": {
      "install": "npm i framer-motion",
      "patterns": [
        {
          "name": "kpi_update_pulse",
          "behavior": "When metric updates, briefly pulse border to info color.",
          "js_scaffold": "// pseudo\n<motion.div animate={{ boxShadow: updated ? '0 0 0 3px hsl(var(--focus-glow))' : '0 0 0 0 transparent' }} transition={{ duration: 0.35 }} />"
        },
        {
          "name": "drawer_enter",
          "behavior": "Sheet/Drawer enters with slight x + opacity; keep duration 180–220ms."
        }
      ]
    },
    "hover_states": {
      "buttons": "hover:bg-white/6 for ghost; primary hover: slight darken + subtle glow",
      "rows": "row hover background + show row actions",
      "charts": "tooltip fade-in 120ms"
    }
  },

  "accessibility": {
    "requirements": [
      "WCAG AA contrast on dark",
      "Visible focus ring using --ring",
      "Keyboard navigation for sidebar, tables, dialogs",
      "Do not encode meaning by color alone (icons + labels)"
    ],
    "focus_styles": {
      "tailwind": "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--background))]"
    }
  },

  "testing_attributes": {
    "rule": "All interactive and key informational elements MUST include data-testid in kebab-case.",
    "examples": [
      "data-testid=\"login-form-submit-button\"",
      "data-testid=\"firewall-rules-table\"",
      "data-testid=\"interface-status-badge-wan\"",
      "data-testid=\"vpn-peer-toggle-<id>\""
    ]
  },

  "images": {
    "policy": "No people photos. Use abstract textures only (CSS grid/noise).",
    "image_urls": []
  },

  "instructions_to_main_agent": [
    "Update /app/frontend/src/index.css tokens: replace .dark palette with the provided HSL values; keep shadcn token names.",
    "Add Google Fonts (Space Grotesk + JetBrains Mono) in index.html or via CSS import; apply mono to numeric fields and logs.",
    "Build AppShell: Sidebar + Topbar; ensure no centered container styles from App.css; remove legacy CRA App-header styles.",
    "Use shadcn components from /src/components/ui (JS) only for inputs, tables, dialogs, sheets, etc.",
    "Implement Firewall Rules table with @dnd-kit handle-only drag reorder; include bulk actions and row actions.",
    "Implement Logs viewer with ScrollArea + pause/resume + severity toggles; monospace lines; row click opens detail Sheet.",
    "Use Recharts for dashboard charts; apply chart colors from tokens; keep tooltips glassy and readable.",
    "Add react-i18next language toggle PT/EN in topbar; persist selection.",
    "Every interactive element and key metric must include data-testid attributes."
  ],

  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
