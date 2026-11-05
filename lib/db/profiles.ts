import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../supabase';
import { generateUuid } from './types';

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

export interface PendingVerificationRequest {
  id: string;
  userId: string;
  documentType: DocumentType;
  documentUrl: string;
  documentNotes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes: string | null;
  createdAt: string;
  applicantName: string | null;
  applicantPhone: string | null;
  applicantEmail: string | null;
}

/**
 * Uploads an identity document (national ID, passport, title deed) to the private
 * `verification-documents` bucket. Returns the storage path (not a public URL)
 * so it cannot be accessed without an authorized signed URL.
 */
export async function uploadVerificationDocument(userId: string, uri: string): Promise<string> {
  if (!supabase) throw new Error('Document uploads require a Supabase connection.');
  let body: ArrayBuffer;
  try {
    const manipulator = ImageManipulator.ImageManipulator.manipulate(uri);
    const original = await manipulator.renderAsync();
    let image = original;
    if (original.width > 1600) {
      manipulator.reset().resize({ width: 1600 });
      image = await manipulator.renderAsync();
    }
    const compressed = await image.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.75,
    });
    const response = await fetch(compressed.uri);
    if (!response.ok) throw new Error('Could not prepare document for upload.');
    body = await response.arrayBuffer();
  } catch (manipulatorError) {
    console.warn('[uploadVerificationDocument] Manipulator fallback:', manipulatorError);
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Could not prepare document for upload.');
    body = await response.arrayBuffer();
  }

  const path = `${userId}/${generateUuid()}.jpg`;
  const { error } = await supabase.storage
    .from('verification-documents')
    .upload(path, body, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    console.error('[uploadVerificationDocument]', error.message);
    throw error;
  }

  return path;
}

/**
 * Generates a short-lived signed URL to view a private verification document.
 * Returns null if the Supabase connection or path is invalid.
 */
export async function getVerificationDocumentSignedUrl(
  filePathOrUrl: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!supabase || !filePathOrUrl) return null;
  const path = filePathOrUrl.includes('verification-documents/')
    ? filePathOrUrl.split('verification-documents/')[1]?.split('?')[0]
    : filePathOrUrl;

  if (!path) return null;

  const { data, error } = await supabase.storage
    .from('verification-documents')
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('[getVerificationDocumentSignedUrl]', error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Deletes a sensitive verification document from storage after review to uphold data privacy.
 */
export async function deleteVerificationDocument(filePathOrUrl: string): Promise<void> {
  if (!supabase || !filePathOrUrl) return;
  const path = filePathOrUrl.includes('verification-documents/')
    ? filePathOrUrl.split('verification-documents/')[1]?.split('?')[0]
    : filePathOrUrl;

  if (!path) return;

  const { error } = await supabase.storage.from('verification-documents').remove([path]);

  if (error) {
    console.warn('[deleteVerificationDocument]', error.message);
  }
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

/**
 * Lists pending verification requests with landlord applicant details for admin review.
 */
export async function fetchPendingVerificationRequests(
  limit = 100,
): Promise<PendingVerificationRequest[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('verification_requests')
    .select(
      'id, user_id, document_type, document_url, document_notes, status, admin_notes, created_at, profile:profiles!verification_requests_user_id_fkey(full_name, phone, email)',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[fetchPendingVerificationRequests]', error.message);
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      documentType: row.document_type as DocumentType,
      documentUrl: row.document_url as string,
      documentNotes: (row.document_notes as string) ?? null,
      status: row.status as 'pending',
      adminNotes: (row.admin_notes as string) ?? null,
      createdAt: row.created_at as string,
      applicantName: profile?.full_name ?? null,
      applicantPhone: profile?.phone ?? null,
      applicantEmail: profile?.email ?? null,
    };
  });
}

/**
 * Admin action: reviews an identity verification request.
 * Sets the decision ('approved' | 'rejected'), marks landlord verified if approved,
 * and deletes the stored document to prevent retaining sensitive PII in storage.
 */
export async function reviewVerificationRequest(params: {
  requestId: string;
  userId: string;
  decision: 'approved' | 'rejected';
  adminNotes?: string;
  documentUrl?: string;
}): Promise<void> {
  if (!supabase) throw new Error('Verification review requires a Supabase connection.');

  const { error: updateError } = await supabase
    .from('verification_requests')
    .update({
      status: params.decision,
      admin_notes: params.adminNotes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.requestId);

  if (updateError) {
    console.error('[reviewVerificationRequest]', updateError.message);
    throw new Error(updateError.message);
  }

  if (params.decision === 'approved') {
    await setUserVerified(params.userId, true);
  }

  // Delete sensitive identity document from storage after decision is made
  if (params.documentUrl) {
    await deleteVerificationDocument(params.documentUrl);
  }
}
