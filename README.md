# SONA

A cyberpunk-themed show tracking dashboard built with Next.js and shadcn/ui.

## Features

- Track shows with detailed information
- Filter by attendance status and year
- Search functionality across shows, cities, and venues
- Beautiful cyberpunk-inspired UI with neon accents
- Responsive design for mobile and desktop
- **Cloud sync** - Data syncs across all devices and browsers via Supabase
- Import from Google Sheets CSV
- Add and edit shows directly in the app

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Supabase** - PostgreSQL database with real-time sync
- **Lucide React** - Icons
- **Vercel Analytics** - Analytics

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier available)

### Installation

1. **Clone the repository** (or use your existing project)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Create a free account at [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and publishable key from Settings → API
   - See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions

4. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_publishable_key_here
   ```

5. **Set up the database:**
   - Go to Supabase SQL Editor
   - Run the migration from `supabase/migrations/001_create_concerts_table.sql`
   - This creates the `shows` table

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
sona/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── shows/         # Shows API endpoints
│   ├── page.tsx           # Main show tracker page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                  # Utility functions
│   ├── shows.ts          # Show type and CSV parser
│   ├── shows-api.ts      # API client functions
│   ├── supabase.ts       # Supabase client
│   └── database.types.ts # Database TypeScript types
└── supabase/             # Database migrations
    └── migrations/       # SQL migration files
```

## Database

This app uses **Supabase** (PostgreSQL) for data storage, enabling:
- ✅ Cloud sync across all devices
- ✅ Real-time updates
- ✅ Secure data storage
- ✅ Free tier available

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for complete setup instructions.

## Importing Data

You can import show data from CSV files in multiple ways:
- **Via App UI**: Use the "Import" button in the app (easiest method)
- **Via Supabase Dashboard**: Direct CSV import in Table Editor
- **Via SQL**: Import using SQL INSERT statements

See [CSV_IMPORT_GUIDE.md](./CSV_IMPORT_GUIDE.md) for detailed import instructions and methods.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

The app will automatically sync with your Supabase database.

## Build

To create a production build:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## License

Private project
