export interface Player {
  id: string;
  name: string;
}

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'gameover';

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

export interface GameState {
  ball: Ball;
  paddles: { [playerId: string]: Paddle };
  scores: { [playerId: string]: number };
  status: GameStatus;
  winner: string | null;
}

export enum MessageType {
  PlayerJoined = 'PLAYER_JOINED',
  PlayerLeft = 'PLAYER_LEFT',
  Input = 'INPUT',
  GameStateUpdate = 'GAME_STATE_UPDATE',
  StartGame = 'START_GAME',
  RoomFull = 'ROOM_FULL',
  JoinSuccess = 'JOIN_SUCCESS',
  Error = 'ERROR',
}

export type InputPayload = {
  direction: 'up' | 'down' | 'left' | 'right';
  action: 'press' | 'release';
};

export type MessagePayload = GameState | Player[] | { playerId: string } | InputPayload | { error: string } | { playerId: string, players: Player[] } | null;

export interface Message {
  type: MessageType;
  payload: MessagePayload;
}