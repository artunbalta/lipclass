import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
}

export interface ContactFormData {
    name: string;
    email: string;
    subject: string;
    message: string;
}

/**
 * Submit a contact form message
 * @param formData - The contact form data
 * @returns Object with success status and optional error message
 */
export async function submitContactMessage(formData: ContactFormData): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data, error } = await supabase
            .from('contact_messages')
            .insert({
                name: formData.name.trim(),
                email: formData.email.toLowerCase().trim(),
                subject: formData.subject.trim(),
                message: formData.message.trim(),
            })
            .select()
            .single();

        if (error) {
            return {
                success: false,
                error: 'Mesajınız gönderilemedi. Lütfen tekrar deneyin.',
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
