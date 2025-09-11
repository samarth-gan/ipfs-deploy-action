import { PinataSDK } from 'pinata'
import fs from 'fs'
import * as core from '@actions/core'

async function readDirectoryRecursively(dirPath) {
  const files = []
  const path = await import('path')
  
  function readDirRecursive(currentPath, relativePath = '') {
    const items = fs.readdirSync(currentPath, { withFileTypes: true })
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item.name)
      const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name
      
      if (item.isDirectory()) {
        readDirRecursive(fullPath, itemRelativePath)
      } else if (item.isFile()) {
        const fileContent = fs.readFileSync(fullPath)
        const file = new File([fileContent], itemRelativePath, {
          type: getMimeType(item.name)
        })
        files.push(file)
      }
    }
  }
  
  readDirRecursive(dirPath)
  return files
}

function getMimeType(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'txt': 'text/plain',
    'md': 'text/markdown'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

async function uploadFolderToPinata() {
  try {
    const folderPath = process.env.FOLDER_PATH
    const folderName = process.env.FOLDER_NAME //context.betn.io
    const pinataGateway = process.env.PINATA_GATEWAY
    const pinataJwt = process.env.PINATA_JWT

    console.log(`📁 Uploading folder ${folderPath} to Pinata...`)
    
    const pinata = new PinataSDK({
      pinataGateway: pinataGateway,
      pinataJwt: pinataJwt,
    });
    
    await pinata.testAuthentication()
    console.log('✅ Pinata authentication successful')
    
    const options = {
      metadata: {
        name: folderName, 
      }
    }

    const files = await readDirectoryRecursively(folderPath)
    console.log(`Found ${files.length} files to upload`)
    
    const result = await pinata.upload.public.fileArray(files, options).name(folderName);
    console.log(`✅ Folder uploaded to Pinata successfully!`)
    console.log(`- CID: ${result.cid}`)
    console.log(`- Size: ${result.size} bytes`)
    console.log(`- Name: ${result.name}`)
    
    // Set output for next steps
    core.setOutput('cid', result.cid)
    
    return result.cid
  } catch (error) {
    console.error('❌ Error uploading to Pinata:', error.message)
    core.setFailed(error.message)
    throw error
  }
}

uploadFolderToPinata()
