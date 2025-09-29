import { supabase } from './supabase';

type LogLevel = 'info' | 'warn' | 'error' | 'success';

export const logEvent = async (level: LogLevel, message: string, meta?: object) => {
  try {
    const { error } = await supabase.functions.invoke('log-event', {
      body: { level, message, meta },
    });
    if (error) {
      // Log to console as a fallback
      console.error('Failed to log event to server:', error);
    }
  } catch (e) {
    console.error('Error invoking log-event function:', e);
  }
};
