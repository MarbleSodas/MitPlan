/**
 * App-level Toaster. Wraps the shadcn Sonner Toaster so it sits once at
 * the root of the tree (the Toast viewport mounts in document.body).
 */
import { Toaster } from '@/components/ui/sonner';

export const AppToaster = () => <Toaster richColors position="bottom-right" />;