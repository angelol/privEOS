const Joi = require('@hapi/joi')
const assert = require('assert')
const Bourne = require('@hapi/bourne')

module.exports = {}

module.exports.validate_any = function(data, schemas) {
  const valid = schemas.some(schema => Joi.validate(data, schema).error === null)
  if(valid) {
    return {}
  } else {
    return {error: true}
  }
}

const valid_json_payload_from_ipfs_old = Joi.object().keys({
  data: Joi.array().items(Joi.object().keys({
    node: Joi.string(),
    message: Joi.string(),
    nonce: Joi.string(),
    checksum: Joi.number().integer(),
    public_key: Joi.string(),
  })),
  threshold: Joi.number().integer(),
  public_key: Joi.string(),
})

const valid_json_payload_from_ipfs_new = Joi.object().keys({
  data: Joi.array().items(Joi.object().keys({
    node: Joi.string(),
    share: Joi.string(),
    node_key: Joi.string(),
  })),
  threshold: Joi.number().integer(),
  user_key: Joi.string(),
})

module.exports.valid_json_payloads_from_ipfs = [valid_json_payload_from_ipfs_old, valid_json_payload_from_ipfs_new]

function test() {
  const example_old=Bourne.parse('{"data":[{"node":"alohaeostest","message":"d1971af33f54e73f161b16bcea2eaf05b249c8aba305e3dc53340ea49556475a0cf20e5a4910d1db3e80e619dac507aa2f3dccc3c82e0c242c2eea2d4d69534eea976435c7970c3a600551e79b6201e16dda415fa4a4e33e5cf9adfca154c8abac538e239a6dc85b41e3a398ee4acbfb70fc7dd066cea4d25504a94fd933f46622dcff9cd6ae70d29fd6901cbd5b05b5","nonce":"101399779832065462","checksum":791678520,"public_key":"EOS89XVKzBnJTLtXi2KEmmQ9CQgA79SHhvHiG9qZnxvdU4gLsModY"},{"node":"caleosblocks","message":"158599a20307e7e3d27129ace7ea16e68846bd1117e4da944bd4a98b0f44cbfcbe00754cd12399d759f4aef5acc6cbf3f30898624239a5549b70fec8a3bfb0c43b1fc718c6d882556790588b1d4676e1e5686ae3d1323512bb3f89b9dde2046365b0140866269ec04ef3001035a798cbd5032b9ad459abd6ec8f77e3d689d26190d2d1c9ec054254255a6fb86db03413","nonce":"101399779835669943","checksum":4150809317,"public_key":"EOS5vr4bde9SpAw7QvHaTWmqypcooQjyBCxc8TCmgnbDzMjjzSkvy"},{"node":"eosbarcelona","message":"28207c29d36fd00f393073999cb94a594116c25c66a77aefdea9940019b4b40a40d3c61c0edf95db4228f3098a10e72786d0dd5e1a8809bcb4dbf35a755d2b0fa6ea31dc36cfa825bc759f4401fd5e55709a23504f69790c19a732d72ee27f57507ce5c89530cc398544e40897b89eef4241809eef157d9fb65421e59ce8d2dd0125422802292f9a970b319b8d8b0053","nonce":"101399779837242808","checksum":1195387406,"public_key":"EOS85SiUHgxZKoe3oV9KVSwYAXUrkQ45MDCraNUfHQoCBQ1GAosPz"},{"node":"eosnairobike","message":"e9c24cd8bcf79b84637ae307dc587d69501edc9c6bb635781e80654e7ff9f30c0721e2ee5c447950dc18863f14831efc2c3af067250c1a5a94906169cceb3ddaad3a63be79e160cd14bf4dd533c9a9706750f4f850ed598871c5c7332da530e4befdd240a1ba319641d1f9b3a3e345748aa8d9a6dc23887e28a78911f22859997a658eef20d81ea8bdf8ff27e0f4dc92","nonce":"101399779838487993","checksum":2824759860,"public_key":"EOS8V4obNcrHHk4Ffk9XP8JcYXoDBK3zPkV2KJPrHCXsQtj7Jrdna"},{"node":"eospherepriv","message":"b55ff3caaaa698e39027c7b29947507df3b17cd11c53ef0d598b9c52525128c4315a19597975942b43bf18d2ac66e73a7b931745ee6eca8e6d4e48e053ff4ae6918831e5a8c683d247040e6c007d2d850becb5bc2a5d191c496aa9ad280a3cf50b3ca337b7572bf5cd70bc6c479ea5b6b4f80640fc1f71be4007c8ac91fe2c38d03b94fbc6e0c08f9b55ee1f1151e1d7","nonce":"101399779839864250","checksum":1866249210,"public_key":"EOS7nD38epVndBW2yMWdQaUfQhXi8RVQQ6JexQLpYyNyELXYLGpWA"},{"node":"infinitybloc","message":"6d25424703a5fdf304e6b8a714a38bec877d25030b3dc669957ec7daeedd57e2e9f37e46c6e1976daf1868074f21dbcff103ec67b709408aa301ada3a88210cffc7faa5eee674b17d0dfc5d70a10d6dfacbdf52a3e557f14bb544d0a721ea2bc2b6d69445aad05098b763519f78dea52a84eb18d86e38c6c03369ccf636337223e77df481c57903cb091899543c6340e","nonce":"101399779841174971","checksum":4276745976,"public_key":"EOS5jHChdAiG3vZCgMJxxhC2kCJKb1AJ7LYQDGAW46hENQSdG6vKW"},{"node":"junglemorpho","message":"6002679ec9114b8eed6329d5dc68c6bd869ef2148ed64e8d7907d05b7c7f10602f6b5f46d2029020a27ed8862a0c9521d214fe5cd75488fef8c00166cbe0402df9065178d20aaf44acc01ef8526869df5aa5940bce9e4dbcf51872586d51347aab7c21fd954a3dacce8e78a1aeeb7df1cba5cdce76559058251bedff1bf01eab7ba78277ac58455f03b280da02e5e317","nonce":"101399779842223548","checksum":1042304155,"public_key":"EOS85hnRn34McU582CRirTjdC89481t312WegRUnAsubqoMWYXnMb"},{"node":"mosquitometa","message":"d65a65b8c6e022620889e4fb33418839a3140f45b4b4997c343aea34a52d9bd6a1068438007d3c3a2dee0189bacacc98f8e38fd210b4abaea60497cd0df7b354b8e95d8a06865080c55c15df255b491b28c94f3d898a6aca886e340139d08673fac4968873340a5ed66e34b9d6cfe517a9d150e9d44496f1d6159d9f70ddc505c3627e8c73112062230dae0e3c09b331","nonce":"101399779843665341","checksum":1725575338,"public_key":"EOS6ZMHFuUbFfCRpAg1ezvLxP2x4ATqw6piMsuhVxwL4r4RNvqLPi"},{"node":"rosauthority","message":"78809210d500b125e62d68d3ee81e7528fbb76e3c629b432c56de6fa08e06d7fb07d07235fee535225b7c0d4134821dd275eececced352b61fcdf2972e464ae4456abeac6d49a95af2373ac4be22bd160988c22d6808990ea738b5f8b7876934528a9dda0bf1531bd881e4d6db75061c6b5baf12b053e8da69ffddb2ef7dc39ef5bf492bca2f0a2945ae72c25f1ffa82","nonce":"101399779844713918","checksum":1212378474,"public_key":"EOS8HSNhXTnDs8LjZtqvbVnJoLeW3wEmffk4XbBMQ7N7aPd4YoWSM"},{"node":"slantagnode1","message":"6777370a58390622ef8521906a28218840cd46d7d44224ded79eb7a32bd23a97381a7f14ca004c87f9a691ce02974bb4403aa41a7fbdfaa1c001ccff4bbd53748b10c0a9c313939f852706f38a783ad124be6d7ea40b957982e707cafae2ce43f775de8dce7be228b2bf0fc3169243201bd4d32efe14716f3c5f50fb419bba7dc591874e994d3bcbaf0be4391e628e41","nonce":"101399779845893567","checksum":113584366,"public_key":"EOS5aQ2K8Qwgy4XwqQaZV7WuJuNHnmGrXe5RX4ukMtF1FBSJwfAUv"},{"node":"slantagnode2","message":"f14b17107d55d65d1227d9ed134438c9e595ad373bdef5efed14a690281ad3e57f9b505d3fe440cf9a52fa72915979620776e346c1bd6cf1e40fe4b0c0589ea2d1d5a8dd478c137385251761f97e42b10de4985cc405beba5820fbb86338988ca17be4ca798f9faadf8695394d66e822c56eff1e0a723a67a42c4b8db11861a16359e2f0dd41645c3909814dbca5c2e2","nonce":"101399779847007680","checksum":88238186,"public_key":"EOS73XjRWLreqgTiAQ8CNfTeSCEPqvaX2H6bhpdaFXrgibHZtBa56"}],"threshold":6,"public_key":"EOS8hqSdB1PuSxtA2CphFbD8SymAMix9sRVcREb8PpgqrUjw5C6Zg"}')
  
  const example_new=Bourne.parse('{"data":[{"node":"testnodexxx1","share":"EAccxFEDXbVD+zYea+C9QyXWSEA9smfOYjazgaO75mEJdlTvUmrmh5+07lbtebk5EoLmg2FgD8ZqFELQR1O9OIYhlmleQFMQ6u8eKCNKqhZtmdoVztZLeQ5+y9FZtOcoTGVgzp4QTziBgOU8fC+elwdyLhXb1mZkKJ9GSW5hXXCVB5mxsdSqqmd9n6+/ooP5+6M1ylM/+P8nsYmAmgjxA3sG047z8X2HKZ2JjdiDB8+bHQrXq909pV1NvsfZZY+rpr7j7YPGE1xU0dh5vQAPXnJ37GJc2mPxNariQucqal694LndKqujFCk3HNscw9tTdCLGzY2scoN19dTBAITaipoRRAB4BQM=","node_key":"EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"},{"node":"testnodexxx2","share":"q+iqvfRp2Nr1NCamory+Asa0/0AA3E1A47Rkgi0p5rsoe5Q16M4vzRdqt4DEAqv7XdSWOlQTSezqyE1MV6H2smv00UI2q/VdGQ7f3Q2i7kfhCClYXaewA6eEKSHLFHL2uCK5viypUBsJtZtLe20BMtd/ghnAponAFAUX+ZHp3fPveabo9bo0A+S2LqvDLl4CXIuNduuk4zrSxL7+M1xKhrcBm2WELbwF6pfJwDK8XcndO9yEKvWOP3/85r8bhSSum+ki9U+v75tjfgHctxY0N3kQMI/pMh0shq5HC1Zt2AbJF1Un8IoqZ4PobOeWVhvJ/l+37UiAjrtagnFwl0/dXBmCZ9ZiUXA=","node_key":"EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"},{"node":"testnodexxx3","share":"J+PTo0ADjXs+vve7cvylH/g/8tiRAB6aZH60nhiwVdW+8ajPJdZfcY4h52yOwkynMGMr7m8wRWFdk69Xts/Dc8b3pvqMNX9fiYf2mBf6ib2EF2s4plfm94MEO9Ob+Wie3AgA1dy7aACKxbgSQdfkWZFlNm43ciiZf0aR5UrNgwYIZdks69bmtW1Bbw7O3YLjmCXwIxVJwkueoATTKFdJh5C87Di60F3pBd00G8X51Siur+8YDQz58Zkbg/Jt8vVlKNSw7KKOp8uZzXW2LuKDeKRK7hiQdKkz3qKRSJKnNWewJaPkf/VaGhDjcETv/PeCpEaEc+p1N7fj80g5sYIyg7jo2vycl6k=","node_key":"EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"},{"node":"testnodexxx4","share":"v7v/kqZIoM9zPPdwhMPpen7LOZ6u1ttfvIego2TGYUYMaN52XOPU2ehLHlECfteLGDUj0AcVTpPUu9fBj7KwX1Je8qt1FV+ktpjhwkzyv8du3gfotLx8wFjQ9dwFATqk11Znv1UehaZkKTylyIwtBIgabAGZ2GX+xoltHoJ4rgGmcto2nZlvisdLfGTPbcxgHCKdU5xdCwcxNVkwMYvbLgTRu7PG0Eb5ODlKQrx6hbRq6qI1UVkMj6rj2vnpmNLR9Upy6poDDi1z2xtc4V+3WEpbXcsI/bD3cLOSY8KDemMMhaeXVcLmGXTFTrS2u7Q7ApcHM0C8J+mVmdp0xWhmGUcod99UeV4=","node_key":"EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"},{"node":"testnodexxx5","share":"XoZ84JpLOK77kFGcu0sD/TDYNK9fTjuDswBWIqpWBv4YdB2sxAUaYHpquhf3YQsHUter45nGSp6EbXJ0wqiaNIzlSRqnWSvGRNEuXHaOsJqP/TLeTtuo0ScDtqCgCBO+Ur3WNBfvjww3cUAW0bMHyBUxyQ32Ejag31qJJtUrdVct+jG9Nkv6aBTZGyFne9f/YnuHV1miT6ncQsOCFz4HEmm1JhrlydeXmibrFSOdbJkDLnTPkKfpDeoo/AxXG25BUn2nWxRuwjtFLgcHYd2rLYt3TAzuy2Y60w8lnJ7+7Un1uIZtDeHomfE6FfX+QjT0cT2nw2PeHvwFHQ28Ca8ZaG5CcGspQlg=","node_key":"EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV"}],"threshold":3,"user_key":"EOS6Zy532Rgkuo1SKjYbPxLKYs8o2sEzLApNu8Ph66ysjstARrnHm"}')
  
  const res1 = module.exports.validate_any(example_old, module.exports.valid_json_payloads_from_ipfs)
  assert.ok(!res1.error, "Old example failed")

  const res2 = module.exports.validate_any(example_new, module.exports.valid_json_payloads_from_ipfs)
  assert.ok(!res2.error, "New example failed")
}

// test()
