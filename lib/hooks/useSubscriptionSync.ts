import { useEffect, useRef } from 'react';
import { settingsStore, parseEnvSubscriptions } from '@/lib/store/settings-store';
import { fetchSourcesFromUrl, mergeSources } from '@/lib/utils/source-import-utils';

export function useSubscriptionSync() {
    const hasSyncedRef = useRef(false);

    useEffect(() => {
        if (hasSyncedRef.current) return;
        hasSyncedRef.current = true;

        const sync = async () => {
            let settings = settingsStore.getSettings();
            let anyChanged = false;

            // Fetch runtime config for subscription sources (to support Docker)
            try {
                const res = await fetch('/api/config');
                const config = await res.json();
                if (config.subscriptionSources) {
                    const runtimeSubs = parseEnvSubscriptions(config.subscriptionSources);

                    // Merge runtime subscriptions if not already in settings
                    const currentSubs = [...settings.subscriptions];
                    let subsAdded = false;

                    runtimeSubs.forEach(rSub => {
                        const exists = currentSubs.some(s => s.url === rSub.url);
                        if (!exists) {
                            currentSubs.push({
                                ...rSub,
                                autoRefresh: true
                            });
                            subsAdded = true;
                            anyChanged = true;
                        }
                    });

                    if (subsAdded) {
                        settings = {
                            ...settings,
                            subscriptions: currentSubs
                        };
                    }
                }
            } catch (e) {
                console.error('Failed to fetch runtime config', e);
            }

            const subscriptions = settings.subscriptions.filter(s => s.autoRefresh !== false);

            if (subscriptions.length === 0) {
                if (anyChanged) {
                    settingsStore.saveSettings(settings);
                }
                return;
            }

            let currentSources = [...settings.sources];
            let currentAdultSources = [...settings.adultSources];
            let updatedSubscriptions = [...settings.subscriptions];

            for (let i = 0; i < subscriptions.length; i++) {
                const sub = subscriptions[i];
                try {
                    const result = await fetchSourcesFromUrl(sub.url);

                    if (result.normalSources.length > 0) {
                        currentSources = mergeSources(currentSources, result.normalSources);
                        anyChanged = true;
                    }

                    if (result.adultSources.length > 0) {
                        currentAdultSources = mergeSources(currentAdultSources, result.adultSources);
                        anyChanged = true;
                    }

                    // Update timestamp
                    const subIdx = updatedSubscriptions.findIndex(s => s.id === sub.id);
                    if (subIdx !== -1) {
                        updatedSubscriptions[subIdx] = {
                            ...updatedSubscriptions[subIdx],
                            lastUpdated: Date.now()
                        };
                    }
                } catch (e) {
                    console.error(`Failed to sync subscription: ${sub.name}`, e);
                }
            }

            if (anyChanged) {
                settingsStore.saveSettings({
                    ...settings,
                    sources: currentSources,
                    adultSources: currentAdultSources,
                    subscriptions: updatedSubscriptions
                });
            }
        };

        sync();
    }, []);
}
