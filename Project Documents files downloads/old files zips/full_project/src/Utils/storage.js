const STORAGE_KEYS = {
  PLAYERS: "golf_players",
  COURSES: "golf_courses",
  LAST_ROUND: "golf_last_round",
  DEFAULT_PLAYERS: "golf_default_players",
};

export function createId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function loadFromStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallbackValue;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error loading from localStorage for key "${key}":`, error);
    return fallbackValue;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving to localStorage for key "${key}":`, error);
  }
}

export function getPlayers() {
  return loadFromStorage(STORAGE_KEYS.PLAYERS, []);
}

export function savePlayers(players) {
  saveToStorage(STORAGE_KEYS.PLAYERS, players);
}

export function getCourses() {
  return loadFromStorage(STORAGE_KEYS.COURSES, []);
}

export function saveCourses(courses) {
  saveToStorage(STORAGE_KEYS.COURSES, courses);
}

export function getLastRound() {
  return loadFromStorage(STORAGE_KEYS.LAST_ROUND, null);
}

export function saveLastRound(roundSetup) {
  saveToStorage(STORAGE_KEYS.LAST_ROUND, roundSetup);
}

export function getDefaultPlayers() {
  return loadFromStorage(STORAGE_KEYS.DEFAULT_PLAYERS, []);
}

export function saveDefaultPlayers(players) {
  saveToStorage(STORAGE_KEYS.DEFAULT_PLAYERS, players);
}

export { STORAGE_KEYS };