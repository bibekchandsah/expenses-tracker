import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile } from '../services/profileService';
import { getMonthLabel, getFullDateLabel, getYearLabel } from '../utils/calendarUtils';

const CalendarContext = createContext(null);

/**
 * Provides calendar system preference ('gregorian' | 'bs') throughout the app.
 * Persists the choice to Firestore so it survives page reloads.
 */
export function CalendarProvider({ children }) {
  const { user } = useAuth();
  const [calendar, setCalendar] = useState('gregorian');

  // Load saved preference when user logs in
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(profile => {
      if (profile?.calendar) setCalendar(profile.calendar);
    });
  }, [user]);

  /** Save new calendar system, update state and Firestore. */
  async function updateCalendar(value) {
    setCalendar(value);
    if (user) await updateUserProfile(user.uid, { calendar: value });
  }

  /**
   * Returns a display label for a YYYY-MM month string.
   * @param {string} yyyyMM  e.g. '2025-04'
   * @param {'short'|'long'} format  default: 'short'
   */
  function monthLabel(yyyyMM, format = 'short') {
    return getMonthLabel(yyyyMM, calendar, format);
  }

  /** Format a full YYYY-MM-DD date string respecting the active calendar. */
  function dateLabel(yyyyMMDD) {
    return getFullDateLabel(yyyyMMDD, calendar);
  }

  /** Return a year label (e.g. '2026' or '2082/83'). */
  function yearLabel(year) {
    return getYearLabel(year, calendar);
  }

  return (
    <CalendarContext.Provider value={{ calendar, updateCalendar, monthLabel, dateLabel, yearLabel }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  return useContext(CalendarContext);
}
