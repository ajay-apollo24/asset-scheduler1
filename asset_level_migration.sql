-- Add asset level column
ALTER TABLE assets ADD COLUMN level TEXT NOT NULL DEFAULT 'secondary' CHECK (level IN ('primary', 'secondary', 'tertiary'));

-- Create index for level-based queries
CREATE INDEX IF NOT EXISTS idx_assets_level ON assets(level);

-- Update existing assets with appropriate levels (example)
-- UPDATE assets SET level = 'primary' WHERE name LIKE '%home%' OR name LIKE '%app%';
-- UPDATE assets SET level = 'tertiary' WHERE name LIKE '%post%' OR name LIKE '%success%'; 