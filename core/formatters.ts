import { Dayjs } from 'dayjs'
import dayjs from './dayjs_config'

type Time = string | number | Dayjs | Date

export function fromNow(time: Time) {
  return dayjs(time).fromNow()
}

export function relativeDate(time: Time) {
  const d = dayjs(time)
  const days = dayjs().diff(d, 'day')
  if (days === 0)
    return 'Today' // TODO: i18n
  if (days === 1)
    return 'Yesterday'

  // refer to https://github.com/iamkun/dayjs/blob/dev/docs/en/Plugin.md#localizedformat
  return d.format('ll')
}
