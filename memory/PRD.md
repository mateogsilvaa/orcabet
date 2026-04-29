# Orcabet (Fantasy Orcasitas) - PRD

## Descripcion del Proyecto
Plataforma web de apuestas deportivas con moneda virtual y sistema de coleccion de cartas digitales estilo "Ultimate Team".

## Stack Tecnologico
- **Frontend:** React, TailwindCSS, Shadcn/UI
- **Backend:** FastAPI (Python)
- **Base de datos:** MongoDB (datos)
- **Autenticacion:** Firebase Auth
- **Fuente:** Montserrat
- **Colores:** Negro (#000) + Naranja (#ff5e00)

## Funcionalidades Implementadas

### Autenticacion (Firebase Auth)
- Registro con email/contrasena via Firebase
- Login con Firebase Auth
- Token verification en backend
- Saldo inicial de 100 monedas

### Dashboard
- Saludo con nombre de usuario y saldo
- Acciones rapidas (Apostar, Tienda, Ruleta, Coleccion)
- Estadisticas de cartas y progreso
- Apuestas recientes

### Apuestas
- Lista de eventos deportivos abiertos
- Seleccion de opciones con cuotas
- Slip de apuesta con calculo de ganancia potencial
- Historial de apuestas personales

### Tienda de Sobres
- 4 tipos: Gratis (diario), Basico (100), Oro (250), Premium (500)
- Apertura de sobres con animacion
- Sistema de rarezas: Common, Rare, Epic, Legendary
- Elegir 1 carta de las reveladas

### Mercado
- Listado de cartas a venta fija
- Sistema de subastas con pujas
- Vender cartas propias
- Cancelar listados

### Coleccion
- Galeria de cartas coleccionadas
- Filtro por rareza
- Progreso de coleccion (unique/total)
- Barra de progreso visual

### Ruleta
- Ruleta real con numeros 0-36
- Apuestas: numero, color, paridad, mitad, docena
- 3 tiradas diarias
- Historial de resultados

### Show de Cartas
- Ranking de jugadores por cartas
- Busqueda de usuarios
- Perfiles publicos con coleccion

### Admin
- Estadisticas globales
- CRUD de eventos deportivos
- CRUD de atletas
- Gestion de saldo de usuarios
- Resolver eventos (ganador)

## Diseno
- Tema oscuro con fondo negro
- Fuente Montserrat
- Acento naranja #ff5e00
- Sidebar con navegacion
- Responsive (mobile bottom nav)

## Cambios Realizados (16 Mar 2026)
- Migrado autenticacion de JWT custom a Firebase Auth
- Eliminada seccion "Mi Equipo"
- Actualizado diseno: Montserrat, paleta negra/naranja
- Limpieza de datos MongoDB (re-seed con Firebase UIDs)
- 26 atletas semilla creados
- Admin: admin@orcabet.com / admin123

## Credenciales
- Admin: admin@orcabet.com / admin123
- Firebase Project: orcabet-7cd40

## Backlog
- P2: Imagenes reales de atletas
- P2: Expiracion automatica de subastas
- P3: Estadisticas detalladas de apuestas
- P3: Notificaciones en tiempo real
- P3: Compartir coleccion en redes sociales
