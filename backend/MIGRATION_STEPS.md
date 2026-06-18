# 🚀 Migration Steps: Moving to Supabase

Follow these steps to migrate the Gym Management System database from the local `db.json` to a live production-ready Supabase PostgreSQL instance.

---

## 📋 Prerequisites
Ensure you have a Supabase account. If you don't, sign up at [supabase.com](https://supabase.com).

---

## 🛠️ Step-by-Step Instructions

### Step 1: Create a Supabase Project
1. Log in to your Supabase dashboard and click **New Project**.
2. Select your Organization, set a Project Name (e.g., `ABC Fitness System`), set a secure database password, and choose your preferred region.
3. Wait for the project to finish provisioning.

### Step 2: Apply the SQL Database Schema
1. In the Supabase sidebar, click on **SQL Editor**.
2. Click **New query** (or **New Query Blank**).
3. Copy the entire contents of [backend/supabase/schema.sql](file:///Users/rishwanthvemula/Downloads/gym-management-system/gym-management-system/backend/supabase/schema.sql).
4. Paste the SQL statements into the query editor window.
5. Click the **Run** button at the bottom right.
   * You should see `Success: No rows returned` which confirms all tables, triggers, indexes, and constraints are successfully created.

### Step 3: Configure Environment Variables
Create or update the `.env` file in the `backend/` directory:

```env
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-from-settings
SUPABASE_KEY=your-anon-or-service-role-key
REDIS_ENABLED=false
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
```

> [!IMPORTANT]
> To find your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`:
> 1. In Supabase, go to **Project Settings** (gear icon) -> **API**.
> 2. Copy the **Project URL** (use as `SUPABASE_URL`).
> 3. Copy the **service_role** key (use as `SUPABASE_SERVICE_ROLE_KEY` & `SUPABASE_KEY`).

---

### Step 4: Seed Existing Data from `db.json`
We have prepared a migration script that parses all records from the local database backup (`db.json`) and inserts them in proper relational order.

> [!NOTE]
> Make sure your terminal is inside the `backend` directory (e.g., `cd /Users/rishwanthvemula/Downloads/gym-management-system/gym-management-system/backend` or navigate using `cd ../..` if you are currently inside `src/validators/ABC`).

Run the following commands in your shell terminal:
```bash
npm run seed:supabase
```

This will output details about the number of inserted users, gyms, settings, members, and check-in logs.

---

### Step 5: Start the Backend Server
Now that the database is configured, start the Node.js/Express development server:
```bash
npm run dev
```

The system will connect directly to the live PostgreSQL tables, and your dashboard widgets will immediately display your active members and attendance stats in real-time.
