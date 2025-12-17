# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Montessori Kinderhaus App - A React-based kindergarten management application for German-speaking Montessori daycare facilities. The app manages groups, children, news, food plans, and absence reporting with role-based access (parent/team/admin).

## Development Commands

```bash
npm run dev      # Start development server on port 5173
npm run build    # Build for production
npm run preview  # Preview production build
```

## Architecture

### Tech Stack
- **Frontend**: React 18 with Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL database + Auth)
- **Rich Text**: TipTap editor for news creation
- **Drag & Drop**: @hello-pangea/dnd for list reordering
- **Icons**: lucide-react

### Data Layer
- `src/api/supabaseClient.js` - Supabase client singleton
- `src/api/groupApi.js` - Group CRUD operations
- `src/api/userApi.js` - User profile/children data
- `src/api/listApi.js` - Group lists and polls
- `src/lib/storage.js` - Local storage utilities

### Database Tables (Supabase)
- `profiles` - User profiles with role (parent/team/admin) and facility assignment
- `children` - Children linked to users and groups
- `groups` - Kindergarten groups (Erde, Sonne, Feuer, Wasser, Blume) with colors/icons
- `facilities` - Daycare facilities
- `news` - Announcements with attachments
- `group_lists` - Lists/polls per group

### Component Structure
- `src/App.jsx` - Main app with tab navigation and auth flow
- `src/components/auth/` - Login, registration, password reset
- `src/components/news/` - News feed and creation
- `src/components/group/` - Group area with lists/polls
- `src/components/food/` - Meal planning (week view)
- `src/components/absence/` - Absence reporting (different views per role)
- `src/components/profile/` - User settings, children management
- `src/components/admin/` - Admin tools, user management, group management

### User Roles
- **parent**: Can view news, report absences, manage their children
- **team**: Can edit food plans, view team absences, manage group content
- **admin**: Full access including user management and facility settings

### Key Patterns
- Session stored in `sessionStorage` under `montessori_session`
- Default registration codes defined in `src/lib/constants.jsx`
- Groups have `is_event_group` flag for special event group handling
- Profile views use sub-navigation pattern (`profileView` state)
