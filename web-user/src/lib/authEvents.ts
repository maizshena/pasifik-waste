type Listener = () => void;
const listeners: Listener[] = [];

export const authEvents = {
  onSessionExpired: (fn: Listener) => {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  },
  emit: () => { listeners.forEach((fn) => fn()); },
};