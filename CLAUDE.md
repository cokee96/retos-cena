# Retos Cena — CLAUDE.md

Web app PWA de retos secretos para cenas con amigos. Multijugador en tiempo real, sin cuentas de usuario.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite (PWA) |
| Real-time | Socket.io |
| API | Express (Node.js) |
| BD | SQLite (better-sqlite3) |
| Sesión | localStorage (nombre + roomToken) |
| Infraestructura | Docker en Raspberry Pi |
| Acceso exterior | Cloudflare Tunnel (opcional) |

Estructura de carpetas:

```
/
├── client/          # React + Vite PWA
├── server/          # Express + Socket.io + SQLite
├── docker-compose.yml
└── CLAUDE.md
```

---

## Raspberry Pi

IP: 192.168.1.143 | Usuario: coke | OS: Ubuntu Server 22.04 32-bit (ARMv7)

- Despliegue: `docker-compose up -d` desde la raíz del proyecto
- El servidor corre en el puerto **3001** (API + Socket.io)
- El cliente compilado se sirve estático desde Express en el mismo puerto
- Para acceso externo: Cloudflare Tunnel apuntando a `localhost:3001`

Conectar por SSH con expect (no hay sshpass):
```bash
expect -c 'set timeout 30; spawn ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no coke@192.168.1.143 {COMANDO}; expect "password:" { send "CONTRASEÑA\r" }; expect eof'
```

---

## Mecánica de juego

### Flujo principal

1. Host crea sala → recibe código de 4 letras
2. Jugadores se unen con código + nombre → token guardado en localStorage
3. Host pulsa "Empezar" → el servidor asigna retos
4. Cada jugador ve su reto activo en pantalla (solo él lo ve)
5. Jugador cumple el reto → pulsa ✓ Hecho
   - Al objetivo le aparece: "¡Bebe! 🍺" (anónimo)
   - El jugador recibe un nuevo reto automáticamente
6. Si alguien sospecha → pulsa ✗ Denunciar
   - Elige a quién denuncia
   - El denunciado recibe: "Te han denunciado. ¿Lo admites?"
     - Admite → el denunciado bebe, reto cancelado, recibe uno nuevo
     - Niega → el denunciante pierde una denuncia y bebe él

### Sistema de denuncias

- Cada jugador tiene N denuncias (configurable, default: 3)
- Al llegar a 0, el botón desaparece
- Las denuncias son globales por jugador

### Retos

- Pool predefinido (~100 retos en español)
- Categorías: conversación, físico, atrevido, inocente
- El host puede filtrar categorías
- Cada reto va dirigido a un jugador aleatorio distinto al ejecutor
- Siempre 1 reto activo por jugador

### Visibilidad

- El objetivo nunca sabe quién le hizo beber ni qué reto era
- Solo sabe que debe beber

---

## Base de datos (SQLite)

```sql
rooms      (id, code, status, config_json, created_at)
players    (id, room_id, name, socket_id, denounces_left, token)
challenges (id, room_id, executor_id, target_id, text, status, created_at)
           -- status: pending | done | denounced | cancelled
events     (id, room_id, type, payload_json, created_at)
           -- type: drink | denounce | admit | deny
```

---

## Decisiones de diseño confirmadas

- El objetivo nunca sabe quién le hizo beber (anónimo) ✅
- Denuncia: el denunciante elige a quién denuncia de la lista ✅
- Negar denuncia = denunciante bebe + pierde denuncia ✅
- Retos siempre 1-a-1 ✅
- 1 reto activo por jugador en todo momento ✅
