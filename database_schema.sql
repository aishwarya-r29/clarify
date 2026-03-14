-- Clarify Database Schema
-- Compatible with Supabase/PostgreSQL

-- Profiles table
CREATE TABLE profiles (
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

-- Posts table (for both general posts and questions)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    author_email TEXT,
    author_name TEXT,
    author_avatar_url TEXT,
    title TEXT,
    content TEXT,
    type TEXT DEFAULT 'general', -- 'general', 'question', or NULL for backwards compatibility
    tag TEXT,
    department TEXT,
    year TEXT,
    likes_count INTEGER DEFAULT 0,
    upvotes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post replies table
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

-- Resources table
CREATE TABLE resources (
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

-- Events table
CREATE TABLE events (
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

-- Indexes for better performance
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_tag ON posts(tag);
CREATE INDEX idx_posts_department ON posts(department);

CREATE INDEX idx_post_replies_post_id ON post_replies(post_id);
CREATE INDEX idx_post_replies_user_id ON post_replies(user_id);
CREATE INDEX idx_post_replies_created_at ON post_replies(created_at DESC);

CREATE INDEX idx_resources_uploader_id ON resources(uploader_id);
CREATE INDEX idx_resources_created_at ON resources(created_at DESC);
CREATE INDEX idx_resources_tag ON resources(tag);
CREATE INDEX idx_resources_department ON resources(department);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_event_date ON events(event_date ASC);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_department ON events(department);

-- RLS (Row Level Security) Policies
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Profiles policies - More permissive for development
CREATE POLICY "Enable insert for authenticated users" ON profiles FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on user_id" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable read for users based on user_id" ON profiles FOR SELECT USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "Enable insert for authenticated users" ON posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on user_id" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable read for all users" ON posts FOR SELECT USING (true);
CREATE POLICY "Enable delete for users based on user_id" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Post replies policies
CREATE POLICY "Enable insert for authenticated users" ON post_replies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on user_id" ON post_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Enable read for all users" ON post_replies FOR SELECT USING (true);
CREATE POLICY "Enable delete for users based on user_id" ON post_replies FOR DELETE USING (auth.uid() = user_id);

-- Resources policies
CREATE POLICY "Enable insert for authenticated users" ON resources FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on uploader_id" ON resources FOR UPDATE USING (auth.uid() = uploader_id);
CREATE POLICY "Enable read for all users" ON resources FOR SELECT USING (true);
CREATE POLICY "Enable delete for users based on uploader_id" ON resources FOR DELETE USING (auth.uid() = uploader_id);

-- Events policies
CREATE POLICY "Enable insert for authenticated users" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users based on organizer_id" ON events FOR UPDATE USING (auth.uid() = organizer_id);
CREATE POLICY "Enable read for all users" ON events FOR SELECT USING (true);
CREATE POLICY "Enable delete for users based on organizer_id" ON events FOR DELETE USING (auth.uid() = organizer_id);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars - More permissive
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_post_replies_updated_at BEFORE UPDATE ON post_replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
