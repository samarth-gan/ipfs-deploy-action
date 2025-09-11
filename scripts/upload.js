import { createHeliaHTTP } from '@helia/http'
import { ipns as ipnsConstructor } from '@helia/ipns'
import { CID } from 'multiformats/cid'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { base36 } from 'multiformats/bases/base36';
import { privateKeyFromProtobuf } from '@libp2p/crypto/keys'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createIPNSRecord, marshalIPNSRecord, multihashToIPNSRoutingKey } from 'ipns'
import * as core from '@actions/core'

const DEFAULT_TTL_MS = 60 * 1000 // 1 min
const DEFAULT_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000 // 1 year

function getIPNSNameFromKeypair(privateKey) {
  if (!privateKey) return ''
  return peerIdFromPrivateKey(privateKey).toCID().toString(base36)
}

async function publishIPNSRecord() {
  let helia
  try {
    const cidString = process.env.CID
    const privateKeyBase64 = process.env.IPNS_PRIVATE_KEY

    console.log(`🌐 Publishing IPNS record...`)
    
    helia = await createHeliaHTTP()
    const ipns = ipnsConstructor(helia)
    
    const keypair = privateKeyFromProtobuf(uint8ArrayFromString(privateKeyBase64, 'base64'))
    if (keypair.type !== 'Ed25519') {
      throw new Error('Only libp2p Ed25519 keys are supported')
    }
    
    const cid = CID.parse(cidString)
    
    const ipnsName = getIPNSNameFromKeypair(keypair)
    
    // Use timestamp-based sequence number to ensure it's always incrementing
    const sequenceNumber = BigInt(Date.now())
    
    const ttlMs = DEFAULT_TTL_MS
    const lifetime = DEFAULT_LIFETIME_MS
    
    console.log(`Publishing IPNS record for: ${ipnsName}, cid: ${cidString}, sequence: ${sequenceNumber}`)
    
    const record = await createIPNSRecord(keypair, cid, sequenceNumber, lifetime, {
      ttlNs: BigInt(ttlMs) * 1_000_000n // ns
    })
    
    const marshaledRecord = marshalIPNSRecord(record)
    const routingKey = multihashToIPNSRoutingKey(keypair.publicKey.toMultihash())
    
    await ipns.localStore.put(routingKey, marshaledRecord, {})
    await helia.routing.put(routingKey, marshaledRecord)
    
    const ipfsUrl = `https://ipfs.io/ipns/${ipnsName}`
    
    console.log('✅ IPNS Record published successfully to DHT!')
    console.log('- IPNS Name:', ipnsName)
    console.log('- IPFS URL:', ipfsUrl)
    console.log('- The record should be resolvable for the next 48 hours (DHT expiration interval)')
    console.log('- Value:', record.value)
    console.log('- Validity:', record.validity)
    console.log('- Sequence:', record.sequence.toString())

    // Set outputs
    core.setOutput('ipns_name', ipnsName)
    core.setOutput('ipfs_url', ipfsUrl)
    
    return {
      record,
      ipnsName,
      keypair
    }
  } catch (error) {
    console.error('❌ Error publishing IPNS record:', error.message)
    core.setFailed(error.message)
    throw error
  } finally {
    // Always stop Helia to allow process to exit
    if (helia) {
      try {
        await helia.stop()
        console.log('🔌 Helia instance stopped')
      } catch (stopError) {
        console.warn('Warning: Error stopping Helia:', stopError.message)
      }
    }
  }
}

publishIPNSRecord()
