from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET', 'orcabet-secret-key-2026')
JWT_ALGORITHM = 'HS256'

# --- Pydantic Models ---
class UserRegister(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class PlaceBet(BaseModel):
    event_id: str
    option_name: str
    amount: float

class CreateEvent(BaseModel):
    title: str
    description: str
    sport: str
    options: list

class ResolveEvent(BaseModel):
    winning_option: str

class CreateAthlete(BaseModel):
    name: str
    position: str
    team: str
    image_url: str = ""
    rarity: str
    overall_rating: int
    stats: dict

class BuyPack(BaseModel):
    pack_type: str

class MarketListingCreate(BaseModel):
    user_card_id: str
    price: float
    listing_type: str = "fixed"

class PlaceBidModel(BaseModel):
    amount: float

class RouletteBet(BaseModel):
    bet_type: str
    bet_value: str
    amount: float

class PickCard(BaseModel):
    pack_id: str
    card_index: int

class AddBalance(BaseModel):
    amount: float

# --- Auth Helpers ---
def create_token(user_id: str, is_admin: bool = False):
    payload = {
        'user_id': user_id,
        'is_admin': is_admin,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Token no proporcionado')
    token = authorization.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0, 'password_hash': 0})
        if not user:
            raise HTTPException(status_code=401, detail='Usuario no encontrado')
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expirado')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Token invalido')

async def get_admin_user(authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if not user.get('is_admin'):
        raise HTTPException(status_code=403, detail='Acceso denegado')
    return user

# ==================== AUTH ====================
@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({'email': data.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email ya registrado')
    existing_name = await db.users.find_one({'username': data.username})
    if existing_name:
        raise HTTPException(status_code=400, detail='Nombre de usuario ya registrado')
    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': data.email,
        'username': data.username,
        'password_hash': password_hash,
        'balance': 100.0,
        'is_admin': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    token = create_token(user_id)
    return {
        'token': token,
        'user': {'id': user_id, 'email': data.email, 'username': data.username, 'balance': 100.0, 'is_admin': False}
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email})
    if not user or not bcrypt.checkpw(data.password.encode(), user['password_hash'].encode()):
        raise HTTPException(status_code=401, detail='Credenciales invalidas')
    token = create_token(user['id'], user.get('is_admin', False))
    return {
        'token': token,
        'user': {'id': user['id'], 'email': user['email'], 'username': user['username'], 'balance': user['balance'], 'is_admin': user.get('is_admin', False)}
    }

# ==================== USER ====================
@api_router.get("/user/profile")
async def get_profile(user=Depends(get_current_user)):
    return user

@api_router.get("/user/balance")
async def get_balance(user=Depends(get_current_user)):
    fresh = await db.users.find_one({'id': user['id']}, {'_id': 0, 'balance': 1})
    return {'balance': fresh['balance']}

# ==================== EVENTS (BETTING) ====================
@api_router.get("/events")
async def get_events():
    events = await db.events.find({'status': {'$in': ['open', 'closed']}}, {'_id': 0}).to_list(100)
    return events

@api_router.get("/events/all")
async def get_all_events(user=Depends(get_admin_user)):
    events = await db.events.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return events

@api_router.post("/events")
async def create_event(data: CreateEvent, user=Depends(get_admin_user)):
    event = {
        'id': str(uuid.uuid4()),
        'title': data.title,
        'description': data.description,
        'sport': data.sport,
        'options': data.options,
        'status': 'open',
        'winning_option': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'resolved_at': None
    }
    await db.events.insert_one(event)
    return {k: v for k, v in event.items() if k != '_id'}

@api_router.put("/events/{event_id}/close")
async def close_event(event_id: str, user=Depends(get_admin_user)):
    result = await db.events.update_one({'id': event_id, 'status': 'open'}, {'$set': {'status': 'closed'}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail='Evento no encontrado o ya cerrado')
    return {'message': 'Evento cerrado'}

@api_router.put("/events/{event_id}/resolve")
async def resolve_event(event_id: str, data: ResolveEvent, user=Depends(get_admin_user)):
    event = await db.events.find_one({'id': event_id})
    if not event:
        raise HTTPException(status_code=404, detail='Evento no encontrado')
    if event['status'] == 'resolved':
        raise HTTPException(status_code=400, detail='Evento ya resuelto')
    await db.events.update_one(
        {'id': event_id},
        {'$set': {'status': 'resolved', 'winning_option': data.winning_option, 'resolved_at': datetime.now(timezone.utc).isoformat()}}
    )
    winning_bets = await db.bets.find({'event_id': event_id, 'option_name': data.winning_option, 'status': 'pending'}).to_list(1000)
    for bet in winning_bets:
        await db.bets.update_one({'id': bet['id']}, {'$set': {'status': 'won'}})
        await db.users.update_one({'id': bet['user_id']}, {'$inc': {'balance': bet['potential_win']}})
    await db.bets.update_many(
        {'event_id': event_id, 'option_name': {'$ne': data.winning_option}, 'status': 'pending'},
        {'$set': {'status': 'lost'}}
    )
    return {'message': 'Evento resuelto', 'winners': len(winning_bets)}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, user=Depends(get_admin_user)):
    await db.events.delete_one({'id': event_id})
    return {'message': 'Evento eliminado'}

# ==================== BETS ====================
@api_router.post("/bets")
async def place_bet(data: PlaceBet, user=Depends(get_current_user)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail='Cantidad invalida')
    fresh_user = await db.users.find_one({'id': user['id']}, {'_id': 0})
    if fresh_user['balance'] < data.amount:
        raise HTTPException(status_code=400, detail='Saldo insuficiente')
    event = await db.events.find_one({'id': data.event_id, 'status': 'open'})
    if not event:
        raise HTTPException(status_code=404, detail='Evento no disponible')
    option = next((o for o in event['options'] if o['name'] == data.option_name), None)
    if not option:
        raise HTTPException(status_code=400, detail='Opcion no valida')
    potential_win = round(data.amount * option['odds'], 2)
    bet = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'username': user['username'],
        'event_id': data.event_id,
        'event_title': event['title'],
        'option_name': data.option_name,
        'amount': data.amount,
        'odds': option['odds'],
        'potential_win': potential_win,
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.update_one({'id': user['id']}, {'$inc': {'balance': -data.amount}})
    await db.bets.insert_one(bet)
    return {k: v for k, v in bet.items() if k != '_id'}

@api_router.get("/bets/mine")
async def get_my_bets(user=Depends(get_current_user)):
    bets = await db.bets.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return bets

# ==================== ATHLETES ====================
@api_router.get("/athletes")
async def get_athletes():
    athletes = await db.athletes.find({}, {'_id': 0}).to_list(200)
    return athletes

@api_router.post("/athletes")
async def create_athlete(data: CreateAthlete, user=Depends(get_admin_user)):
    athlete = {
        'id': str(uuid.uuid4()),
        'name': data.name,
        'position': data.position,
        'team': data.team,
        'image_url': data.image_url,
        'rarity': data.rarity,
        'overall_rating': data.overall_rating,
        'stats': data.stats,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.athletes.insert_one(athlete)
    return {k: v for k, v in athlete.items() if k != '_id'}

@api_router.put("/athletes/{athlete_id}")
async def update_athlete(athlete_id: str, data: CreateAthlete, user=Depends(get_admin_user)):
    update_data = data.model_dump()
    result = await db.athletes.update_one({'id': athlete_id}, {'$set': update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail='Atleta no encontrado')
    return {'message': 'Atleta actualizado'}

@api_router.delete("/athletes/{athlete_id}")
async def delete_athlete(athlete_id: str, user=Depends(get_admin_user)):
    await db.athletes.delete_one({'id': athlete_id})
    return {'message': 'Atleta eliminado'}

# ==================== PACKS ====================
PACK_CONFIG = {
    'basic': {'price': 100, 'cards': 3, 'probs': {'common': 0.70, 'rare': 0.25, 'epic': 0.04, 'legendary': 0.01}},
    'gold': {'price': 250, 'cards': 5, 'probs': {'common': 0.40, 'rare': 0.40, 'epic': 0.15, 'legendary': 0.05}},
    'premium': {'price': 500, 'cards': 5, 'probs': {'common': 0.20, 'rare': 0.35, 'epic': 0.30, 'legendary': 0.15}},
    'free': {'price': 0, 'cards': 1, 'probs': {'common': 0.80, 'rare': 0.15, 'epic': 0.04, 'legendary': 0.01}},
}

def pick_rarity(probs):
    rand = random.random()
    cumulative = 0
    for rarity, prob in probs.items():
        cumulative += prob
        if rand <= cumulative:
            return rarity
    return 'common'

@api_router.post("/packs/buy")
async def buy_pack(data: BuyPack, user=Depends(get_current_user)):
    pack = PACK_CONFIG.get(data.pack_type)
    if not pack:
        raise HTTPException(status_code=400, detail='Tipo de sobre no valido')
    if data.pack_type == 'free':
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        existing = await db.free_packs.find_one({'user_id': user['id'], 'date': today})
        if existing:
            raise HTTPException(status_code=400, detail='Ya reclamaste tu sobre gratis hoy')
        await db.free_packs.insert_one({'user_id': user['id'], 'date': today})
    else:
        fresh_user = await db.users.find_one({'id': user['id']}, {'_id': 0})
        if fresh_user['balance'] < pack['price']:
            raise HTTPException(status_code=400, detail='Saldo insuficiente')
        await db.users.update_one({'id': user['id']}, {'$inc': {'balance': -pack['price']}})
    all_athletes = await db.athletes.find({}, {'_id': 0}).to_list(200)
    if not all_athletes:
        raise HTTPException(status_code=400, detail='No hay atletas disponibles. El admin debe crear atletas primero.')
    by_rarity = {}
    for a in all_athletes:
        by_rarity.setdefault(a['rarity'], []).append(a)
    cards_generated = []
    for _ in range(pack['cards']):
        rarity = pick_rarity(pack['probs'])
        pool = by_rarity.get(rarity, by_rarity.get('common', all_athletes))
        if not pool:
            pool = all_athletes
        athlete = random.choice(pool)
        card = {
            'athlete_id': athlete['id'],
            'athlete_name': athlete['name'],
            'athlete_position': athlete['position'],
            'athlete_team': athlete['team'],
            'athlete_image': athlete.get('image_url', ''),
            'rarity': athlete['rarity'],
            'overall_rating': athlete['overall_rating'],
            'stats': athlete['stats'],
        }
        cards_generated.append(card)
    pack_id = str(uuid.uuid4())
    await db.pending_packs.insert_one({'id': pack_id, 'user_id': user['id'], 'cards': cards_generated, 'created_at': datetime.now(timezone.utc).isoformat()})
    updated = await db.users.find_one({'id': user['id']}, {'_id': 0, 'balance': 1})
    return {'pack_id': pack_id, 'pack_type': data.pack_type, 'cards': cards_generated, 'new_balance': updated['balance']}

@api_router.post("/packs/pick")
async def pick_card(data: PickCard, user=Depends(get_current_user)):
    pending = await db.pending_packs.find_one({'id': data.pack_id, 'user_id': user['id']})
    if not pending:
        raise HTTPException(status_code=404, detail='Sobre no encontrado o ya recogido')
    cards = pending['cards']
    if data.card_index < 0 or data.card_index >= len(cards):
        raise HTTPException(status_code=400, detail='Seleccion invalida')
    chosen = cards[data.card_index]
    card_doc = {
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'athlete_id': chosen['athlete_id'],
        'athlete_name': chosen['athlete_name'],
        'athlete_position': chosen['athlete_position'],
        'athlete_team': chosen['athlete_team'],
        'athlete_image': chosen.get('athlete_image', ''),
        'rarity': chosen['rarity'],
        'overall_rating': chosen['overall_rating'],
        'stats': chosen['stats'],
        'obtained_at': datetime.now(timezone.utc).isoformat(),
        'is_listed': False
    }
    await db.user_cards.insert_one(card_doc)
    await db.pending_packs.delete_one({'id': data.pack_id})
    return {k: v for k, v in card_doc.items() if k != '_id'}

@api_router.get("/packs/free-available")
async def check_free_pack(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    existing = await db.free_packs.find_one({'user_id': user['id'], 'date': today})
    return {'available': existing is None}

@api_router.get("/packs/config")
async def get_pack_config():
    return {k: {'price': v['price'], 'cards': v['cards']} for k, v in PACK_CONFIG.items()}

# ==================== COLLECTION ====================
@api_router.get("/collection")
async def get_collection(user=Depends(get_current_user)):
    cards = await db.user_cards.find({'user_id': user['id'], 'is_listed': False}, {'_id': 0}).to_list(500)
    total_athletes = await db.athletes.count_documents({})
    unique_ids = set(c['athlete_id'] for c in cards)
    return {'cards': cards, 'total_unique': len(unique_ids), 'total_athletes': total_athletes, 'total_cards': len(cards), 'duplicates': len(cards) - len(unique_ids)}

@api_router.get("/collection/{user_id}")
async def get_user_collection(user_id: str):
    target = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0, 'email': 0})
    if not target:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    cards = await db.user_cards.find({'user_id': user_id, 'is_listed': False}, {'_id': 0}).to_list(500)
    total_athletes = await db.athletes.count_documents({})
    unique_ids = set(c['athlete_id'] for c in cards)
    return {'user': {'id': target['id'], 'username': target['username']}, 'cards': cards, 'total_unique': len(unique_ids), 'total_athletes': total_athletes, 'total_cards': len(cards)}

# ==================== MARKET ====================
@api_router.get("/market")
async def get_market_listings():
    listings = await db.market_listings.find({'status': 'active'}, {'_id': 0}).to_list(100)
    return listings

@api_router.post("/market/list")
async def list_card(data: MarketListingCreate, user=Depends(get_current_user)):
    card = await db.user_cards.find_one({'id': data.user_card_id, 'user_id': user['id'], 'is_listed': False})
    if not card:
        raise HTTPException(status_code=404, detail='Carta no encontrada')
    listing = {
        'id': str(uuid.uuid4()),
        'seller_id': user['id'],
        'seller_name': user['username'],
        'user_card_id': data.user_card_id,
        'athlete_id': card['athlete_id'],
        'athlete_name': card['athlete_name'],
        'athlete_image': card.get('athlete_image', ''),
        'rarity': card['rarity'],
        'overall_rating': card['overall_rating'],
        'stats': card.get('stats', {}),
        'price': data.price,
        'listing_type': data.listing_type,
        'bids': [],
        'highest_bid': 0,
        'status': 'active',
        'expires_at': (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat() if data.listing_type == 'auction' else None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.user_cards.update_one({'id': data.user_card_id}, {'$set': {'is_listed': True}})
    await db.market_listings.insert_one(listing)
    return {k: v for k, v in listing.items() if k != '_id'}

@api_router.post("/market/{listing_id}/buy")
async def buy_listing(listing_id: str, user=Depends(get_current_user)):
    listing = await db.market_listings.find_one({'id': listing_id, 'status': 'active', 'listing_type': 'fixed'})
    if not listing:
        raise HTTPException(status_code=404, detail='Listado no encontrado')
    if listing['seller_id'] == user['id']:
        raise HTTPException(status_code=400, detail='No puedes comprar tu propia carta')
    fresh = await db.users.find_one({'id': user['id']}, {'_id': 0})
    if fresh['balance'] < listing['price']:
        raise HTTPException(status_code=400, detail='Saldo insuficiente')
    await db.users.update_one({'id': user['id']}, {'$inc': {'balance': -listing['price']}})
    await db.users.update_one({'id': listing['seller_id']}, {'$inc': {'balance': listing['price']}})
    await db.user_cards.update_one({'id': listing['user_card_id']}, {'$set': {'user_id': user['id'], 'is_listed': False}})
    await db.market_listings.update_one({'id': listing_id}, {'$set': {'status': 'sold'}})
    return {'message': 'Carta comprada exitosamente'}

@api_router.post("/market/{listing_id}/bid")
async def place_bid(listing_id: str, data: PlaceBidModel, user=Depends(get_current_user)):
    listing = await db.market_listings.find_one({'id': listing_id, 'status': 'active', 'listing_type': 'auction'})
    if not listing:
        raise HTTPException(status_code=404, detail='Subasta no encontrada')
    if listing['seller_id'] == user['id']:
        raise HTTPException(status_code=400, detail='No puedes pujar en tu propia subasta')
    if data.amount <= listing.get('highest_bid', 0):
        raise HTTPException(status_code=400, detail='La puja debe ser mayor que la actual')
    fresh = await db.users.find_one({'id': user['id']}, {'_id': 0})
    if fresh['balance'] < data.amount:
        raise HTTPException(status_code=400, detail='Saldo insuficiente')
    bid = {'bidder_id': user['id'], 'bidder_name': user['username'], 'amount': data.amount, 'timestamp': datetime.now(timezone.utc).isoformat()}
    await db.market_listings.update_one({'id': listing_id}, {'$push': {'bids': bid}, '$set': {'highest_bid': data.amount}})
    return {'message': 'Puja realizada'}

@api_router.post("/market/{listing_id}/cancel")
async def cancel_listing(listing_id: str, user=Depends(get_current_user)):
    listing = await db.market_listings.find_one({'id': listing_id, 'seller_id': user['id'], 'status': 'active'})
    if not listing:
        raise HTTPException(status_code=404, detail='Listado no encontrado')
    await db.user_cards.update_one({'id': listing['user_card_id']}, {'$set': {'is_listed': False}})
    await db.market_listings.update_one({'id': listing_id}, {'$set': {'status': 'cancelled'}})
    return {'message': 'Listado cancelado'}

# ==================== ROULETTE ====================
RED_NUMBERS = {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}
BLACK_NUMBERS = {2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35}

@api_router.get("/roulette/status")
async def roulette_status(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    log = await db.roulette_log.find_one({'user_id': user['id'], 'date': today})
    spins_used = log['spins_used'] if log else 0
    return {'spins_remaining': max(0, 3 - spins_used), 'spins_used': spins_used}

@api_router.post("/roulette/play")
async def play_roulette(data: RouletteBet, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    log = await db.roulette_log.find_one({'user_id': user['id'], 'date': today})
    spins_used = log['spins_used'] if log else 0
    if spins_used >= 3:
        raise HTTPException(status_code=400, detail='Sin tiradas disponibles hoy')
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail='Cantidad invalida')
    fresh = await db.users.find_one({'id': user['id']}, {'_id': 0})
    if fresh['balance'] < data.amount:
        raise HTTPException(status_code=400, detail='Saldo insuficiente')
    result_number = random.randint(0, 36)
    result_color = 'verde' if result_number == 0 else ('rojo' if result_number in RED_NUMBERS else 'negro')
    multiplier = 0
    if data.bet_type == 'number':
        if int(data.bet_value) == result_number:
            multiplier = 35
    elif data.bet_type == 'color' and result_number != 0:
        if (data.bet_value == 'rojo' and result_number in RED_NUMBERS) or (data.bet_value == 'negro' and result_number in BLACK_NUMBERS):
            multiplier = 1
    elif data.bet_type == 'parity' and result_number != 0:
        is_even = result_number % 2 == 0
        if (data.bet_value == 'par' and is_even) or (data.bet_value == 'impar' and not is_even):
            multiplier = 1
    elif data.bet_type == 'half' and result_number != 0:
        if (data.bet_value == '1-18' and 1 <= result_number <= 18) or (data.bet_value == '19-36' and 19 <= result_number <= 36):
            multiplier = 1
    elif data.bet_type == 'dozen':
        if (data.bet_value == '1-12' and 1 <= result_number <= 12) or (data.bet_value == '13-24' and 13 <= result_number <= 24) or (data.bet_value == '25-36' and 25 <= result_number <= 36):
            multiplier = 2
    winnings = data.amount * multiplier
    net = winnings - data.amount
    await db.users.update_one({'id': user['id']}, {'$inc': {'balance': net}})
    if log:
        await db.roulette_log.update_one({'user_id': user['id'], 'date': today}, {'$inc': {'spins_used': 1}})
    else:
        await db.roulette_log.insert_one({'user_id': user['id'], 'date': today, 'spins_used': 1})
    updated = await db.users.find_one({'id': user['id']}, {'_id': 0, 'balance': 1})
    return {
        'result_number': result_number, 'result_color': result_color, 'won': multiplier > 0,
        'multiplier': multiplier, 'winnings': winnings, 'bet_amount': data.amount,
        'new_balance': updated['balance'], 'spins_remaining': max(0, 2 - spins_used)
    }

# ==================== SOCIAL / SHOW ====================
@api_router.get("/users/leaderboard")
async def get_leaderboard():
    users = await db.users.find({'is_admin': {'$ne': True}}, {'_id': 0, 'password_hash': 0, 'email': 0, 'balance': 0}).to_list(100)
    for u in users:
        card_count = await db.user_cards.count_documents({'user_id': u['id']})
        u['total_cards'] = card_count
    users.sort(key=lambda x: x['total_cards'], reverse=True)
    return users[:20]

@api_router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    user = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0, 'email': 0})
    if not user:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    cards = await db.user_cards.find({'user_id': user_id, 'is_listed': False}, {'_id': 0}).to_list(500)
    total_athletes = await db.athletes.count_documents({})
    unique_ids = set(c['athlete_id'] for c in cards)
    return {'user': user, 'cards': cards, 'total_unique': len(unique_ids), 'total_athletes': total_athletes, 'total_cards': len(cards)}

@api_router.get("/users/search")
async def search_users(q: str = ""):
    if not q:
        users = await db.users.find({}, {'_id': 0, 'password_hash': 0, 'email': 0}).to_list(20)
    else:
        users = await db.users.find({'username': {'$regex': q, '$options': 'i'}}, {'_id': 0, 'password_hash': 0, 'email': 0}).to_list(20)
    return users

# ==================== ADMIN ====================
@api_router.get("/admin/stats")
async def admin_stats(user=Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_bets = await db.bets.count_documents({})
    total_events = await db.events.count_documents({})
    total_athletes = await db.athletes.count_documents({})
    total_cards = await db.user_cards.count_documents({})
    active_listings = await db.market_listings.count_documents({'status': 'active'})
    return {'total_users': total_users, 'total_bets': total_bets, 'total_events': total_events, 'total_athletes': total_athletes, 'total_cards': total_cards, 'active_listings': active_listings}

@api_router.post("/admin/seed")
async def seed_admin():
    existing = await db.users.find_one({'email': 'admin@orcabet.com'})
    if existing:
        return {'message': 'Admin ya existe', 'email': 'admin@orcabet.com', 'password': 'admin123'}
    password_hash = bcrypt.hashpw('admin123'.encode(), bcrypt.gensalt()).decode()
    admin_user = {
        'id': str(uuid.uuid4()),
        'email': 'admin@orcabet.com',
        'username': 'AdminOrcabet',
        'password_hash': password_hash,
        'balance': 99999.0,
        'is_admin': True,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    return {'message': 'Admin creado', 'email': 'admin@orcabet.com', 'password': 'admin123'}

@api_router.post("/admin/seed-athletes")
async def seed_athletes(user=Depends(get_admin_user)):
    count = await db.athletes.count_documents({})
    if count > 0:
        return {'message': f'Ya existen {count} atletas'}
    sample = [
        {'name': 'Carlos Ruiz', 'position': 'Delantero', 'team': 'Orcasitas FC', 'rarity': 'common', 'overall_rating': 65, 'stats': {'attack': 70, 'defense': 40, 'speed': 65}},
        {'name': 'Miguel Santos', 'position': 'Centrocampista', 'team': 'Orcasitas FC', 'rarity': 'common', 'overall_rating': 62, 'stats': {'attack': 55, 'defense': 60, 'speed': 70}},
        {'name': 'Pedro Lopez', 'position': 'Defensa', 'team': 'Barrio Sur', 'rarity': 'common', 'overall_rating': 60, 'stats': {'attack': 35, 'defense': 75, 'speed': 55}},
        {'name': 'Luis Garcia', 'position': 'Portero', 'team': 'Barrio Sur', 'rarity': 'common', 'overall_rating': 63, 'stats': {'attack': 20, 'defense': 80, 'speed': 45}},
        {'name': 'Javi Moreno', 'position': 'Delantero', 'team': 'Los Leones', 'rarity': 'common', 'overall_rating': 64, 'stats': {'attack': 72, 'defense': 30, 'speed': 68}},
        {'name': 'Andres Vega', 'position': 'Centrocampista', 'team': 'Calle Norte', 'rarity': 'common', 'overall_rating': 61, 'stats': {'attack': 50, 'defense': 55, 'speed': 72}},
        {'name': 'Raul Diaz', 'position': 'Defensa', 'team': 'Los Leones', 'rarity': 'common', 'overall_rating': 59, 'stats': {'attack': 30, 'defense': 70, 'speed': 50}},
        {'name': 'Pablo Torres', 'position': 'Centrocampista', 'team': 'Orcasitas FC', 'rarity': 'common', 'overall_rating': 63, 'stats': {'attack': 58, 'defense': 58, 'speed': 65}},
        {'name': 'Sergio Gil', 'position': 'Delantero', 'team': 'Calle Norte', 'rarity': 'common', 'overall_rating': 66, 'stats': {'attack': 74, 'defense': 32, 'speed': 70}},
        {'name': 'Diego Luna', 'position': 'Portero', 'team': 'Los Leones', 'rarity': 'common', 'overall_rating': 58, 'stats': {'attack': 15, 'defense': 72, 'speed': 48}},
        {'name': 'Marcos Ramos', 'position': 'Delantero', 'team': 'Orcasitas FC', 'rarity': 'rare', 'overall_rating': 75, 'stats': {'attack': 82, 'defense': 45, 'speed': 78}},
        {'name': 'Ivan Navarro', 'position': 'Centrocampista', 'team': 'Barrio Sur', 'rarity': 'rare', 'overall_rating': 73, 'stats': {'attack': 65, 'defense': 72, 'speed': 76}},
        {'name': 'Hector Cruz', 'position': 'Defensa', 'team': 'Calle Norte', 'rarity': 'rare', 'overall_rating': 74, 'stats': {'attack': 40, 'defense': 85, 'speed': 65}},
        {'name': 'Oscar Reyes', 'position': 'Portero', 'team': 'Orcasitas FC', 'rarity': 'rare', 'overall_rating': 76, 'stats': {'attack': 25, 'defense': 88, 'speed': 55}},
        {'name': 'Alex Fuentes', 'position': 'Delantero', 'team': 'Los Leones', 'rarity': 'rare', 'overall_rating': 77, 'stats': {'attack': 85, 'defense': 38, 'speed': 80}},
        {'name': 'Dani Blanco', 'position': 'Centrocampista', 'team': 'Barrio Sur', 'rarity': 'rare', 'overall_rating': 72, 'stats': {'attack': 68, 'defense': 68, 'speed': 74}},
        {'name': 'Victor Soto', 'position': 'Defensa', 'team': 'Calle Norte', 'rarity': 'rare', 'overall_rating': 71, 'stats': {'attack': 35, 'defense': 82, 'speed': 62}},
        {'name': 'Hugo Marin', 'position': 'Centrocampista', 'team': 'Los Leones', 'rarity': 'rare', 'overall_rating': 74, 'stats': {'attack': 70, 'defense': 65, 'speed': 78}},
        {'name': 'Fernando El Tigre', 'position': 'Delantero', 'team': 'Orcasitas FC', 'rarity': 'epic', 'overall_rating': 85, 'stats': {'attack': 92, 'defense': 50, 'speed': 88}},
        {'name': 'Roberto Acero', 'position': 'Centrocampista', 'team': 'Los Leones', 'rarity': 'epic', 'overall_rating': 83, 'stats': {'attack': 78, 'defense': 80, 'speed': 82}},
        {'name': 'Antonio Muro', 'position': 'Defensa', 'team': 'Barrio Sur', 'rarity': 'epic', 'overall_rating': 84, 'stats': {'attack': 45, 'defense': 93, 'speed': 72}},
        {'name': 'Kike Rayo', 'position': 'Delantero', 'team': 'Calle Norte', 'rarity': 'epic', 'overall_rating': 86, 'stats': {'attack': 90, 'defense': 42, 'speed': 92}},
        {'name': 'Mario Centella', 'position': 'Portero', 'team': 'Orcasitas FC', 'rarity': 'epic', 'overall_rating': 84, 'stats': {'attack': 30, 'defense': 95, 'speed': 60}},
        {'name': 'El Fantasma', 'position': 'Delantero', 'team': 'Orcasitas FC', 'rarity': 'legendary', 'overall_rating': 95, 'stats': {'attack': 98, 'defense': 65, 'speed': 96}},
        {'name': 'La Sombra', 'position': 'Centrocampista', 'team': 'Los Leones', 'rarity': 'legendary', 'overall_rating': 93, 'stats': {'attack': 88, 'defense': 90, 'speed': 92}},
        {'name': 'El Titan', 'position': 'Defensa', 'team': 'Barrio Sur', 'rarity': 'legendary', 'overall_rating': 94, 'stats': {'attack': 55, 'defense': 99, 'speed': 78}},
    ]
    for a in sample:
        a['id'] = str(uuid.uuid4())
        a['image_url'] = ''
        a['created_at'] = datetime.now(timezone.utc).isoformat()
    await db.athletes.insert_many(sample)
    return {'message': f'{len(sample)} atletas creados'}

@api_router.post("/admin/add-balance/{user_id}")
async def admin_add_balance(user_id: str, data: AddBalance, admin=Depends(get_admin_user)):
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail='Usuario no encontrado')
    await db.users.update_one({'id': user_id}, {'$inc': {'balance': data.amount}})
    updated = await db.users.find_one({'id': user_id}, {'_id': 0, 'balance': 1})
    return {'message': 'Balance actualizado', 'new_balance': updated['balance']}

@api_router.get("/admin/users")
async def admin_get_users(admin=Depends(get_admin_user)):
    users = await db.users.find({'is_admin': {'$ne': True}}, {'_id': 0, 'password_hash': 0}).to_list(100)
    for u in users:
        u['total_cards'] = await db.user_cards.count_documents({'user_id': u['id']})
    return users

# ==================== SETUP ====================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
