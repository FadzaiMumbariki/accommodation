import { supabase } from '../supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Profiles & Push Tokens
// ─────────────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: 'tenant' | 'landlord';
  verified: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, avatar_url, role, verified, is_admin, created_at')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[fetchProfile]', error.message);
    return null;
  }
  return data
    ? {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        avatarUrl: data.avatar_url,
        role: data.role === 'landlord' ? 'landlord' : 'tenant',
        verified: data.verified,
        isAdmin: Boolean(data.is_admin),
        createdAt: data.created_at,
      }
    : null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'fullName' | 'phone' | 'avatarUrl' | 'role'>>,
): Promise<boolean> {
  if (!supabase) return false;

  const updateFields: Record<string, unknown> = {};
  if (updates.fullName !== undefined) updateFields.full_name = updates.fullName;
  if (updates.phone !== undefined) updateFields.phone = updates.phone;
  if (updates.avatarUrl !== undefined) updateFields.avatar_url = updates.avatarUrl;
  if (updates.role !== undefined) updateFields.role = updates.role;

  // Try direct update first
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update(updateFields)
    .eq('id', userId)
    .select('id');

  if (!updateError && data && data.length > 0) {
    if (updates.role !== undefined) {
      void supabase.auth.updateUser({ data: { role: updates.role } }).catch(() => {});
    }
    return true;
  }

  // Fallback to upsert if profile row did not exist yet
  const payload: Record<string, unknown> = { id: userId, ...updateFields };
  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[updateProfile]', error.message);
    return false;
  }

  if (updates.role !== undefined) {
    void supabase.auth.updateUser({ data: { role: updates.role } }).catch(() => {});
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin verification queue (admin-controlled verified badges)
// ─────────────────────────────────────────────────────────────────────────────

export interface VerifiableProperty {
  id: string;
  title: string;
  city: string;
  suburb: string;
  imageUrl: string | null;
  verified: boolean;
  createdAt: string;
  landlordName: string | null;
  landlordPhone: string | null;
}

export interface VerifiableLandlord {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  verified: boolean;
  createdAt: string;
}

/**
 * Lists the newest listings for the verification queue. Requires an admin session;
 * the `Admins can read all properties` policy exposes rows beyond the public feed.
 */
export async function fetchVerifiableProperties(limit = 100): Promise<VerifiableProperty[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('properties')
    .select(
      'id, title, city, suburb, images, verified, created_at, landlord:profiles!properties_landlord_id_fkey(full_name, phone)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[fetchVerifiableProperties]', error.message);
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => {
    const landlord = Array.isArray(row.landlord) ? row.landlord[0] : row.landlord;
    return {
      id: row.id as string,
      title: row.title as string,
      city: row.city as string,
      suburb: row.suburb as string,
      imageUrl: Array.isArray(row.images) && row.images.length ? (row.images[0] as string) : null,
      verified: Boolean(row.verified),
      createdAt: row.created_at as string,
      landlordName: landlord?.full_name ?? null,
      landlordPhone: landlord?.phone ?? null,
    };
  });
}

/** Lists landlord accounts for the verification queue. Requires an admin session. */
export async function fetchVerifiableLandlords(limit = 100): Promise<VerifiableLandlord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, avatar_url, verified, created_at')
    .eq('role', 'landlord')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[fetchVerifiableLandlords]', error.message);
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    fullName: row.full_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    avatarUrl: row.avatar_url ?? null,
    verified: Boolean(row.verified),
    createdAt: row.created_at as string,
  }));
}

export async function setPropertyVerified(propertyId: string, verified: boolean): Promise<void> {
  if (!supabase) throw new Error('Verification requires a Supabase connection.');
  const { error } = await supabase.rpc('admin_set_property_verified', {
    p_property_id: propertyId,
    p_verified: verified,
  });
  if (error) {
    console.error('[setPropertyVerified]', error.message);
    throw new Error(error.message);
  }
}

export async function setUserVerified(userId: string, verified: boolean): Promise<void> {
  if (!supabase) throw new Error('Verification requires a Supabase connection.');
  const { error } = await supabase.rpc('admin_set_user_verified', {
    p_user_id: userId,
    p_verified: verified,
  });
  if (error) {
    console.error('[setUserVerified]', error.message);
    throw new Error(error.message);
  }
}

export async function savePushToken(userId: string, pushToken: string): Promise<void> {
  if (!supabase) throw new Error('Push token storage requires a Supabase connection.');
  const { data, error } = await supabase
    .from('profiles')
    .update({ push_token: pushToken })
    .eq('id', userId)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[savePushToken]', error.message);
    throw error;
  }
  if (!data) throw new Error('Could not save the notification token for this account.');
}

export async function clearPushToken(userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
  if (error) {
    console.error('[clearPushToken]', error.message);
    throw error;
  }
}

export type DocumentType =
  'national_id' | 'passport' | 'title_deed' | 'utility_bill' | 'management_mandate';

export interface VerificationRequestInput {
  documentType: DocumentType;
  documentUrl: string;
  notes?: string;
}

export interface VerificationRequestStatus {
  status: 'unverified' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  adminNotes?: string;
}

export async function submitVerificationRequest(
  userId: string,
  input: VerificationRequestInput,
): Promise<void> {
  if (!supabase) throw new Error('Document verification requires a Supabase connection.');
  const { error } = await supabase.from('verification_requests').insert({
    user_id: userId,
    document_type: input.documentType,
    document_url: input.documentUrl,
    document_notes: input.notes?.trim() || null,
  });
  if (error) {
    console.error('[submitVerificationRequest]', error.message);
    throw new Error(error.message);
  }
}

export async function fetchMyVerificationStatus(
  userId: string,
): Promise<VerificationRequestStatus> {
  if (!supabase) return { status: 'unverified' };
  const { data, error } = await supabase
    .from('verification_requests')
    .select('status, created_at, admin_notes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[fetchMyVerificationStatus]', error.message);
    return { status: 'unverified' };
  }
  if (!data) return { status: 'unverified' };

  return {
    status: data.status as VerificationRequestStatus['status'],
    submittedAt: data.created_at,
    adminNotes: data.admin_notes ?? undefined,
  };
}
