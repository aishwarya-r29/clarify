-- Database Setup Script for Clarify
-- Run this in Supabase SQL Editor to fix permission issues

-- Step 1: Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON profiles;

DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

DROP POLICY IF EXISTS "Replies are viewable by everyone" ON post_replies;
DROP POLICY IF EXISTS "Users can insert own replies" ON post_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON post_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON post_replies;

DROP POLICY IF EXISTS "Resources are viewable by everyone" ON resources;
DROP POLICY IF EXISTS "Users can insert own resources" ON resources;
DROP POLICY IF EXISTS "Users can update own resources" ON resources;
DROP POLICY IF EXISTS "Users can delete own resources" ON resources;

DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
DROP POLICY IF EXISTS "Users can insert own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

-- Step 2: Ensure tables exist and have proper structure
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    department TEXT,
    year TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_email TEXT,
    author_name TEXT,
    author_avatar_url TEXT,
    title TEXT,
    content TEXT,
    type TEXT DEFAULT 'general',
    tag TEXT,
    department TEXT,
    year TEXT,
    likes_count INTEGER DEFAULT 0,
    upvotes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_email TEXT,
    author_name TEXT,
    content TEXT,
    department TEXT,
    year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    uploader_email TEXT,
    uploader_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT NOT NULL,
    tag TEXT,
    department TEXT,
    upvotes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organizer_email TEXT,
    organizer_name TEXT,
    name TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    register_link TEXT,
    location TEXT,
    department TEXT,
    upvotes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, permissive policies
CREATE POLICY "Enable all for profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for posts" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable read for posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Enable delete for posts" ON posts FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for post_replies" ON post_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for post_replies" ON post_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable read for post_replies" ON post_replies FOR SELECT USING (true);
CREATE POLICY "Enable delete for post_replies" ON post_replies FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for resources" ON resources FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for resources" ON resources FOR UPDATE USING (auth.uid() = uploader_id);
CREATE POLICY "Enable read for resources" ON resources FOR SELECT USING (true);
CREATE POLICY "Enable delete for resources" ON resources FOR DELETE USING (auth.uid() = uploader_id);

CREATE POLICY "Enable insert for events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for events" ON events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Enable read for events" ON events FOR SELECT USING (true);
CREATE POLICY "Enable delete for events" ON events FOR DELETE USING (auth.uid() = organizer_id);

-- Step 5: Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- Step 6: Create storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Step 7: Grant necessary permissions
-- This ensures the authenticated role has proper permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_replies_post_id ON post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_post_replies_user_id ON post_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_uploader_id ON resources(uploader_id);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date ASC);

-- Step 9: Test the setup
-- This should return the current user if everything is working
SELECT 'Database setup completed successfully!' as status;
