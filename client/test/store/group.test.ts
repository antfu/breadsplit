import { mutations, getters, Eval, actions } from '~/store/group'
import { RootStateDefault, GroupStateDefault } from '~/utils/defaults'
import { GroupState } from '~/types/store'
import { Group } from 'types/models'

describe('group state getters', () => {
  it('current', () => {
    const state = GroupStateDefault()
    const rootState = RootStateDefault({
      group: state,
    })
    expect(getters.current(state, null, rootState, null)).toBeUndefined()
  })
})

describe('group state mutations', () => {
  let state: GroupState
  let groupsAmount = 0

  beforeEach(() => {
    state = GroupStateDefault()
    mutations.add(state, {
      name: 'group1',
      id: 'group1',
    })
    groupsAmount = 1
  })

  it('setup test', () => {
    expect(Object.keys(state.groups).length).toEqual(groupsAmount)
    expect(state.groups).toHaveProperty('group1')
    expect(state.groups.group1.id).toEqual('group1')
  })

  it('add edit remove', () => {
    // Add
    mutations.add(state, {
      name: 'test',
      id: 'test',
    })
    expect(Object.keys(state.groups).length).toEqual(groupsAmount + 1)
    expect(state.groups).toHaveProperty('test')
    expect(state.groups.test.id).toEqual('test')
    expect(state.groups.test.base.id).toEqual('test')
    expect(state.groups.test.base.icon).toBeFalsy()

    // Remove
    mutations.remove(state, 'test')
    expect(Object.keys(state.groups).length).toEqual(groupsAmount)
    expect(state.groups).not.toHaveProperty('test')
  })

  it('members', () => {
    const client = state.groups.group1
    const group = Eval(client) as Group
    expect(group).toBeTruthy()
    expect(client.operations).toHaveLength(0)
    expect(Object.keys(group.members)).toHaveLength(0)
  })
})
