import type { Storage, StorageValue } from 'unstorage'
import type {
  Contact,
  Room,
  RoomMember,
} from 'wechaty-puppet/payloads'
import type { AgentWcferry } from '../context/AgentWcferry'

export interface PuppetRoom extends Room {
  announce: string
  members: RoomMember[]
}

export interface PuppetContact extends Contact {

}

export interface PuppetWcferryUserOptions {
  agent?: AgentWcferry
  storage?: Storage
}

export interface PuppetWcferryOptions extends Required<PuppetWcferryUserOptions> { }

export interface PrefixStorage<T extends StorageValue> extends Storage<T> {
  getItemsMap: (base?: string) => Promise<{
    key: string
    value: T
  }[]>
  getItemsList: (base?: string) => Promise<T[]>
}