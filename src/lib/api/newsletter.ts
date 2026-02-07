import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface NewsletterSubscription {
    id: string;
    email: string;
    created_at: string;
}

/**
 * Subscribe an email to the newsletter
 * @param email - The email address to subscribe
 * @returns Object with success status and optional error message
 */
export async function subscribeToNewsletter(email: string): Promise<{
    success: boolean;
    error?: string;
    alreadySubscribed?: boolean;
}> {
    try {
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .insert({ email: email.toLowerCase().trim() })
            .select()
            .single();

        if (error) {
            // Check for unique constraint violation (duplicate email)
            if (error.code === '23505') {
                return {
                    success: false,
                    error: 'Bu e-posta adresi zaten kayıtlı.',
                    alreadySubscribed: true,
                };
            }

            return {
                success: false,
                error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
            };
        }

        return { success: true };
    } catch {
        return {
            success: false,
            error: 'Bağlantı hatası. Lütfen tekrar deneyin.',
        };
    }
}
