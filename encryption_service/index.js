const http = require('http')
const config = require('./config')
const eosjs_ecc = require('eosjs-ecc')
const ByteBuffer = require('bytebuffer')

http.createServer((request, response) => {
  const { headers, method, url } = request
  let chunks = []
  request.on('error', (err) => {
    console.error(err)
    response.statusCode = 400
    response.end()
  }).on('data', (chunk) => {
    chunks.push(chunk)
  }).on('end', () => {
    const body = Buffer.concat(chunks).toString()
    console.log("url: ", url)
    console.log("Body: ", body)
    
    const payload = JSON.parse(body)
    
    if(url == '/reencrypt/') {
      reencrypt(payload, response)
    } 
    else {
      response.statusCode = 404;
      response.write("Not found")
    }
    response.end()
  })
}).listen(config.listenPort, "127.0.0.1")


function reencrypt(payload, response) {
  const plaintext = eosjs_ecc.Aes.decrypt(config.privateKey, payload.public_key, payload.nonce, ByteBuffer.fromHex(payload.message).toBinary(), payload.checksum)
  console.log(`Decrypt result" "${String(plaintext)}"`)
  console.log(`privateKey: "${config.privateKey}"`)
  
  const share = eosjs_ecc.Aes.encrypt(config.privateKey, payload.recipient_public_key, String(plaintext))	


  const json = JSON.stringify({
    message: share.message.toString('hex'),
    nonce: String(share.nonce),
    checksum: share.checksum,
  })
  console.log(`Encrypt result: "${json}"`)
  response.setHeader('Content-Type', 'application/json')
  response.write(json)
  
}
