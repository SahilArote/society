import { useEffect, useRef } from 'react';
import { initResidentSocket } from '../services/socket';
import { fetchVisitorRequests } from '../services/api';
import { triggerDevicePushNotification } from '../services/notificationService';
import { authSession } from '../services/authSession';

export function useVisitorPushListener() {
  const seenRequestIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const currentUser = authSession.getUser();
    const residentId = currentUser?.id || 'res_sahil';

    // Handler for a newly discovered pending request
    const handleNewVisitor = (item: any) => {
      if (!item || !item.id) return;
      if (seenRequestIdsRef.current.has(item.id)) return;

      seenRequestIdsRef.current.add(item.id);

      // Only trigger notification sound & push if it's NOT the initial startup scan
      if (!isInitialLoadRef.current) {
        triggerDevicePushNotification({
          id: item.id,
          name: item.visitor?.name || item.name || 'Visitor',
          purpose: item.visitor?.purpose || item.purpose || 'Personal',
          gate: item.gate || 'Main Gate',
          flatNumber: item.flatNumber || currentUser?.flat || 'A-402',
          photoUrl: item.visitor?.photoUrl || item.visitor?.photo || item.photoUrl,
          requestedAt: item.requestedAt || new Date(),
        });
      }
    };

    // 1. Initial and recurring check
    const checkRequests = () => {
      fetchVisitorRequests().then((apiData) => {
        if (apiData && Array.isArray(apiData)) {
          const pending = apiData.filter((r: any) => r.status === 'PENDING');
          pending.forEach((r: any) => {
            handleNewVisitor(r);
          });
          // Mark initial load finished after first successful check
          if (isInitialLoadRef.current) {
            isInitialLoadRef.current = false;
          }
        }
      });
    };

    checkRequests();
    const interval = setInterval(checkRequests, 3000);

    // 2. Real-time Socket Listener
    initResidentSocket(
      residentId,
      (newVisitorData) => {
        if (newVisitorData && newVisitorData.request) {
          handleNewVisitor({
            id: newVisitorData.request.id,
            visitor: newVisitorData.visitor,
            flatNumber: newVisitorData.flatNumber,
            gate: newVisitorData.request.gate || 'Main Gate',
            requestedAt: newVisitorData.request.requestedAt,
          });
        }
      },
      () => {
        checkRequests();
      }
    );

    return () => {
      clearInterval(interval);
    };
  }, []);
}

export default useVisitorPushListener;
