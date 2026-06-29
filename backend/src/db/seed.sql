-- Seed Departments
INSERT INTO departments (id, name, slug, color) VALUES
('d1a34b6c-c69e-4e4f-b648-527e7f607101', 'Public Works Department', 'pwd', '#EF4444'),
('d1a34b6c-c69e-4e4f-b648-527e7f607102', 'Jal Sansadhan (Water Resources)', 'jal-sansadhan', '#3B82F6'),
('d1a34b6c-c69e-4e4f-b648-527e7f607103', 'Madhya Pradesh Discom', 'discom', '#F59E0B'),
('d1a34b6c-c69e-4e4f-b648-527e7f607104', 'Gas Authority (GAIL)', 'gas-authority', '#10B981'),
('d1a34b6c-c69e-4e4f-b648-527e7f607105', 'BSNL / Telecom', 'telecom', '#8B5CF6'),
('d1a34b6c-c69e-4e4f-b648-527e7f607106', 'Bhopal Metro & Smart City', 'metro-smartcity', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- Seed Users
-- Passwords are bcrypt hash for 'password123': $2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, department_id) VALUES
('u1a34b6c-c69e-4e4f-b648-527e7f607201', 'admin@setu.gov.in', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Alok', 'Sharma', 'Super Admin', 'active', NULL),
('u1a34b6c-c69e-4e4f-b648-527e7f607202', 'nodal@setu.gov.in', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Sanjay', 'Verma', 'Nodal Officer', 'active', NULL),
('u1a34b6c-c69e-4e4f-b648-527e7f607203', 'pwd.admin@setu.gov.in', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Rajesh', 'Kumar', 'Department Admin', 'active', 'd1a34b6c-c69e-4e4f-b648-527e7f607101'),
('u1a34b6c-c69e-4e4f-b648-527e7f607204', 'pwd.eng@setu.gov.in', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Amit', 'Patel', 'Department Engineer', 'active', 'd1a34b6c-c69e-4e4f-b648-527e7f607101'),
('u1a34b6c-c69e-4e4f-b648-527e7f607205', 'jal.admin@setu.gov.in', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Vijay', 'Singh', 'Department Admin', 'active', 'd1a34b6c-c69e-4e4f-b648-527e7f607102'),
('u1a34b6c-c69e-4e4f-b648-527e7f607206', 'discom.eng@setu.gov.in', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Rahul', 'Mishra', 'Department Engineer', 'active', 'd1a34b6c-c69e-4e4f-b648-527e7f607103'),
('u1a34b6c-c69e-4e4f-b648-527e7f607207', 'auditor@setu.gov.in', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Sunita', 'Joshi', 'Read-only Auditor', 'active', NULL),
('u1a34b6c-c69e-4e4f-b648-527e7f607208', 'citizen@gmail.com', '$2a$10$0M40e3wVwQe/eKvxK17sUOmH1rN6Uv57J17JbeV6X5n.44mXj6lI2', 'Rohan', 'Gupta', 'Citizen', 'active', NULL)
ON CONFLICT (email) DO NOTHING;

-- Seed Wards
INSERT INTO bhopal_wards (name, geometry) VALUES
('Maharana Pratap Nagar', ST_GeomFromText('POLYGON((77.425 23.235, 77.445 23.235, 77.445 23.220, 77.425 23.220, 77.425 23.235))', 4326)),
('Arera Colony', ST_GeomFromText('POLYGON((77.420 23.218, 77.440 23.218, 77.440 23.200, 77.420 23.200, 77.420 23.218))', 4326)),
('TT Nagar', ST_GeomFromText('POLYGON((77.395 23.245, 77.415 23.245, 77.415 23.230, 77.395 23.230, 77.395 23.245))', 4326)),
('Indrapuri', ST_GeomFromText('POLYGON((77.450 23.260, 77.470 23.260, 77.470 23.245, 77.450 23.245, 77.450 23.260))', 4326)),
('Kolar Road', ST_GeomFromText('POLYGON((77.400 23.190, 77.420 23.190, 77.420 23.150, 77.400 23.150, 77.400 23.190))', 4326))
ON CONFLICT (name) DO NOTHING;

-- Seed Roads
INSERT INTO bhopal_roads (name, road_type, geometry, last_resurfaced_at) VALUES
('Link Road 1', 'Arterial', ST_GeomFromText('LINESTRING(77.398 23.240, 77.415 23.235, 77.428 23.230)', 4326), CURRENT_TIMESTAMP - INTERVAL '3 months'),
('Hoshangabad Road', 'Highway', ST_GeomFromText('LINESTRING(77.435 23.230, 77.445 23.210, 77.460 23.180)', 4326), CURRENT_TIMESTAMP - INTERVAL '14 months'),
('Hamidia Road', 'Arterial', ST_GeomFromText('LINESTRING(77.400 23.265, 77.412 23.260, 77.425 23.262)', 4326), CURRENT_TIMESTAMP - INTERVAL '5 months'),
('Kolar Main Road', 'Local', ST_GeomFromText('LINESTRING(77.410 23.190, 77.408 23.170, 77.405 23.150)', 4326), CURRENT_TIMESTAMP - INTERVAL '18 months')
ON CONFLICT (name) DO NOTHING;
