import type { Storage, StorageValue } from 'unstorage'
import type {
  Contact,
  Room,
  RoomMember,
} from 'wechaty-puppet/payloads'
import type { FerryAgent } from '../context'

export interface PuppetRoom extends Room {
  announce: string
  members: RoomMember[]
}

export interface PuppetContact extends Contact {

}

export interface PuppetFerryUserOptions {
  agent?: FerryAgent
  storage?: Storage
}

export interface PuppetFerryOptions extends Required<PuppetFerryUserOptions> { }

export interface PrefixStorage<T extends StorageValue> extends Storage<T> {
  getItemsMap: (base?: string) => Promise<{
    key: string
    value: T
  }[]>
  getItemsList: (base?: string) => Promise<T[]>
}
