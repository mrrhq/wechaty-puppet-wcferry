import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { Buffer } from 'node:buffer'
import protobuf from 'protobufjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const protobufDir = join(__dirname, __filename.endsWith('decode.ts') ? '../../' : '../', 'protobuf')

let BytesExtraRoot: protobuf.Root
let RoomDataRoot: protobuf.Root

export function decodeRoomData(input: Buffer) {
  if (!RoomDataRoot) {
    RoomDataRoot = protobuf.loadSync(
      join(protobufDir, 'RoomData.proto'),
    )
  }
  const RoomData = RoomDataRoot.lookupType('RoomData')
  return RoomData.decode(input).toJSON()
}

export function decodeBytesExtra(input: Buffer) {
  if (!BytesExtraRoot) {
    BytesExtraRoot = protobuf.loadSync(
      join(protobufDir, 'BytesExtra.proto'),
    )
  }
  const BytesExtra = BytesExtraRoot.lookupType('BytesExtra')
  return BytesExtra.decode(input).toJSON()
}

export function getWxidFromBytesExtra(bytesExtra: any): null | string {
  const wxidMessage = bytesExtra.message2.find(
    (item: any) => item.field1 === 1,
  )
  const wxid = wxidMessage?.field2
  if (!wxid)
    return null
  return wxid.split(':')[0]
}
