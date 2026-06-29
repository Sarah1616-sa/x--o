import http from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import { DEFAULT_CLIENT_ORIGINS, DEFAULT_SERVER_PORT } from './constants/roomConstants.js'
import { registerSocketHandlers } from './socket.js'

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

httpServer.listen(DEFAULT_SERVER_PORT, () => {
  console.log(`Mystery XO server listening on port ${DEFAULT_SERVER_PORT}`)
})
