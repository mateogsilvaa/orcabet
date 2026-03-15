# Orcabet (Fantasy Orcasitas) - PRD

## Problem Statement
Plataforma de apuestas deportivas (moneda virtual) + coleccionismo de cartas digitales estilo Ultimate Team.

## Architecture
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: FastAPI (Python) + JWT Auth
- Database: MongoDB

## What's Been Implemented (Feb 2026)
- [x] Auth system (register/login/JWT) - 100 monedas de bienvenida
- [x] Dashboard con saldo y acciones rápidas
- [x] Sistema de apuestas completo (eventos, cuotas, resolución)
- [x] Tienda de sobres (4 tipos) - VER TODAS, ELEGIR 1 CARTA
- [x] Mercado de cartas (precio fijo + subasta)
- [x] Colección con progreso y filtros
- [x] **RULETA REAL** - Casino con números 0-36, colores, par/impar, docenas (3 jugadas/día)
- [x] Perfiles sociales + ranking por NÚMERO DE CARTAS (sin admin, sin monedas)
- [x] Generador de equipo con Canvas
- [x] Panel admin: eventos, atletas, GESTIÓN DE SALDO de usuarios
- [x] 26 atletas ejemplo (Common, Rare, Epic, Legendary)

## Iteration 2 Changes
- Ruleta: De rueda aleatoria a juego real de ruleta casino
- Sobres: Ver todas las cartas pero elegir solo 1
- Ranking: Solo jugadores, ordenado por cartas
- Balance inicial: 100 (antes 1000)
- Admin: Ingresar dinero a jugadores

## Testing
- Backend: 100% (19/19 endpoints)
- Frontend: 98%

## Next Tasks
1. Imágenes reales de atletas
2. Expiración automática de subastas
3. Estadísticas detalladas de apuestas
4. Compartir equipo en redes sociales
