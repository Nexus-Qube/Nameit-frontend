// Use environment variable with fallback
//const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://nameit-backend.onrender.com';
//const BASE_URL = 'http://192.168.0.22:3000'; // your backend URL
const BASE_URL = 'http://192.168.0.243:3000';

console.log('🔗 API Base URL:', BASE_URL); // Debug log

// ---------- Categories ----------
export async function fetchCategories() {
  try {
    const res = await fetch(`${BASE_URL}/categories`);
    if (!res.ok) {
      console.error("Failed to fetch categories");
      return [];
    }
    const data = await res.json();
    console.log("Categories with topics:", data); // debug
    return data;
  } catch (err) {
    console.error("fetchCategories error:", err);
    return [];
  }
}

// ---------- Topics ----------
export async function fetchTopicById(topicId) {
  try {
    const res = await fetch(`${BASE_URL}/topics/${topicId}`);
    if (!res.ok) throw new Error("Failed to fetch topic");
    return await res.json();
  } catch (err) {
    console.error("fetchTopicById error:", err);
    return null;
  }
}

// ---------- Items ----------

export async function fetchItemsByTopic(topicId) {
  try {
    const res = await fetch(`${BASE_URL}/items/${topicId}`);
    if (!res.ok) throw new Error("Failed to fetch items");
    return await res.json();
  } catch (err) {
    console.error("fetchItemsByTopic error:", err);
    return [];
  }
}

// ---------- Multiplayer API ----------
export async function createLobby(topicId, name, creatorId) {
  const res = await fetch(`${BASE_URL}/lobbies/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicId, name, creatorId }) // send creatorId
  });
  return await res.json();
}

// fetch lobby by code
export async function getLobby(code) {
  try {
    const res = await fetch(`${BASE_URL}/lobbies/code/${code}`); // note /code/
    return await res.json();
  } catch (err) {
    console.error("getLobby error:", err);
    return null;
  }
}

export async function joinLobby(lobbyId, name, code, playerId) {
  try {
    const res = await fetch(`${BASE_URL}/lobbies/join/${lobbyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, code, playerId }), // send playerId
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Join failed:', data.error || data);
      return null;
    }
    return data;
  } catch (err) {
    console.error("joinLobby error:", err);
    return null;
  }
}

export async function setReady(playerId, isReady) {
  const res = await fetch(`${BASE_URL}/players/ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, isReady })
  });
  return await res.json();
}

export async function fetchLobbies(topicId) {
  try {
    const res = await fetch(`${BASE_URL}/lobbies/topic/${topicId}`);
    return await res.json();
  } catch (err) {
    console.error("fetchLobbies error:", err);
    return [];
  }
}

// Fetch all lobbies, newest first
export async function fetchAllLobbies() {
  try {
    const res = await fetch(`${BASE_URL}/lobbies`);
    if (!res.ok) {
      console.error("Failed to fetch all lobbies");
      return [];
    }
    const data = await res.json();
    // Sort by created_at descending (newest first) if backend doesn't already do it
    return data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (err) {
    console.error("fetchAllLobbies error:", err);
    return [];
  }
}

// Delete a lobby by ID
export async function deleteLobby(lobbyId) {
  try {
    const res = await fetch(`${BASE_URL}/lobbies/${lobbyId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      console.error('Failed to delete lobby:', data.error || data);
      return null;
    }
    return data;
  } catch (err) {
    console.error("deleteLobby error:", err);
    return null;
  }
}

// ---------- Auth ----------
export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return await res.json();
}

export async function register(name, email, password) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return await res.json();
}