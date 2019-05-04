import Vue from 'vue'
import merge from 'lodash/merge'
import includes from 'lodash/includes'
import orderBy from 'lodash/orderBy'
import { MutationTree, ActionTree, GetterTree } from 'vuex'
import { MemberDefault, GroupStateDefault, ClientGroupDefault, TransactionDefault } from '~/utils/defaults'
import { GroupState, RootState } from '~/types/store'
import { ClientGroup, Group } from '~/types/models'
import { EvalTransforms, ProcessOperation, BasicCache } from 'opschain'
import { Transforms } from '../../core'
import { ServerGroup } from '../../types/models'

const OperationCache = new BasicCache<Group>()

export function Eval(group?: ClientGroup): Group | undefined {
  if (!group)
    return undefined
  const { base, operations } = group
  if (!base)
    return undefined
  return EvalTransforms<Group>(Transforms, { cacheObject: OperationCache })(base, operations)
}

function NewOperation(group: ClientGroup, name: string, data) {
  group.operations.push(ProcessOperation({ name, data }))
}

function origin() {
  return window.location.origin
}

export const state = GroupStateDefault

export const getters: GetterTree<GroupState, RootState> = {

  current(state) {
    if (!state.currentId)
      return undefined
    return Eval(state.groups[state.currentId])
  },

  currentShareLink(state, getters) {
    const current = getters.current
    if (!current || !current.online)
      return undefined
    return `${origin()}/#/join?id=${current.id}`
  },

  all(state) {
    return orderBy(Object.values(state.groups), ['lastchanged'], ['desc'])
      .map(g => Eval(g))
  },

  id: state => (id) => {
    return Eval(state.groups[id])
  },

  memberById: state => ({ groupId, memberId }) => {
    groupId = groupId || state.currentId
    const group = Eval(state.groups[groupId])
    if (!group)
      return null
    return group.members[memberId]
  },

  activeMembersOf: state => (id?: string) => {
    id = id || state.currentId || ''
    const group = Eval(state.groups[id])
    if (!group)
      return []
    return Object.values(group.members).filter(m => !m.removed)
  },

  activeMembers(state, getters) {
    return getters.activeMembersOf()
  },
}

export const actions: ActionTree<GroupState, RootState> = {

}

export const mutations: MutationTree<GroupState> = {

  switch(state, id: string | null) {
    state.currentId = id
  },

  // Groups
  add(state, payload) {
    const group = ClientGroupDefault(payload)
    Vue.set(state.groups, group.base.id, group)
    state.currentId = group.base.id
  },

  remove(state, id) {
    id = id || state.currentId
    state.currentId = null
    Vue.delete(state.groups, id)
  },

  edit(state, { id, changes }) {
    id = id || state.currentId
    merge(state.groups[id], changes)
  },

  removeOnlineGroups(state) {
    for (const id of Object.keys(state.groups)) {
      if (state.groups[id].online)
        Vue.delete(state.groups, id)
    }
  },

  // Members
  addMember(state, { id, member }) {
    id = id || state.currentId
    member = MemberDefault(member)
    NewOperation(state.groups[id], 'insert_member', member)
  },

  removeMember(state, { id, memberid }) {
    id = id || state.currentId
    NewOperation(state.groups[id], 'remove_member', memberid)
  },

  editMember(state, { id, memberid, changes }) {
    id = id || state.currentId
    NewOperation(state.groups[id], 'modify_member', { id: memberid, changes })
  },

  // Transcations
  newTranscation(state, { id, trans }) {
    id = id || state.currentId
    if (state.groups[id]) {
      trans = TransactionDefault(trans)
      NewOperation(state.groups[id], 'insert_transaction', trans)
      state.groups[id].lastchanged = +new Date()
    }
  },

  editTranscation(state, { id, transid, changes }) {
    id = id || state.currentId
    NewOperation(state.groups[id], 'modify_transaction', { id: transid, changes })
  },

  changeMemberId(state, { id, from, to }) {
    id = id || state.currentId
    NewOperation(state.groups[id], 'change_member_id', { from, to })
  },

  // Firebase
  onServerUpdate(state, { data, timestamp }) {
    if (!data || !data.id)
      return
    const group: ServerGroup = data
    if (!state.groups[group.id]) {
      Vue.set(state.groups, group.id, {
        id: group.id,
        online: true,
        operations: [],
        lastchanged: timestamp,
      })
    }

    const serverOperations = group.operations
    const localOperations = state.groups[group.id].operations || []
    const unsyncedOperations = localOperations.filter(
      o => !includes(serverOperations, o.hash)
    )

    state.groups[group.id].base = group.present
    state.groups[group.id].operations = unsyncedOperations
    state.groups[group.id].lastsync = timestamp
  },
}
