import * as core from '@actions/core'

async function createPinnedObjectQN(cid, folderName, quickNodeApiKey) {
  const response = await fetch("https://api.quicknode.com/ipfs/rest/v1/pinning", {
    method: 'POST',
    headers: {
      'x-api-key': `${quickNodeApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cid: cid,
      name: folderName,
    })
  })
  const responseData = await response.json();
  console.log('✅ Successfully pinned to QuickNode!')
  console.log('- RequestId:', responseData.requestId)
  
  return responseData
}

async function updatePinnedObjectQN(cid, folderName, quickNodeLatestRequestId, quickNodeApiKey) {
  const response = await fetch(`https://api.quicknode.com/ipfs/rest/v1/pinning/${quickNodeLatestRequestId}`, {
    method: 'PATCH',
    headers: {
      'x-api-key': `${quickNodeApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      cid: cid,
      name: folderName,
    })
  })
  const responseData = await response.json();
  console.log('✅ Successfully updated pinned object in QuickNode!')
  console.log('- RequestId:', responseData.requestId)
  
  return responseData
}

async function pinToQuickNode() {
  try {
    const cid = process.env.CID
    const folderName = process.env.FOLDER_NAME
    const quickNodeApiKey = process.env.QUICKNODE_API_KEY

    console.log(`📌 Pinning CID ${cid} to QuickNode...`)

    console.log('Getting latest pinned object from QuickNode (by folder name)');
    const res = await fetch(`https://api.quicknode.com/ipfs/rest/v1/pinning`, {
      method: 'GET',
      headers: {
        'x-api-key': `${quickNodeApiKey}`,
        'Content-Type': 'application/json'
      }
    })
    const resData = await res.json();
    const latestPinnedObject = resData.data.find(item => item.name === folderName);
    const latestRequestId = latestPinnedObject?.requestId;

    if(!latestRequestId) {
      console.log('🔑 No latest request id provided, creating new pinned object in QuickNode...');
      const response = await createPinnedObjectQN(cid, folderName, quickNodeApiKey);
      core.setOutput('request_id', response.requestId)
      return response;
    }
    console.log('🔑 Latest request id provided, updating pinned object in QuickNode...');
    const response = await updatePinnedObjectQN(cid, folderName, latestRequestId, quickNodeApiKey);
    core.setOutput('request_id', response.requestId)
    return response;
  } catch (error) {
    console.error('❌ Error pinning to QuickNode:', error.message)
    console.log('⚠️  Continuing deployment process despite QuickNode error...')
    // Don't fail the action for QuickNode errors
  }
}

pinToQuickNode()
