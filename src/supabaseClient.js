import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hzhgfefcuuhvdyyitohm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aGdmZWZjdXVodmR5eWl0b2htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MDc0MTgsImV4cCI6MjA1MjI4MzQxOH0.mMjtGaTd92yXa1epKR6w_94CeI59E8g2PDC4h1DXsJs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);