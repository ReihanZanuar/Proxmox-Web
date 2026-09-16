# Proxmox Mobile Web Manager — DESIGN.md

Design system and visual direction for the Proxmox Mobile Web Manager, adhering to the Anti-Slop Craftsmanship Standard.

---

## 1. Product Identity & Purpose
- **Product Name**: ProxMobile (Proxmox VE Mobile Client)
- **Purpose**: Fast, high-density, mobile-first management of Proxmox VE hypervisors and VMs with in-browser low-latency SSH access.
- **Personality**: Utilitarian, reliable, precise, responsive, hyper-functional.

---

## 2. Four Defined Theme Specifications

The application supports 4 distinct themes toggled at runtime via `data-theme` attribute on the root `<html>` element:

### Theme A: Light Mode (`light`)
- **Background**: `#F8FAFC` (Slate-50)
- **Surface / Card**: `#FFFFFF` with `#E2E8F0` borders (Slate-200)
- **Text Primary**: `#0F172A` (Slate-900)
- **Text Muted**: `#64748B` (Slate-500)
- **Accent Primary**: `#0284C7` (Sky-600) / Active state `#0369A1`
- **Status Running**: `#16A34A` (Green-600) with `#DCFCE7` badge background
- **Status Stopped**: `#64748B` (Slate-500) with `#F1F5F9` badge background
- **Shadow**: `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`
- **Radius**: `8px` (Standard crisp radius)

### Theme B: Dark Mode (`dark`)
- **Background**: `#090D16` (Deep Obsidian)
- **Surface / Card**: `#111827` (Gray-900) with `#1F2937` borders (Gray-800)
- **Text Primary**: `#F9FAFB` (Gray-50)
- **Text Muted**: `#9CA3AF` (Gray-400)
- **Accent Primary**: `#38BDF8` (Sky-400)
- **Status Running**: `#4ADE80` (Green-400) with `#064E3B` badge background
- **Status Stopped**: `#9CA3AF` (Gray-400) with `#1F2937` badge background
- **Shadow**: `0 4px 6px -1px rgb(0 0 0 / 0.5)`
- **Radius**: `8px`

### Theme C: Neobrutalism Mode (`neobrutalism`)
- **Background**: `#FFFBEB` (Warm Cream / Amber-50)
- **Surface / Card**: `#FFFFFF` with `3px solid #000000` borders
- **Drop Shadow**: `4px 4px 0px #000000` (Hard geometric offset shadow)
- **Text Primary**: `#000000` (Pitch Black)
- **Text Muted**: `#333333`
- **Accent Primary**: `#FFE600` (Cyber Yellow) with `#000000` text & `2px` black border
- **Accent Secondary**: `#00F0FF` (Electric Cyan), `#FF5722` (Flame Orange)
- **Status Running**: `#00E676` (Electric Lime) with `2px solid #000` border
- **Status Stopped**: `#E0E0E0` with `2px solid #000` border
- **Radius**: `4px` or `0px` (Boxy brutalist geometry)
- **Interaction**: Button `:active` shifts `translate(2px, 2px)` with shadow reducing to `2px 2px 0px #000`.

### Theme D: Minimalist Black & White (`minimalist-bw`)
- **Background**: `#FFFFFF` (Pure White) or toggle inverted `#000000`
- **Surface / Card**: `#FFFFFF` with `1px solid #18181B` (Zinc-900)
- **Drop Shadow**: `none` (Strict Swiss Flat Minimal)
- **Text Primary**: `#000000`
- **Text Muted**: `#71717A` (Zinc-500)
- **Accent Primary**: `#000000` with `#FFFFFF` text
- **Status Running**: `#000000` (Filled black circle badge with "RUNNING" text)
- **Status Stopped**: Hollow black circle badge with "STOPPED" text
- **Radius**: `0px` (Pure sharp rectangular design)

---

## 3. Typography
- **UI Headings & Body**: Inter / Plus Jakarta Sans / system-ui (`sans-serif`), weight 400, 500, 600, 700.
- **Telemetry & Terminal**: JetBrains Mono / Fira Code / monospace (`font-mono`) for IP addresses, CPU%, RAM stats, VMIDs, and in-browser SSH shell.

---

## 4. Mobile & Touch Ergonomics
1. **Tap Targets**: All buttons, drawer triggers, power toggles, and navigation links have a minimum hit area of `44px x 44px`.
2. **Mobile Terminal Accessory Bar**:
   - Fixed toolbar pinned above the virtual keyboard during SSH sessions:
   - Keys: `[ESC]`, `[TAB]`, `[CTRL]`, `[ALT]`, `[↑]`, `[↓]`, `[←]`, `[→]`, `[Ctrl+C]`, `[Clear]`.
3. **No Horizontal Scroll**: All cards, data tables, and metrics adapt with flexible flex/grid wraps.
4. **Slide-Up Bottom Sheet**: VM details and power operations on mobile devices open as a bottom drawer with thumb-friendly controls.

---

## 5. Anti-Slop Rules Compliance
- **R-02 (Copywriting)**: No em dashes (`—`), no hype buzzwords ("revolutionary", "AI-powered"). Use clear, operational terminology ("Start VM", "Reboot Node", "SSH Terminal").
- **R-03 (Mobile Responsiveness)**: Tested across viewports 360px to 1920px.
- **R-17 & R-38 (Real Data Integrity)**: Live telemetry derived from actual Proxmox API endpoints with honest fallback states.
- **R-25 (Contrast)**: All theme color pairings exceed WCAG AA 4.5:1 ratio.
