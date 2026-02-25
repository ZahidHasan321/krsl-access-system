CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN indexes for trigram similarity search
CREATE INDEX IF NOT EXISTS people_name_trgm_idx ON people USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS people_code_no_trgm_idx ON people USING GIN (code_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS people_company_trgm_idx ON people USING GIN (company gin_trgm_ops);

-- Add GIN indexes for vehicles
CREATE INDEX IF NOT EXISTS vehicles_number_trgm_idx ON vehicles USING GIN (vehicle_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS vehicles_driver_trgm_idx ON vehicles USING GIN (driver_name gin_trgm_ops);
