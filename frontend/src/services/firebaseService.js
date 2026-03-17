import { db } from '@/firebase';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';

// =========================
// Colecciones (top-level)
// =========================
// users/{uid}
// events/{eventId}
// athletes/{athleteId}
// bets/{betId}
// market/{listingId}
//
// Subcolecciones (por usuario)
// users/{uid}/cards/{cardId}
// users/{uid}/pending_packs/{packId}
// users/{uid}/roulette_log/{yyyy-mm-dd}

const usersCol = () => collection(db, 'users');
const userDoc = (uid) => doc(db, 'users', uid);

const eventsCol = () => collection(db, 'events');
const eventDoc = (id) => doc(db, 'events', id);

const athletesCol = () => collection(db, 'athletes');
const athleteDoc = (id) => doc(db, 'athletes', id);

const betsCol = () => collection(db, 'bets');

const marketCol = () => collection(db, 'market');
const marketDoc = (id) => doc(db, 'market', id);

const userCardsCol = (uid) => collection(db, 'users', uid, 'cards');
const userCardDoc = (uid, cardId) => doc(db, 'users', uid, 'cards', cardId);

const pendingPacksCol = (uid) => collection(db, 'users', uid, 'pending_packs');
const pendingPackDoc = (uid, packId) => doc(db, 'users', uid, 'pending_packs', packId);

const rouletteLogDoc = (uid, yyyyMmDd) => doc(db, 'users', uid, 'roulette_log', yyyyMmDd);

// =========================
// Utilidades
// =========================
function todayKeyUtc() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRarity(probs) {
  const r = Math.random();
  let cum = 0;
  for (const [rarity, p] of Object.entries(probs)) {
    cum += p;
    if (r <= cum) return rarity;
  }
  return 'common';
}

// =========================
// USERS / AUTH PERFIL
// =========================
export async function getOrCreateUserProfile(firebaseUser, { username } = {}) {
  if (!firebaseUser?.uid) throw new Error('Usuario no autenticado');
  const ref = userDoc(firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: firebaseUser.uid, ...snap.data() };

  const profile = {
    email: firebaseUser.email || '',
    username: username || firebaseUser.email?.split('@')?.[0] || 'Jugador',
    balance: 100,
    is_admin: false,
    created_at: serverTimestamp(),
    last_free_pack_date: null,
  };
  await setDoc(ref, profile);
  return { id: firebaseUser.uid, ...profile };
}

export async function getUserProfile(uid) {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return null;
  return { id: uid, ...snap.data() };
}

export async function getUserBalance(uid) {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return 0;
  return Number(snap.data().balance || 0);
}

// =========================
// EVENTS
// =========================
export async function listEvents({ includeAll = false } = {}) {
  try {
    const q = includeAll
      ? query(eventsCol(), orderBy('created_at', 'desc'))
      : query(eventsCol(), where('status', 'in', ['open', 'closed']), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function createEvent(eventData) {
  const payload = {
    title: eventData.title,
    description: eventData.description || '',
    sport: eventData.sport || '',
    options: eventData.options || [],
    status: 'open',
    winning_option: null,
    created_at: serverTimestamp(),
    resolved_at: null,
  };
  const ref = await addDoc(eventsCol(), payload);
  return { id: ref.id, ...payload };
}

export async function closeEvent(eventId) {
  await updateDoc(eventDoc(eventId), { status: 'closed' });
}

export async function deleteEvent(eventId) {
  await deleteDoc(eventDoc(eventId));
}

export async function resolveEvent(eventId, winningOption) {
  // Nota: en serverless puro no hay forma robusta de forzar "solo admin" sin Rules/Functions.
  // La seguridad real debe estar en Firestore Rules.
  await runTransaction(db, async (tx) => {
    const evRef = eventDoc(eventId);
    const evSnap = await tx.get(evRef);
    if (!evSnap.exists()) throw new Error('Evento no encontrado');
    const ev = evSnap.data();
    if (ev.status === 'resolved') throw new Error('Evento ya resuelto');

    tx.update(evRef, {
      status: 'resolved',
      winning_option: winningOption,
      resolved_at: serverTimestamp(),
    });

    const betsSnap = await getDocs(query(betsCol(), where('event_id', '==', eventId), where('status', '==', 'pending')));
    for (const betDocSnap of betsSnap.docs) {
      const bet = betDocSnap.data();
      const isWin = bet.option_name === winningOption;
      tx.update(betDocSnap.ref, { status: isWin ? 'won' : 'lost' });
      if (isWin) {
        tx.update(userDoc(bet.user_id), { balance: increment(Number(bet.potential_win || 0)) });
      }
    }
  });
}

// =========================
// BETS
// =========================
export async function listMyBets(uid) {
  try {
    const snap = await getDocs(query(betsCol(), where('user_id', '==', uid), orderBy('created_at', 'desc'), limit(100)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function placeBet({ uid, username, event_id, option_name, amount }) {
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error('Cantidad invalida');

  return await runTransaction(db, async (tx) => {
    const uRef = userDoc(uid);
    const uSnap = await tx.get(uRef);
    if (!uSnap.exists()) throw new Error('Usuario no encontrado');
    const u = uSnap.data();
    if (Number(u.balance || 0) < amt) throw new Error('Saldo insuficiente');

    const evRef = eventDoc(event_id);
    const evSnap = await tx.get(evRef);
    if (!evSnap.exists()) throw new Error('Evento no disponible');
    const ev = evSnap.data();
    if (ev.status !== 'open') throw new Error('Evento no disponible');
    const opt = (ev.options || []).find(o => o?.name === option_name);
    if (!opt) throw new Error('Opcion no valida');

    const potential_win = Math.round(amt * Number(opt.odds || 0) * 100) / 100;
    const betPayload = {
      user_id: uid,
      username: username || u.username || '',
      event_id,
      event_title: ev.title || '',
      option_name,
      amount: amt,
      odds: Number(opt.odds || 0),
      potential_win,
      status: 'pending',
      created_at: serverTimestamp(),
    };

    const betRef = doc(betsCol());
    tx.set(betRef, betPayload);
    tx.update(uRef, { balance: increment(-amt) });

    return { id: betRef.id, ...betPayload };
  });
}

// =========================
// ATHLETES
// =========================
export async function listAthletes() {
  try {
    const snap = await getDocs(query(athletesCol(), orderBy('created_at', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function createAthlete(data) {
  const payload = {
    name: data.name,
    position: data.position || '',
    team: data.team || '',
    image_url: data.image_url || '',
    rarity: data.rarity || 'common',
    overall_rating: Number(data.overall_rating || 0),
    stats: data.stats || {},
    created_at: serverTimestamp(),
  };
  const ref = await addDoc(athletesCol(), payload);
  return { id: ref.id, ...payload };
}

export async function deleteAthlete(id) {
  await deleteDoc(athleteDoc(id));
}

// =========================
// PACKS / COLLECTION
// =========================
export const PACK_CONFIG = {
  basic: { price: 100, cards: 3, probs: { common: 0.70, rare: 0.25, epic: 0.04, legendary: 0.01 } },
  gold: { price: 250, cards: 5, probs: { common: 0.40, rare: 0.40, epic: 0.15, legendary: 0.05 } },
  premium: { price: 500, cards: 5, probs: { common: 0.20, rare: 0.35, epic: 0.30, legendary: 0.15 } },
  free: { price: 0, cards: 1, probs: { common: 0.80, rare: 0.15, epic: 0.04, legendary: 0.01 } },
};

export async function checkFreePackAvailable(uid) {
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return false;
  const last = snap.data().last_free_pack_date;
  const today = todayKeyUtc();
  return last !== today;
}

export async function buyPack({ uid, pack_type }) {
  const pack = PACK_CONFIG[pack_type];
  if (!pack) throw new Error('Tipo de sobre no valido');

  const athletesSnap = await getDocs(query(athletesCol(), limit(500)));
  const allAthletes = athletesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (allAthletes.length === 0) throw new Error('No hay atletas disponibles. El admin debe crear atletas primero.');

  const byRarity = allAthletes.reduce((acc, a) => {
    const r = a.rarity || 'common';
    (acc[r] ||= []).push(a);
    return acc;
  }, {});

  const cards_generated = Array.from({ length: pack.cards }, () => {
    const rarity = pickRarity(pack.probs);
    const pool = byRarity[rarity]?.length ? byRarity[rarity] : (byRarity.common?.length ? byRarity.common : allAthletes);
    const athlete = randomChoice(pool);
    return {
      athlete_id: athlete.id,
      athlete_name: athlete.name,
      athlete_position: athlete.position,
      athlete_team: athlete.team,
      athlete_image: athlete.image_url || '',
      rarity: athlete.rarity || 'common',
      overall_rating: Number(athlete.overall_rating || 0),
      stats: athlete.stats || {},
    };
  });

  const today = todayKeyUtc();

  const packId = await runTransaction(db, async (tx) => {
    const uRef = userDoc(uid);
    const uSnap = await tx.get(uRef);
    if (!uSnap.exists()) throw new Error('Usuario no encontrado');
    const u = uSnap.data();

    if (pack_type === 'free') {
      const last = u.last_free_pack_date;
      if (last === today) throw new Error('Ya reclamaste tu sobre gratis hoy');
      tx.update(uRef, { last_free_pack_date: today });
    } else {
      if (Number(u.balance || 0) < Number(pack.price)) throw new Error('Saldo insuficiente');
      tx.update(uRef, { balance: increment(-Number(pack.price)) });
    }

    const pRef = doc(pendingPacksCol(uid));
    tx.set(pRef, {
      pack_type,
      cards: cards_generated,
      created_at: serverTimestamp(),
    });
    return pRef.id;
  });

  return { pack_id: packId, pack_type, cards: cards_generated };
}

export async function pickCard({ uid, pack_id, card_index }) {
  const pSnap = await getDoc(pendingPackDoc(uid, pack_id));
  if (!pSnap.exists()) throw new Error('Sobre no encontrado o ya recogido');
  const cards = pSnap.data().cards || [];
  if (card_index < 0 || card_index >= cards.length) throw new Error('Seleccion invalida');
  const chosen = cards[card_index];

  await runTransaction(db, async (tx) => {
    const pRef = pendingPackDoc(uid, pack_id);
    const p2 = await tx.get(pRef);
    if (!p2.exists()) throw new Error('Sobre no encontrado o ya recogido');

    const cRef = doc(userCardsCol(uid));
    tx.set(cRef, {
      ...chosen,
      obtained_at: serverTimestamp(),
      is_listed: false,
    });
    tx.delete(pRef);
  });
}

export async function getMyCollection(uid) {
  try {
    const [cardsSnap, athletesSnap] = await Promise.all([
      getDocs(query(userCardsCol(uid), where('is_listed', '==', false), limit(500))),
      getDocs(query(athletesCol(), limit(1000))),
    ]);

    const cards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const total_athletes = athletesSnap.size;
    const unique_ids = new Set(cards.map(c => c.athlete_id));
    return {
      cards,
      total_unique: unique_ids.size,
      total_athletes,
      total_cards: cards.length,
      duplicates: cards.length - unique_ids.size,
    };
  } catch {
    return { cards: [], total_unique: 0, total_athletes: 0, total_cards: 0, duplicates: 0 };
  }
}

export async function getUserCollectionProfile(userId) {
  const [uSnap, cardsSnap, athletesSnap] = await Promise.all([
    getDoc(userDoc(userId)),
    getDocs(query(userCardsCol(userId), where('is_listed', '==', false), limit(500))),
    getDocs(query(athletesCol(), limit(1000))),
  ]);
  if (!uSnap.exists()) throw new Error('Usuario no encontrado');
  const user = { id: userId, ...uSnap.data() };
  const cards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const total_athletes = athletesSnap.size;
  const unique_ids = new Set(cards.map(c => c.athlete_id));
  return { user, cards, total_unique: unique_ids.size, total_athletes, total_cards: cards.length };
}

// =========================
// MARKET
// =========================
export async function listMarketListings() {
  try {
    const snap = await getDocs(query(marketCol(), where('status', '==', 'active'), orderBy('created_at', 'desc'), limit(200)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

export async function listCardOnMarket({ uid, username, user_card_id, price, listing_type }) {
  const p = Number(price);
  if (!p || p <= 0) throw new Error('Precio invalido');

  return await runTransaction(db, async (tx) => {
    const cRef = userCardDoc(uid, user_card_id);
    const cSnap = await tx.get(cRef);
    if (!cSnap.exists()) throw new Error('Carta no encontrada');
    const card = cSnap.data();
    if (card.is_listed) throw new Error('Carta ya listada');

    const listingRef = doc(marketCol());
    const now = Date.now();
    const expiresAt = listing_type === 'auction' ? now + 24 * 60 * 60 * 1000 : null;

    tx.set(listingRef, {
      seller_id: uid,
      seller_name: username || '',
      user_card_owner_id: uid,
      user_card_id,
      athlete_id: card.athlete_id,
      athlete_name: card.athlete_name,
      athlete_image: card.athlete_image || '',
      rarity: card.rarity,
      overall_rating: card.overall_rating,
      stats: card.stats || {},
      price: p,
      listing_type: listing_type || 'fixed',
      bids: [],
      highest_bid: 0,
      status: 'active',
      expires_at_ms: expiresAt,
      created_at: serverTimestamp(),
    });

    tx.update(cRef, { is_listed: true });
    return { id: listingRef.id };
  });
}

export async function buyListing({ buyer_uid, listing_id }) {
  await runTransaction(db, async (tx) => {
    const lRef = marketDoc(listing_id);
    const lSnap = await tx.get(lRef);
    if (!lSnap.exists()) throw new Error('Listado no encontrado');
    const listing = lSnap.data();
    if (listing.status !== 'active' || listing.listing_type !== 'fixed') throw new Error('Listado no encontrado');
    if (listing.seller_id === buyer_uid) throw new Error('No puedes comprar tu propia carta');

    const buyerRef = userDoc(buyer_uid);
    const buyerSnap = await tx.get(buyerRef);
    if (!buyerSnap.exists()) throw new Error('Usuario no encontrado');
    const buyer = buyerSnap.data();
    if (Number(buyer.balance || 0) < Number(listing.price || 0)) throw new Error('Saldo insuficiente');

    tx.update(buyerRef, { balance: increment(-Number(listing.price || 0)) });
    tx.update(userDoc(listing.seller_id), { balance: increment(Number(listing.price || 0)) });

    const sellerCardRef = userCardDoc(listing.user_card_owner_id, listing.user_card_id);
    const sellerCardSnap = await tx.get(sellerCardRef);
    if (!sellerCardSnap.exists()) throw new Error('Carta no encontrada');
    const cardData = sellerCardSnap.data();

    const buyerCardRef = doc(userCardsCol(buyer_uid), listing.user_card_id);
    tx.set(buyerCardRef, { ...cardData, is_listed: false, obtained_at: cardData.obtained_at || serverTimestamp() }, { merge: true });
    tx.delete(sellerCardRef);

    tx.update(lRef, { status: 'sold', buyer_id: buyer_uid, sold_at: serverTimestamp() });
  });
}

export async function placeBid({ bidder_uid, bidder_name, listing_id, amount }) {
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error('Cantidad invalida');

  await runTransaction(db, async (tx) => {
    const lRef = marketDoc(listing_id);
    const lSnap = await tx.get(lRef);
    if (!lSnap.exists()) throw new Error('Subasta no encontrada');
    const listing = lSnap.data();
    if (listing.status !== 'active' || listing.listing_type !== 'auction') throw new Error('Subasta no encontrada');
    if (listing.seller_id === bidder_uid) throw new Error('No puedes pujar en tu propia subasta');
    if (amt <= Number(listing.highest_bid || 0)) throw new Error('La puja debe ser mayor que la actual');

    const bidderRef = userDoc(bidder_uid);
    const bSnap = await tx.get(bidderRef);
    if (!bSnap.exists()) throw new Error('Usuario no encontrado');
    const b = bSnap.data();
    if (Number(b.balance || 0) < amt) throw new Error('Saldo insuficiente');

    const bid = { bidder_id: bidder_uid, bidder_name: bidder_name || '', amount: amt, timestamp_ms: Date.now() };
    tx.update(lRef, { bids: [...(listing.bids || []), bid], highest_bid: amt });
  });
}

export async function cancelListing({ uid, listing_id }) {
  await runTransaction(db, async (tx) => {
    const lRef = marketDoc(listing_id);
    const lSnap = await tx.get(lRef);
    if (!lSnap.exists()) throw new Error('Listado no encontrado');
    const listing = lSnap.data();
    if (listing.seller_id !== uid || listing.status !== 'active') throw new Error('Listado no encontrado');

    const cRef = userCardDoc(uid, listing.user_card_id);
    tx.update(cRef, { is_listed: false });
    tx.update(lRef, { status: 'cancelled', cancelled_at: serverTimestamp() });
  });
}

// =========================
// ROULETTE
// =========================
const RED_NUMBERS_SET = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const BLACK_NUMBERS_SET = new Set([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);

export async function getRouletteStatus(uid) {
  const key = todayKeyUtc();
  const snap = await getDoc(rouletteLogDoc(uid, key));
  const spins_used = snap.exists() ? Number(snap.data().spins_used || 0) : 0;
  return { spins_remaining: Math.max(0, 3 - spins_used), spins_used };
}

export async function playRoulette({ uid, bet_type, bet_value, amount }) {
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error('Cantidad invalida');
  const key = todayKeyUtc();

  return await runTransaction(db, async (tx) => {
    const logRef = rouletteLogDoc(uid, key);
    const logSnap = await tx.get(logRef);
    const spins_used = logSnap.exists() ? Number(logSnap.data().spins_used || 0) : 0;
    if (spins_used >= 3) throw new Error('Sin tiradas disponibles hoy');

    const uRef = userDoc(uid);
    const uSnap = await tx.get(uRef);
    if (!uSnap.exists()) throw new Error('Usuario no encontrado');
    const u = uSnap.data();
    if (Number(u.balance || 0) < amt) throw new Error('Saldo insuficiente');

    const result_number = Math.floor(Math.random() * 37);
    const result_color = result_number === 0 ? 'verde' : (RED_NUMBERS_SET.has(result_number) ? 'rojo' : 'negro');

    let multiplier = 0;
    if (bet_type === 'number') {
      if (Number(bet_value) === result_number) multiplier = 35;
    } else if (bet_type === 'color' && result_number !== 0) {
      if ((bet_value === 'rojo' && RED_NUMBERS_SET.has(result_number)) || (bet_value === 'negro' && BLACK_NUMBERS_SET.has(result_number))) multiplier = 1;
    } else if (bet_type === 'parity' && result_number !== 0) {
      const is_even = result_number % 2 === 0;
      if ((bet_value === 'par' && is_even) || (bet_value === 'impar' && !is_even)) multiplier = 1;
    } else if (bet_type === 'half' && result_number !== 0) {
      if ((bet_value === '1-18' && result_number >= 1 && result_number <= 18) || (bet_value === '19-36' && result_number >= 19 && result_number <= 36)) multiplier = 1;
    } else if (bet_type === 'dozen') {
      if ((bet_value === '1-12' && result_number >= 1 && result_number <= 12) || (bet_value === '13-24' && result_number >= 13 && result_number <= 24) || (bet_value === '25-36' && result_number >= 25 && result_number <= 36)) multiplier = 2;
    }

    const winnings = amt * multiplier;
    const totalPayout = amt + winnings; // Apuesta + ganancia
    const net = totalPayout - amt; // Neto para balance actual
    tx.update(uRef, { balance: increment(net) });

    if (logSnap.exists()) tx.update(logRef, { spins_used: increment(1) });
    else tx.set(logRef, { spins_used: 1, date: key, created_at: serverTimestamp() });

    const spins_remaining = Math.max(0, 2 - spins_used);
    return {
      result_number,
      result_color,
      won: multiplier > 0,
      multiplier,
      winnings: totalPayout, // Total recibido (apuesta + premio)
      bet_amount: amt,
      spins_remaining,
    };
  });
}

// =========================
// SHOW / SOCIAL
// =========================
export async function listLeaderboard() {
  // Requiere que el user_doc tenga un campo `total_cards` mantenido.
  // Como no hay backend, lo calculamos con collectionGroup (costoso, pero funcional).
  try {
    const usersSnap = await getDocs(query(usersCol(), where('is_admin', '!=', true), limit(200)));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const countsSnap = await getDocs(collectionGroup(db, 'cards'));
    const counts = new Map();
    for (const d of countsSnap.docs) {
      const uid = d.ref.path.split('/')[1];
      counts.set(uid, (counts.get(uid) || 0) + 1);
    }
    for (const u of users) u.total_cards = counts.get(u.id) || 0;
    users.sort((a, b) => (b.total_cards || 0) - (a.total_cards || 0));
    return users.slice(0, 20);
  } catch {
    return [];
  }
}

export async function searchUsersByUsername(qStr) {
  const qTrim = (qStr || '').trim();
  if (!qTrim) return [];

  // Búsqueda "contains" real no existe sin índices/algolia.
  // Implementamos prefijo con rango: username >= q && username < q+\uf8ff
  const end = `${qTrim}\uf8ff`;
  try {
    const snap = await getDocs(query(usersCol(), orderBy('username'), where('username', '>=', qTrim), where('username', '<=', end), limit(20)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    return [];
  }
}

// =========================
// ADMIN STATS (aprox)
// =========================
export async function getAdminStats() {
  const [usersSnap, betsSnap, eventsSnap, athletesSnap, marketSnap] = await Promise.all([
    getDocs(query(usersCol(), limit(1000))),
    getDocs(query(betsCol(), limit(5000))),
    getDocs(query(eventsCol(), limit(2000))),
    getDocs(query(athletesCol(), limit(2000))),
    getDocs(query(marketCol(), where('status', '==', 'active'), limit(2000))),
  ]);

  const total_users = usersSnap.size;
  const total_bets = betsSnap.size;
  const total_events = eventsSnap.size;
  const total_athletes = athletesSnap.size;
  const active_listings = marketSnap.size;

  // total_cards con collectionGroup (puede ser caro)
  const cardsSnap = await getDocs(collectionGroup(db, 'cards'));
  const total_cards = cardsSnap.size;

  return { total_users, total_bets, total_events, total_athletes, total_cards, active_listings };
}

export async function adminAddBalance({ user_id, amount }) {
  const amt = Number(amount);
  if (!amt) throw new Error('Cantidad invalida');
  await updateDoc(userDoc(user_id), { balance: increment(amt) });
  const newBalance = await getUserBalance(user_id);
  return { new_balance: newBalance };
}

