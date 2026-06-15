import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            }
        }
    });
    return { data, error };
};

export const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

export const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
};

// Profile helpers
export const getUserProfile = async (userId: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
};

export const updateSecurityPin = async (userId: string, pin: string | null, enabled: boolean) => {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            security_pin: pin,
            pin_enabled: enabled,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    return { data, error };
};
export const resetPasswordForEmail = async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
    });
    return { data, error };
};

export const updateUserPassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    return { data, error };
};

// Profile & Avatar helpers
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
    const { data, error } = await supabase
        .from('profiles')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
    return { data, error };
};

export const uploadAvatar = async (userId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to 'avatars' bucket
    const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

    if (uploadError) return { data: null, error: uploadError };

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

    // Update profile
    const { error: updateError } = await updateUserProfile(userId, { avatar_url: publicUrl });

    return { data: { publicUrl }, error: updateError };
};
