'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileText,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    Sparkles,
    FileUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';

interface TeacherDocument {
    id: string;
    teacher_id: string;
    filename: string;
    original_name: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
    status: 'uploaded' | 'processing' | 'embedded' | 'failed';
    chunk_count: number;
    created_at: string;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function statusConfig(status: TeacherDocument['status']) {
    switch (status) {
        case 'uploaded':
            return {
                label: 'Yüklendi',
                color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                icon: FileUp,
            };
        case 'processing':
            return {
                label: 'İşleniyor...',
                color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                icon: Loader2,
            };
        case 'embedded':
            return {
                label: 'Hazır',
                color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                icon: CheckCircle2,
            };
        case 'failed':
            return {
                label: 'Hata',
                color: 'bg-red-500/10 text-red-600 border-red-500/20',
                icon: AlertCircle,
            };
    }
}

export default function DocumentsPage() {
    const { user } = useAuthStore();
    const [documents, setDocuments] = useState<TeacherDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch documents ──
    const fetchDocuments = useCallback(async () => {
        if (!user?.id) return;
        try {
            const res = await fetch(`/api/documents?teacherId=${user.id}`);
            const data = await res.json();
            if (res.ok) setDocuments(data.documents || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    // ── Upload file ──
    const uploadFile = async (file: File) => {
        if (!user?.id) return;
        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('teacherId', user.id);

            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Yükleme başarısız');

            // Refresh list
            await fetchDocuments();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Yükleme başarısız');
        } finally {
            setIsUploading(false);
        }
    };

    // ── Embed document ──
    const embedDocument = async (documentId: string) => {
        if (!user?.id) return;
        setError(null);

        // Optimistic update
        setDocuments((prev) =>
            prev.map((d) => (d.id === documentId ? { ...d, status: 'processing' as const } : d))
        );

        try {
            const res = await fetch('/api/documents/embed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId, teacherId: user.id }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Embedding başarısız');

            // Update status
            setDocuments((prev) =>
                prev.map((d) =>
                    d.id === documentId
                        ? { ...d, status: 'embedded' as const, chunk_count: data.chunkCount }
                        : d
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Embedding başarısız');
            setDocuments((prev) =>
                prev.map((d) => (d.id === documentId ? { ...d, status: 'failed' as const } : d))
            );
        }
    };

    // ── Delete document ──
    const deleteDocument = async (documentId: string) => {
        if (!confirm('Bu dökümanı silmek istediğinize emin misiniz?')) return;

        try {
            const res = await fetch(`/api/documents?documentId=${documentId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Silme başarısız');
            }

            setDocuments((prev) => prev.filter((d) => d.id !== documentId));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Silme başarısız');
        }
    };

    // ── Drag & Drop ──
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
        e.target.value = '';
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">📚 Kaynak Dökümanları</h1>
                <p className="text-muted-foreground mt-2">
                    PDF ve metin dosyalarınızı yükleyin. Bu kaynaklar derslerinizi oluştururken referans olarak
                    kullanılacaktır.
                </p>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600"
                    >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="text-sm flex-1">{error}</span>
                        <button onClick={() => setError(null)}>
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Upload Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 mb-8 ${isDragging
                        ? 'border-primary bg-primary/5 scale-[1.01]'
                        : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.docx"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Yükleniyor...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">
                                Dosya sürükleyin veya tıklayın
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                PDF, TXT, Markdown veya DOCX • Maks. 20MB
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Documents List */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Yüklü Dökümanlar ({documents.length})
                </h2>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>Henüz yüklü döküman yok.</p>
                        <p className="text-sm mt-1">Ders kaynaklarınızı yükleyerek başlayın.</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {documents.map((doc) => {
                            const status = statusConfig(doc.status);
                            const StatusIcon = status.icon;

                            return (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors"
                                >
                                    {/* File icon */}
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5 text-primary" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                            {doc.original_name}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            <span>{formatFileSize(doc.file_size)}</span>
                                            {doc.chunk_count > 0 && (
                                                <span>{doc.chunk_count} parça</span>
                                            )}
                                            <span>
                                                {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div
                                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}
                                    >
                                        <StatusIcon
                                            className={`w-3.5 h-3.5 ${doc.status === 'processing' ? 'animate-spin' : ''
                                                }`}
                                        />
                                        {status.label}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {(doc.status === 'uploaded' || doc.status === 'failed') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => embedDocument(doc.id)}
                                                className="gap-1.5 text-xs"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Embedding Oluştur
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteDocument(doc.id)}
                                            className="text-muted-foreground hover:text-red-500 h-8 w-8"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
