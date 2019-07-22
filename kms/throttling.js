const util = require('util')
const lookup = util.promisify(require('dns').lookup)
const restify = require('restify')
const { all_nodes } = require('../broker/helpers')
const chains =  require('../common/chains')

const throttle_fun = restify.plugins.throttle({
	rate: 0.1, // 1 request every 10 seconds
	burst: 2,
  xff: true, // use x-forwarded-for header set by nginx
})

let global_whitelist = new Set()

async function update_whitelist() {
	const whitelist = new Set()
	for(const chain of chains.adapters) {
    try {
  		const nodes = await all_nodes(chain)
  		for(const node of nodes) {
        try {
    			const url = new URL(node.url)
    			const ips = await lookup(url.hostname, { verbatim: true, all: true })
          for (const ip of ips) {
      			whitelist.add(ip.address)      
          }
        } catch(e) {
          log.warn(e)
        }
  		}
    } catch(e) {
      log.warn(e)
    }
	}
	global_whitelist = whitelist
}


function whitelisted_throttle_fun(req, res, next) {
  /* You need to configure your load balancer to include the xff header */
  const xff = req.header('x-forwarded-for')
	if(global_whitelist.has(xff)) {
		next()
	} else {
		return throttle_fun(req, res, next)
	}
}

update_whitelist()
setInterval(update_whitelist, 60*1000)

module.exports = { whitelisted_throttle_fun }
