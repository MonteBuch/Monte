-- Enable Realtime for news, groups, and group_lists tables
-- Run this in Supabase SQL Editor or Dashboard

-- Enable Realtime for news table
ALTER PUBLICATION supabase_realtime ADD TABLE news;

-- Enable Realtime for groups table
ALTER PUBLICATION supabase_realtime ADD TABLE groups;

-- Enable Realtime for group_lists table
ALTER PUBLICATION supabase_realtime ADD TABLE group_lists;

-- Alternative: Enable via Supabase Dashboard
-- 1. Go to Database → Replication
-- 2. Find each table (news, groups, group_lists)
-- 3. Toggle "Realtime" on for each
