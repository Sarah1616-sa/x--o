import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { Server } from 'socket.io'
import { DEFAULT_CLIENT_ORIGINS, DEFAULT_SERVER_PORT } from './constants/roomConstants.js'
import { registerSocketHandlers } from './socket.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Built frontend lives at mystery-xo/dist (server/src -> ../../dist).
const distPath = path.resolve(__dirname, '../../dist')

function getAllowedOrigins() {
  const configuredOrigins = process.env.CLIENT_ORIGINS

  if (!configuredOrigins) {
    return DEFAULT_CLIENT_ORIGINS
  }

  return configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
}

const app = express()
const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
  },
})

app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ ok: true })
})

registerSocketHandlers(io)

// Single-service: serve the built frontend from the same origin as the API/Socket.IO.
// Socket.IO handles /socket.io/ on the httpServer before Express, and /health is
// registered above, so neither is shadowed by the static/SPA fallback below.
app.use(express.static(distPath))
app.use((_request, response) => {
  // Express 5 rejects bare app.get('*', …); use a final middleware for the SPA fallback.
  response.sendFile(path.join(distPath, 'index.html'))
})

const PORT = process.env.PORT || DEFAULT_SERVER_PORT
httpServer.listen(PORT, () => {
  console.log(`Mystery XO server listening on port ${PORT}`)
})
