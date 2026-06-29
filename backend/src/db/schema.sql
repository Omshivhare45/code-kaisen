-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auto-update updated_at function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for GIS representation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_departments_modtime
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- USERS TABLE
CREATE TYPE user_role AS ENUM ('Super Admin', 'Nodal Officer', 'Department Admin', 'Department Engineer', 'Citizen', 'Read-only Auditor');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending_verification');

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'Citizen',
    status user_status NOT NULL DEFAULT 'pending_verification',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- DEPARTMENT INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BHOPAL WARDS TABLE (GIS Layer)
CREATE TABLE IF NOT EXISTS bhopal_wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    geometry GEOMETRY(Polygon, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS bhopal_wards_geom_gist ON bhopal_wards USING GIST (geometry);

-- BHOPAL ROADS TABLE (GIS Layer)
CREATE TABLE IF NOT EXISTS bhopal_roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    road_type VARCHAR(50), -- Highway, Arterial, Local
    geometry GEOMETRY(LineString, 4326) NOT NULL,
    last_resurfaced_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS bhopal_roads_geom_gist ON bhopal_roads USING GIST (geometry);

-- DIG PERMITS TABLE
CREATE TYPE permit_status AS ENUM ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Completed');

CREATE TABLE IF NOT EXISTS permits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_number VARCHAR(50) UNIQUE NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    road_name VARCHAR(255) NOT NULL,
    ward VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geometry GEOMETRY(Geometry, 4326) NOT NULL, -- LineString or Polygon representing the dig
    purpose TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    depth DOUBLE PRECISION NOT NULL, -- in meters
    restoration_plan TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    status permit_status NOT NULL DEFAULT 'Draft',
    conflict_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'Low',
    recommendations TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_permits_modtime
    BEFORE UPDATE ON permits
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS permits_geom_gist ON permits USING GIST (geometry);
CREATE INDEX IF NOT EXISTS permits_status_idx ON permits (status);
CREATE INDEX IF NOT EXISTS permits_dept_idx ON permits (department_id);

-- CONFLICTS TABLE
CREATE TABLE IF NOT EXISTS conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    conflicting_permit_id UUID REFERENCES permits(id) ON DELETE CASCADE,
    conflict_type VARCHAR(100) NOT NULL, -- e.g., 'Spatial Proximity', 'Schedule Overlap', 'Recently Resurfaced Road', 'Upcoming Project'
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- JOINT COORDINATION MEETINGS TABLE
CREATE TABLE IF NOT EXISTS coordination_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT NOT NULL,
    decisions TEXT,
    participants JSONB DEFAULT '[]'::jsonb, -- Array of names/emails/depts attending
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CITIZEN COMPLAINTS TABLE
CREATE TYPE complaint_status AS ENUM ('Received', 'Assigned', 'In Progress', 'Resolved', 'Closed');
CREATE TYPE complaint_type AS ENUM ('Pothole', 'Dust', 'Blockage', 'Unsafe trench', 'Road damage', 'Illegal digging');

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    reporter_name VARCHAR(100),
    reporter_email VARCHAR(255),
    reporter_phone VARCHAR(20),
    complaint_type complaint_type NOT NULL,
    description TEXT NOT NULL,
    road_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    geometry GEOMETRY(Point, 4326) NOT NULL,
    status complaint_status NOT NULL DEFAULT 'Received',
    assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    photo_url VARCHAR(500),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    is_escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_complaints_modtime
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE INDEX IF NOT EXISTS complaints_geom_gist ON complaints USING GIST (geometry);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints (status);
CREATE INDEX IF NOT EXISTS complaints_dept_idx ON complaints (assigned_department_id);

-- COMPLAINT HISTORY TABLE (For Audit and SLA tracking)
CREATE TABLE IF NOT EXISTS complaint_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    from_status complaint_status,
    to_status complaint_status NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Null means global/citizen broadcast
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'in-app', 'email', 'sms', 'whatsapp'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications (is_read);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'LOGIN', 'PERMIT_CREATE', 'COMPLAINT_ASSIGN', 'GIS_UPDATE'
    entity_type VARCHAR(100) NOT NULL, -- e.g., 'permits', 'complaints', 'users'
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
