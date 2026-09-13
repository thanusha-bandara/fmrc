import { db } from "../db/offlineDB";
import apiClient from "./client";

export const syncOfflineData = async () => {
    if (!navigator.onLine) return;

    try {
        const queue = await db.syncQueue.toArray();
        if (queue.length === 0) {
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'synced' }));
            return;
        }

        console.log(`Syncing ${queue.length} offline requests...`);
        window.dispatchEvent(new CustomEvent('sync-status', { detail: 'syncing' }));

        for (const item of queue) {
            try {
                await apiClient({
                    url: item.url,
                    method: item.method,
                    data: item.body ? JSON.parse(item.body) : undefined,
                    headers: item.headers,
                    __isSync: true // Bypass the offline interceptor if this fails again
                });
                // Remove from queue upon success
                await db.syncQueue.delete(item.id);
            } catch (err) {
                console.error("Failed to sync item", item, err);
                // If it fails due to network, it will stay in DB for next time.
                // If it fails with 4xx/5xx, you might want to handle it (or delete it to avoid endless loops).
            }
        }
        
        const remaining = await db.syncQueue.count();
        if (remaining === 0) {
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'synced' }));
        } else {
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
        }

    } catch (err) {
        console.error("Error accessing offline DB during sync", err);
        window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
    }
};
