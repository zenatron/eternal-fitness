-- Fix inflated achievement points caused by replaceAll cascade bug
-- Recalculates each user's points from their actually-unlocked achievements
-- and adds 100 XP per completed workout session.

-- Run this in your database:
-- psql $DATABASE_URL -f scripts/fix-points.sql
-- Or: bun run scripts/fix-points.ts

DO $$
DECLARE
    rec RECORD;
    achievements_json JSONB;
    unlocked_ids TEXT[];
    achievement_id TEXT;
    correct_points INTEGER := 0;
    workout_count INTEGER;
BEGIN
    FOR rec IN SELECT u.id, us.achievements, us.total_workouts
               FROM users u
               LEFT JOIN user_stats us ON us.user_id = u.id
    LOOP
        correct_points := 0;
        
        -- Points from unlocked achievements
        IF rec.achievements IS NOT NULL AND rec.achievements ? 'unlockedAchievements' THEN
            unlocked_ids := ARRAY(SELECT jsonb_array_elements_text(rec.achievements->'unlockedAchievements'));
            FOREACH achievement_id IN ARRAY unlocked_ids
            LOOP
                -- Map achievement IDs to correct 10x point values
                CASE 
                    WHEN achievement_id LIKE '%bronze' THEN correct_points := correct_points + 500;
                    WHEN achievement_id LIKE '%silver' THEN correct_points := correct_points + 1000;
                    WHEN achievement_id LIKE '%gold' THEN correct_points := correct_points + 2500;
                    WHEN achievement_id LIKE '%platinum' THEN correct_points := correct_points + 5000;
                    WHEN achievement_id LIKE '%diamond' THEN correct_points := correct_points + 10000;
                    ELSE correct_points := correct_points + 0;
                END CASE;
            END LOOP;
        END IF;
        
        -- Points from workout completions (100 XP each)
        IF rec.total_workouts IS NOT NULL AND rec.total_workouts > 0 THEN
            correct_points := correct_points + (rec.total_workouts * 100);
        END IF;
        
        -- Update user's points to the correct total
        UPDATE users SET points = correct_points WHERE id = rec.id;
        
        RAISE NOTICE 'User %: corrected points to % (was %)', rec.id, correct_points, 
            (SELECT points FROM users WHERE id = rec.id);
    END LOOP;
END $$;
