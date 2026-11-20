export interface User {
  id: number;
  username: string;
}

export type UserResponse = User;

export interface LoginRequest {
  username: string;
  password: string;
}

export type UserLoginRequest = LoginRequest;

export interface RegisterRequest {
  username: string;
  password: string;
}

export type UserRegisterRequest = RegisterRequest;

export interface AuthToken {
  access_token: string;
  token_type: string;
}
