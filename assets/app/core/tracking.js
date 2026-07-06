const EVENTS_KEY = 'ncr_academy_tracking_events_v1';

export function addEvent(type, payload = {}) {
  const event = {
    id: crypto.randomUUID ? crypto.randomUUID() : `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: location.href
  };
  const events = listEvents();
  events.unshift(event);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 250)));
  return event;
}

export function listEvents() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY)) || [];
  } catch (_) {
    return [];
  }
}

export function clearEvents() {
  localStorage.removeItem(EVENTS_KEY);
}

export function exportEvents() {
  const blob = new Blob([JSON.stringify(listEvents(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ncr-academy-tracabilite-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
