import { useCallback, useEffect, useState } from 'react';
import { listDueFeedbackInvites, type DueFeedbackInvite } from '../services/orderFeedback';

export const useDueFeedbackInvites = () => {
  const [invites, setInvites] = useState<DueFeedbackInvite[]>([]);

  const refresh = useCallback(async () => {
    try {
      setInvites(await listDueFeedbackInvites());
    } catch {
      setInvites([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markSent = useCallback((token: string) => {
    setInvites((prev) =>
      prev.map((invite) =>
        invite.token === token ? { ...invite, sent_at: new Date().toISOString() } : invite,
      ),
    );
  }, []);

  return { invites, refresh, markSent };
};
