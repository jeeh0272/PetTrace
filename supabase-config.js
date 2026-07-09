// supabase-config.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://urysciyjkceriadtjomn.supabase.co'
const supabaseKey = 'sb_publishable_yIipuUTmBx_GRUP9YUy8Vg_YHw3T7Qw'

export const supabase = createClient(supabaseUrl, supabaseKey)
