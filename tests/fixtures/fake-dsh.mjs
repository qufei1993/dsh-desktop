import http from 'node:http'

const server = http.createServer((_request, response) => response.end('ok'))
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (typeof address === 'object' && address) console.log(`dsh web: http://127.0.0.1:${address.port}`)
})
process.on('SIGTERM', () => server.close(() => process.exit(0)))
