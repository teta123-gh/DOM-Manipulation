CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (merged with auth fields)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'user' or 'admin'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    published BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Promos table
CREATE TABLE IF NOT EXISTS promos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    video_url text NOT NULL,
    caption_text text,
    published boolean DEFAULT true,
    created_by uuid DEFAULT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,                -- e.g., event, promo, system
    recipient_id uuid DEFAULT NULL,    -- optional: specific user; null = broadcast
    metadata jsonb DEFAULT '{}',       -- store additional info (event_id, location, etc.)
    read boolean DEFAULT false,        -- per notification
    created_by uuid DEFAULT NULL,      -- user who created the notification
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Event registration table
CREATE TABLE event_registrations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES users(id),
    event_id uuid REFERENCES events(id),
    status VARCHAR(50) DEFAULT 'registered',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, event_id)
);

-- Feedback table
CREATE TABLE IF NOT EXISTS event_feedback (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, event_id) -- one feedback per user per event
);