export enum PlayerAction {
  PLAY = 'play',
  PAUSE = 'pause',
  STOP = 'stop',
  SEEK = 'seek',
  NULL = ""

}
export type PartySession = {
  id: string
  name: string
  videos: string[]
  currentVideoId: string
  action: PlayerAction
  time: number
  userId: string
}