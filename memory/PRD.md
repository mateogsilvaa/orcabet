# Orcabet (Fantasy Orcasitas) - PRD

## Problem Statement
Plataforma web que fusiona apuestas deportivas (moneda virtual) con coleccionismo de cartas digitales estilo "Ultimate Team". Los usuarios apuestan su saldo en el rendimiento de atletas, y con las ganancias compran sobres para mejorar su colección.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT email/password

## User Personas
1. **Jugador casual**: Apuesta por diversión, colecciona cartas
2. **Coleccionista**: Se enfoca en completar la colección de cartas
3. **Competidor**: Busca el leaderboard y el mejor equipo
4. **Admin**: Gestiona eventos, atletas y resuelve apuestas

## Core Requirements
- Registro/Login con email y contraseña (1000 monedas de bienvenida)
- Dashboard con saldo en tiempo real
- Sistema de apuestas con eventos creados por admin
- Tienda de sobres (Gratis, Básico, Oro, Premium) con animación de apertura
- Mercado de cartas (precio fijo y subastas 24h)
- Colección con progreso y contador de repetidas
- Ruleta diaria (3 tiradas/24h)
- Show de cartas (perfiles sociales + leaderboard)
- Generador "Mi Equipo" con Canvas
- Panel de administración

## What's Been Implemented (Feb 2026)
- [x] Auth system (register/login/JWT)
- [x] Dashboard with balance and quick actions
- [x] Full betting system with events, odds, and resolution
- [x] Card pack shop (4 pack types) with flip animation
- [x] Card marketplace with fixed-price and auction modes
- [x] Collection gallery with progress tracking and filters
- [x] Daily roulette with spinning wheel and 3 spins/day limit
- [x] Social profiles and leaderboard
- [x] Team generator with Canvas image
- [x] Admin panel (events, athletes, stats)
- [x] 26 sample athletes seeded (Common, Rare, Epic, Legendary)
- [x] Dark cyberpunk "Nexo Cibernético" theme
- [x] Spanish language UI
- [x] Mobile responsive design

## Testing Results
- Backend: 100% pass rate (15/15 endpoints)
- Frontend: 95% pass rate

## Prioritized Backlog
### P0 (Critical)
- (none remaining)

### P1 (Important)
- Real athlete images integration
- Auction expiry automation
- Bet history with detailed stats

### P2 (Nice to have)
- Push notifications for bet results
- Trading between friends
- Achievement system
- Seasonal card sets
- Animated card borders for legendaries
- Team generator image sharing to social media

## Next Tasks
1. Add real athlete images when user provides them
2. Implement auction expiry cron job
3. Add more detailed bet statistics/history
4. Share team image on social media
5. Add achievement/badge system
