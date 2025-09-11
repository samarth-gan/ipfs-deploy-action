import { PinataSDK } from 'pinata'
import * as core from '@actions/core'

async function removeFolderFromPinata() {
  try {
    const cid = process.env.CID
    const pinataGateway = process.env.PINATA_GATEWAY
    const pinataJwt = process.env.PINATA_JWT

    console.log(`🗑️  Removing CID ${cid} from Pinata...`)
    
    const pinata = new PinataSDK({
      pinataGateway: pinataGateway,
      pinataJwt: pinataJwt,
    });
    
    const {files} = await pinata.files.public.list()
    const targetFolder = files.find(file => file.cid === cid);
    if(!targetFolder) {
      console.log('🔑 No target folder found in Pinata, skipping removal...');
      return;
    }
    console.log('🔑 Target folder found in Pinata, removing...');
    await pinata.files.public.delete([targetFolder.id]);
    console.log('✅ Successfully removed folder from Pinata!')
    
  } catch (error) {
    console.error('❌ Error removing from Pinata:', error.message)
    core.setFailed(error.message)
    throw error
  }
}

removeFolderFromPinata()
