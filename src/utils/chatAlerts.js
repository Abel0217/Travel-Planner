import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import apiClient from '../api/apiClient';
import { db } from '../firebaseConfig';

export async function syncUnseenChatAlerts() {
    try {
        const [tripsResponse, seenResponse] = await Promise.all([
            apiClient.get('/notifications/chat/trips'),
            apiClient.get('/notifications/chat/seen'),
        ]);
        const trips = Array.isArray(tripsResponse.data) ? tripsResponse.data : [];
        const seen = {};
        (seenResponse.data || []).forEach((row) => {
            seen[row.itinerary_id] = new Date(row.seen_at).getTime();
        });
        const cutoff = Date.now() - (48 * 60 * 60 * 1000);

        for (const trip of trips) {
            const itineraryId = trip.itinerary_id;
            if (!itineraryId) continue;
            const snapshot = await getDocs(query(
                collection(db, 'itineraries', String(itineraryId), 'messages'),
                orderBy('timestamp', 'desc'),
                limit(12)
            ));
            const messages = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const when = data.timestamp?.toDate?.() || (data.timestamp ? new Date(data.timestamp) : null);
                if (!when || Number.isNaN(when.getTime()) || when.getTime() < cutoff) return;
                if (seen[itineraryId] && when.getTime() <= seen[itineraryId]) return;
                messages.push({
                    messageId: docSnap.id,
                    text: data.text || '',
                    userId: data.userId || '',
                    userName: data.userName || 'A Traveler',
                    timestamp: when.toISOString(),
                });
            });
            if (messages.length) {
                await apiClient.post('/notifications/chat/sync', { itineraryId, messages });
            }
        }
    } catch (error) {
        console.error('Chat alert sync skipped:', error);
    }
}
